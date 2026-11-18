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


def with_files(registry):
    """[[path, text]] : the registry, plus a minimal mission file for each of its lines (id, folder, files) — SOG-0365: a mission whose file
    is not on the device is not offered, so a case that lists registry lines gives them their files."""
    out = [['missions/mission_registry.yaml', registry]]
    for m in re.finditer(r"id: '?([A-Z]-\d{3}[A-Z]?)'?,.*?folder: ([^,}\s]+), files: \[([^\]]+)\]", registry):
        out.append([f'missions/{m.group(2)}/{m.group(3).strip()}', mission_doc(m.group(1))])
    return out


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
    # SOG-0365 : X-006A (son fichier n'est pas sur l'appareil) n'est plus proposé ; X-007A et X-008A (fichiers là, illisibles) le sont
    c.until(f"document.querySelectorAll('{M} [data-list] [data-id]').length === 2", what='the two rows of TESTCHARLIE whose file is on the device')
    c.eq(c.count(f'{M} [data-list] [data-id="X-006A"]'), 0, 'a mission whose file is not on the device is not offered (SOG-0365)', what='X-006A')

    def opened(mid):
        c.tap(f'{M} [data-list] [data-id="{mid}"]')
        c.until(f"!!document.querySelector('{M} [data-pane=mission][data-id=\"{mid}\"] [data-why]')", timeout=12000, what=f'{mid} opens and says why')
        got = (c.js(f"document.querySelector('{M} [data-why]').dataset.why"), norm(c.text(f'{M} [data-why]') or ''))
        c.tap(f'{M} [data-do="back"]')
        c.until(f"!!document.querySelector('{M} [data-pane=list]')", what='back to the list')
        return got

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
        c.js(_TEXTS_JS, with_files(_FAM_REGISTRY))
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
        c.js(_TEXTS_JS, with_files(_FAM_REGISTRY))
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
  - { id: X-504A, family: TESTREG, title: Quatrième mission, origin: Base Sud (XSUD), folder: X_REG/X-504A, files: [missionX-504A.yaml] }
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
# SOG-0365 (arbitrage du 15/11) : X-503A a son fichier dans l'arbre de l'appareil, pas encore lu (vide : hors de l'index) ; X-504A n'a
# aucun fichier
_SRCH_TEXTS = [['missions/mission_registry.yaml', _SRCH_REG], ['missions/X_REG/X-501A/missionX-501A.yaml', _SRCH_501],
               ['missions/X_REG/X-502A/missionX-502A.yaml', _SRCH_502], ['missions/X_REG/X-503A/missionX-503A.yaml', '']]
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
    c.eq([x[:2] for x in c.js(_SRCH_LIST)], [['X-503A', 'line']], 'a mission whose file is on the device, not read yet, is found on its registry line', what='xnrd')
    # SOG-0365, le pendant : une ligne sans fichier sur l'appareil n'est pas proposée
    _type(c, q, 'xsud')
    c.settle()
    c.eq(c.count(f'{M} [data-list] [data-id="X-504A"]'), 0, 'a registry line without its file is not offered (SOG-0365)', what='xsud')
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
    c.ok(all(x[1] is False for x in steps), steps, 'the six steps open (delivered one push each, 13 Nov)')
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
    c.until(f"document.querySelector('{E} [data-edhead]')?.textContent.includes('Mission complète')", timeout=10000, what='X-001A in the editor')
    c.eq(c.js(f"document.querySelector('{E}').dataset.step"), '', 'on a phone, a mission being modified opens with every group folded', what='the open group')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")  # the captures without the toasts of the steps before
    bar = c.js(f"""(() => {{ const b = document.querySelector('{E} [data-do=edsave]').getBoundingClientRect();
      return document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)?.closest('[data-do=edsave]') ? b.bottom <= innerHeight : false }})()""")
    c.ok(bar, 'covered or off screen', 'at 390, « Enregistrer · À compléter · Annuler » stays on screen above the tab bar')
    c.shot('N50_390_cadre.png')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.shot('N50_1280_cadre.png')
    c.ok(c.js(f"getComputedStyle(document.querySelector('{E} .ms-atgrid')).display") == 'grid', 'stacked', 'wide: the sheet beside the map and the unfolding')
    c.tap(f'{E} [data-steps] [data-step="cadre"]')
    c.until(f"!!document.querySelector('{E} input[data-k=edtitle]')", what='the Cadre unfolded')
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


@case('N51', 'Missions › editor, the Équipes: the group unfolds by its name (« Suivante » is gone, SOG-0444); one row per team (callsign, type, service, '
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
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the editor')
    c.tap(f'{E} [data-steps] [data-step="teams"]')
    c.until(f"!!document.querySelector('{E} [data-edteams]')", what='the group « Équipes » unfolds')
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
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the editor')
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
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the editor')
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
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='the messy file in the editor')
    for step in ('teams', 'places', 'story', 'risks', 'timeline', 'cadre'):
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



_RISKS_JS = f"""[...document.querySelectorAll('{E} [data-edrisks] [data-risk] .ms-plbody b')].map(b => b.textContent.trim())"""


@case('N55', 'Missions › editor, step 5 (Risques): one row « danger → parade » per risk; « Modifier » opens hazard, consequence, mitigation; '
      'a risk changed, one removed, one added; « Enregistrer » writes them, the removed one leaves the translations too (same order), '
      'the others keep their keys', 'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0287 step 5, the mock-up: « Risques : une ligne « danger → parade » ; + Risque » (no level: the V2 schema has none)')
def n55(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    text = _ED_FULL + ('i18n:\n  en:\n    risks:\n' + ''.join(f'      - {{ hazard: Hazard {w} }}\n' for w in ('one', 'two', 'three', 'four', 'five')))
    reg_open(c, [[_ED_TEXTS[0][0], _ED_TEXTS[0][1]], ['missions/X_REG/X-001A/missionX-001A.yaml', text]])
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the editor')
    c.tap(f'{E} [data-steps] [data-step="risks"]')
    c.until(f"!!document.querySelector('{E} [data-edrisks]')", what='the Risques')
    c.eq(c.js(_RISKS_JS), [f'Danger {w} → Parade {w}' for w in ('un', 'deux', 'trois', 'quatre', 'cinq')], 'one row « danger → parade » per risk',
         what='rows')
    c.tap(f'{E} [data-risk="0"] [data-do="edrisk"]')
    c.page.fill(f'{E} [data-rkform="0"] [data-f=mitigation]', 'Parade retouchée')
    c.tap(f'{E} [data-rkform="0"] [data-do="edriskok"]')
    c.tap(f'{E} [data-risk="1"] [data-do="edrisk"]')
    c.tap(f'{E} [data-rkform="1"] [data-do="edriskdel"]')
    c.tap(f'{E} [data-do="edriskadd"]')
    c.page.fill(f'{E} [data-rkform] [data-f=hazard]', 'Danger six')
    c.page.fill(f'{E} [data-rkform] [data-f=mitigation]', 'Parade six')
    c.tap(f'{E} [data-rkform] [data-do="edriskok"]')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N55_390_risks.png')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.shot('N55_1280_risks.png')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    t = c.js(_TEXT_OF, 'missions/X_REG/X-001A/missionX-001A.yaml') or ''
    r = t[t.find('risks:'):t.find('maps:')] if 'maps:' in t else t
    c.ok('Parade retouchée' in r and 'Danger deux' not in t and 'hazard: Danger six' in r and 'Danger cinq' in r, r[:400],
         'one risk changed, one removed, one added at the end')
    c.ok('Hazard two' not in t and 'Hazard one' in t and 'Hazard three' in t, t[t.find('i18n'):][:300], 'the removed risk leaves the translations too')
    c.js(_REG_CLEAR)



# audit 186: a registry of nine nested anchors (a few hundred bytes, invented) that Y.dump would unfold into tens of millions of signs
_BOMB_REG = 'schema: mission-registry\nversion: 1\nmissions: []\na0: &a0 [xxxxxxxxxx, xxxxxxxxxx, xxxxxxxxxx]\n' + ''.join(
    f'a{i}: &a{i} [*a{i - 1}, *a{i - 1}, *a{i - 1}, *a{i - 1}, *a{i - 1}, *a{i - 1}, *a{i - 1}, *a{i - 1}, *a{i - 1}]\n' for i in range(1, 10))
_SINGLE_RDV = _ED_FULL.replace("""rendezvous:
  - { id: RDV-1, name: Rendez-vous d'essai, lat: 44.5, lon: 1.5, participants: [ALPHA1, BRAVO2], role: ralliement }""",
                               """rendezvous: { id: RDV-1, name: Rendez-vous d'essai, lat: 44.5, lon: 1.5, participants: [ALPHA1, BRAVO2], role: ralliement }""")


@case('N56', 'Missions › editor and registry, audit 186: a rendezvous written as a single object survives an edit of the Lieux (the shape kept); '
      'a registry with YAML anchors is said unreadable, never unfolded nor rewritten (the screen opens at once, « Mettre à jour » stays '
      'off); « Changer de compagnie » and the registry\'s own dump refuse an anchored document', 'N', tags=('missions', 'security'),
      designs=('standard',), screens=False, langs4=False,
      rule='Sécurisation, audit 186: withPlaces deleted a single-object rendezvous (the reader tolerates it, placesOf did not); registry.js '
      'withHeader, add.js and move.js dumped documents of the repository without the alias guard — a 333-byte registry took 6.4 s and '
      '88 million signs')
def n56(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    path = 'missions/X_REG/X-001A/missionX-001A.yaml'
    assert _SINGLE_RDV != _ED_FULL
    reg_open(c, [[_ED_TEXTS[0][0], _ED_TEXTS[0][1]], [path, _SINGLE_RDV]])
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the editor')
    c.tap(f'{E} [data-steps] [data-step="places"]')
    c.until(f"!!document.querySelector('{E} [data-place][data-kind=rdv]')", what='the single rendezvous listed')
    c.tap(f'{E} [data-place][data-kind=target] [data-do="edplace"]')
    c.page.fill(f'{E} [data-plform] [data-f=lat]', '44.65')
    c.tap(f'{E} [data-plform] [data-do="edplaceok"]')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    t = c.js(_TEXT_OF, path) or ''
    c.ok('lat: 44.65' in t and 'rendezvous:\n  id: RDV-1' in t, t[t.find('target'):][:500], 'the target moved, the single-object rendezvous kept as it was')
    c.tap(f'{E} [data-do="edcancel"]')
    # the anchored registry: unreadable at once, never rewritten
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_REG_CLEAR)
    c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _BOMB_REG]])
    t0 = c.js('performance.now()')
    c.open('missions', wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-do=regopen]')", timeout=15000, what='Missions')
    c.tap(f'{M} [data-do="regopen"]')
    c.until(f"!!document.querySelector('{R} [data-why=unreadable]')", timeout=5000, what='the registry said unreadable')
    c.ok(c.js(f"document.querySelector('{R} [data-do=regplan]')?.disabled") is True, 'enabled', '« Mettre à jour le registre » stays off')
    c.eq(c.js(_TEXT_OF, 'missions/mission_registry.yaml'), _BOMB_REG, 'never rewritten', what='registry')
    got = c.js("""async () => { const MV = await import('/modules/missions/move.js'); const RG = await import('/modules/missions/registry.js');
      if (!globalThis.jsyaml) await import('/frame/lib/js-yaml.min.js'); const Y = globalThis.jsyaml;
      const mission = 'mission: { id: X-001A, type: REG }\\ntitle: Ancres\\nbase: &b { name: Base }\\norigin: *b\\n';
      let dumped = 'not refused'; const t = performance.now();
      try { RG.withHeader(Y.load(%s), Y); } catch (e) { dumped = 'refused' }
      return { move: MV.withAirline(mission, 'abc', Y), dumped, ms: Math.round(performance.now() - t) } }""" % repr(_BOMB_REG).replace("'", '"'))
    c.eq([got['move'], got['dumped']], [None, 'refused'], '« Changer de compagnie » and the registry dump refuse an anchored document', what='guards')
    c.ok(got['ms'] < 1000, got, 'refused in under a second')
    c.js(_REG_CLEAR)



@case('N57', 'Missions › editor, step 6 (Chronologie et cartes): an event added (H+30mn, a place of the mission, what happens); the declared maps '
      'listed; « Proposer les cartes depuis les lieux » adds the missing entries (target, its detail, the rendezvous, the second zone) and '
      'keeps the others; « Enregistrer » writes timeline.events and the maps', 'N', tags=('missions',), designs=('standard',), screens=False,
      langs4=False, rule='SOG-0287 step 6, the mock-up: « Chronologie et cartes : les événements, puis les cartes proposées depuis les lieux » '
      '(timeline.events: shared/mission_exercise.js; proposedMaps: apps/cpco/mission_guide.js)')
def n57(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    reg_open(c, _ED_TEXTS)
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the editor')
    c.tap(f'{E} [data-steps] [data-step="timeline"]')
    c.until(f"!!document.querySelector('{E} [data-edevents]')", what='the Chronologie')
    c.eq(c.js(f"[...document.querySelectorAll('{E} [data-edmaps] [data-map]')].map(m => m.dataset.map)"), ['general', 'zone_1', 'bad'],
         'the declared maps', what='maps')
    c.tap(f'{E} [data-do="edeventadd"]')
    c.page.fill(f'{E} [data-event="0"] [data-f=at]', 'H+30mn')
    c.page.select_option(f'{E} [data-event="0"] select[data-f=place]', 'PT1')
    c.page.fill(f'{E} [data-event="0"] [data-f=text]', 'Un message inventé arrive.')
    c.tap(f'{E} [data-do="edmapspropose"]')
    c.until(f"document.querySelectorAll('{E} [data-edmaps] [data-map]').length > 3", what='the proposed maps')
    c.eq(c.js(f"[...document.querySelectorAll('{E} [data-edmaps] [data-map]')].map(m => m.dataset.map)"),
         ['general', 'zone_1', 'bad', 'cible', 'detail_cible', 'detail_rdv_1', 'zone_2'], 'the missing ones added, the others kept', what='maps')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N57_390_timeline.png')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.shot('N57_1280_timeline.png')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    t = c.js(_TEXT_OF, 'missions/X_REG/X-001A/missionX-001A.yaml') or ''
    c.ok('timeline:' in t and 'at: H+30mn' in t and 'place: PT1' in t and 'Un message inventé arrive.' in t, t[t.find('timeline'):][:300],
         'the event written in timeline.events')
    c.ok('id: detail_rdv_1' in t and 'id: zone_2' in t and 'filename: ../../secret.png' in t and 'Danger cinq' in t, t[t.find('maps:'):][:600],
         'the proposed maps added, the declared ones (even a refused path) kept as written')
    c.js(_REG_CLEAR)



_E_CLEAR = """async () => { const db = await new Promise(r => { const q = indexedDB.open('sogFrame'); q.onsuccess = () => r(q.result) });
  for (const st of ['pending', 'docs']) { if (!db.objectStoreNames.contains(st)) continue;
    const keys = await new Promise(res => { const q = db.transaction(st).objectStore(st).getAllKeys(); q.onsuccess = () => res(q.result) });
    const t = db.transaction(st, 'readwrite'); for (const k of keys) if (/^missions\\/E_COMMERCIAL\\/E-9/.test(String(k))) t.objectStore(st).delete(k);
    await new Promise(r => { t.oncomplete = r; t.onerror = r }) } db.close(); return true }"""


@case('N58', 'Missions › editor, the commercial family (a link flight): « E · CAT · … » offered; its Cadre reduced to departure, arrival, airline, '
      'load and aircraft; the title proposed by itself (« LFPO → LFRS ») and following the two ends; « À compléter » without teams, risks, '
      'chronology nor theatre; « Enregistrer » writes type COMMERCIAL, the load as subtype, the aircraft type', 'N', tags=('missions',),
      designs=('standard',), screens=False, langs4=False,
      rule='SOG-0287, addition of 13 Nov (user: « Une mission commercial, c\'est en gros, une liaison. genre, LFPO-LFRS pour ITF, en '
      'passagers. »), granted: COMMERCIAL / CAT / E, subtype = the nature of the load')
def n58(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    reg_open(c, _ED_TEXTS)
    c.js(_E_CLEAR)
    c.tap(f'{R} [data-do="edcreate"]')
    c.until(f"!!document.querySelector('{E}')", what='the editor')
    fam = c.js(f"[...document.querySelectorAll('{E} select[data-k=edfam] option')].map(o => [o.value, o.textContent.trim()]).find(o => o[0] === 'COMMERCIAL')")
    c.ok(bool(fam) and fam[1].startswith('E · CAT'), fam, 'the commercial family offered as « E · CAT · … »')
    c.page.select_option(f'{E} select[data-k=edfam]', 'COMMERCIAL')
    c.until(f"!!document.querySelector('{E} [data-liaison]')", what='the reduced Cadre')
    c.ok(not c.count(f'{E} select[data-k=edth]') and c.count(f'{E} [data-k=edco]') == 1 and c.count(f'{E} [data-k=edac]') == 1,
         'fields', 'no theatre; the airline and the aircraft asked')
    c.page.select_option(f'{E} select[data-k=edsub]', 'PASSENGERS')
    _ed_fill(c, 'edid', 'E-901')
    _ed_fill(c, 'eddep', 'LFPO · Orly')
    _ed_fill(c, 'edarr', 'LFRS')
    c.eq(c.js(f"document.querySelector('{E} input[data-k=edtitle]').value"), 'LFPO → LFRS', 'the title proposed by itself', what='title')
    _ed_fill(c, 'edarr', 'LFRN')
    c.eq(c.js(f"document.querySelector('{E} input[data-k=edtitle]').value"), 'LFPO → LFRN', 'and it follows the two ends', what='title')
    _ed_fill(c, 'edac', 'a320')
    todo = c.js(f"[...document.querySelectorAll('{E} [data-edtodo] [data-todo]')].map(x => x.dataset.todo)")
    c.ok(not set(todo) & {'teams', 'risks', 'timeline', 'theatre'}, todo, '« À compléter » without teams, risks, chronology nor theatre')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N58_390_liaison.png')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.shot('N58_1280_liaison.png')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    t = c.js(_TEXT_OF, 'missions/E_COMMERCIAL/E-901/missionE-901.yaml') or ''
    c.ok(all(x in t for x in ('type: COMMERCIAL', 'subtype: PASSENGERS', 'title: LFPO → LFRN', 'type: A320', 'icao: LFPO', 'icao: LFRN')) and 'airline' not in t,
         t, 'a link flight written: family, load, title, aircraft; personal without an airline chosen')
    c.js(_E_CLEAR)
    c.js(_REG_CLEAR)



@case('N59', 'Missions › editor, audit 187: a risk whose danger is under « title » or « name » survives an edit of its mitigation (four risks, '
      'four translations); a danger cleared on purpose removes the risk and its translation (the lists stay aligned); a registry of eight '
      'thousand short lines is not « too large » (its own node budget)', 'N', tags=('missions', 'security'), designs=('standard',), screens=False,
      langs4=False,
      rule='Sécurisation, audit 187 on 92906e900: withRisks kept an edited risk only if (o.hazard) — { title: Birds } was dropped and '
      'i18n.<lang>.risks left unaligned; note 3: 100 000 nodes is about two thousand registry lines')
def n59(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    got = c.js("""async () => { const ED = await import('/modules/missions/editor.js'); const MS = await import('/frame/lib/mission.js');
      const doc = { risks: [{ title: 'Oiseaux inventés', mitigation: 'ancienne' }, { name: 'Vent inventé' }, { hazard: 'Givre inventé' }, 'Texte brut'],
        i18n: { en: { risks: ['a', 'b', 'c', 'd'] } } };
      let r = ED.risksOf(doc); r[0].mitigation = 'nouvelle'; const one = ED.withRisks(doc, r);
      r = ED.risksOf(doc); r[1].hazard = ''; const two = ED.withRisks(doc, r);
      const reg = { missions: Array.from({ length: 8000 }, (_, i) => ({ id: 'X-' + String(i % 1000).padStart(3, '0') + 'A', family: 'REG', title: 'Ligne',
        folder: 'X_REG/X', files: ['m.yaml'], aircraftTypes: ['H135'], callsigns: ['A'], teams: [{ name: 'A', service: 'B', type: 'C' }] })) };
      return { one: [one.risks.length, one.i18n.en.risks.length, one.risks[0].title, one.risks[0].mitigation],
        two: [two.risks.length, two.i18n.en.risks.join('')], reg: [MS.shapeOf(reg, MS.REGISTRY_NODES_MAX), MS.shapeOf(reg)] } }""")
    c.eq(got['one'], [4, 4, 'Oiseaux inventés', 'nouvelle'], 'a « title » risk edited: kept, four risks and four translations', what='title risk')
    c.eq(got['two'], [3, 'acd'], 'a danger cleared: the risk and its translation removed, the lists aligned', what='cleared')
    c.eq(got['reg'], ['', 'size'], 'eight thousand short registry lines (some 128 000 nodes): within the registry\'s budget, beyond a mission\'s', what='registry budget')



_TOLERATED_JS = """async () => { const ED = await import('/modules/missions/editor.js'); const J = x => JSON.stringify(x);
  // every shape the reader (frame/lib/mission.js) or shared/mission_exercise.js tolerates, invented, in one file
  const doc = { mission: { id: 'libre', type: 'REG', subtype: 'S' }, title: 'T', origin: { name: 'Base Test (XTST)', lat: 45, lon: 1 },
    timeline: [{ at: 'H', text: 'Premier' }, { at: 'H+1h', description: 'Second' }],
    maps: ['carte_libre.png', { id: 'general', type: 'general' }], aircraft: [{ type: 'H135' }, null, { type: 'EC25' }],
    zones: [{ id: 'Z1', center: { lat: 44, lon: 1 }, radiusKm: 5 }], rendezvous: [{ id: 'R1', participants: 'ALPHA1', lat: 44.5, lon: 1.5 }],
    objectives: { secondary: 'Un seul objectif' }, risks: [{ title: 'Oiseaux' }, 'Texte brut'], teams: { name: 'SEULE' } };
  const out = {}, same = [];
  for (const [n, of, w] of [['cadre', 'cadreOf', 'withCadre'], ['teams', 'teamsOf', 'withTeams'], ['places', 'placesOf', 'withPlaces'],
    ['story', 'storyOf', 'withStory'], ['risks', 'risksOf', 'withRisks'], ['events', 'eventsOf', 'withEvents']])
    if (J(ED[w](doc, ED[of](doc))) === J(doc)) same.push(n);
  // the audit's counter-test: an event added to a list-form timeline keeps the two others, in the list
  const ev = ED.eventsOf(doc), add = ED.withEvents(doc, [...ev, { i: -1, at: 'H+2h', place: '', text: 'Ajouté' }]);
  out.events = ev.map(e => e.text); out.added = add.timeline;
  const ch = { chronology: { events: [{ at: 'H', label: 'Étiquette' }] } }, r = ED.eventsOf(ch); r[0].text = 'Retouchée';
  out.chronology = ED.withEvents(ch, r);
  out.maps = ED.mapsOf(doc).map(m => m.id); out.files = ED.proposedMaps(doc).map(m => m.filename);
  const c = ED.cadreOf(doc); c.aircraft = 'A320'; out.aircraft = ED.withCadre(doc, c).aircraft;
  const pl = ED.placesOf(doc), z = pl.find(x => x.kind === 'zone'); out.zone = [z.radius, pl.find(x => x.kind === 'rdv').participants];
  z.lat = '44.2'; out.center = ED.withPlaces(doc, pl).zones[0];
  out.secondary = ED.storyOf(doc).secondary; out.teams = ED.teamsOf(doc).map(t => t.name); out.risks = ED.risksOf(doc).map(x => x.hazard);
  out.same = same; return out }"""


@case('N60', 'Missions › editor, audit 190 and the review of tolerated shapes: a timeline written as a LIST (or chronology, or an event text '
      'under description / label) is shown and kept — an added event never replaces it; maps as plain file names listed; proposed file '
      'names without a free identifier; a null aircraft kept; radiusKm, centre under « center », participants and secondary objectives as '
      'single texts, a teams object, a risk under title: shown, and every step gives the file back identical', 'N', tags=('missions', 'security'),
      designs=('standard',), screens=False, langs4=False,
      rule='Sécurisation, audit 190 on 2dfa0aeca: a timeline in list form was not shown and an added event overwrote it (two events in, one '
      'out) — the fourth audit of the same family: every shape the reader tolerates and the form does not show is listed in DECISIONS')
def n60(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    g = c.js(_TOLERATED_JS)
    c.eq(g['same'], ['cadre', 'teams', 'places', 'story', 'risks', 'events'], 'every step, untouched, gives the file back identical', what='identity')
    c.eq([g['events'], g['added']], [['Premier', 'Second'], [{'at': 'H', 'text': 'Premier'}, {'at': 'H+1h', 'description': 'Second'},
                                                          {'at': 'H+2h', 'text': 'Ajouté'}]],
         'a list-form timeline shown (text under description too) and kept as a list with the added event', what='timeline')
    c.eq(g['chronology'], {'chronology': {'events': [{'at': 'H', 'label': 'Retouchée'}]}}, 'chronology and label kept where they are', what='chronology')
    c.ok(g['maps'] == ['carte_libre.png', 'general'] and all('libre' not in f for f in g['files']), g, 'a map given as a file name listed; '
         'no free identifier in a proposed file name')
    c.eq(g['aircraft'], [{'type': 'A320'}, None, {'type': 'EC25'}], 'the first aircraft changed, the null entry and the others kept', what='aircraft')
    c.eq([g['zone'], g['center']], [['5', 'ALPHA1'], {'id': 'Z1', 'center': {'lat': 44.2, 'lon': 1}, 'radiusKm': 5}],
         'radiusKm and a single participant shown; the centre edited where it was written (« center »)', what='zone')
    c.eq([g['secondary'], g['teams'], g['risks']], ['Un seul objectif', ['SEULE'], ['Oiseaux', 'Texte brut']],
         'a single secondary objective, a teams object, risks under title or as text: shown', what='shown')
    # the step itself: a list-form timeline listed, an event added through the screen, the list kept
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    reg_open(c, [[_ED_TEXTS[0][0], _ED_TEXTS[0][1]], ['missions/X_REG/X-001A/missionX-001A.yaml',
                                                       _ED_FULL + 'timeline:\n  - { at: H, text: Premier inventé }\n  - { at: H+1h, description: Second inventé }\n']])
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the editor')
    c.tap(f'{E} [data-steps] [data-step="timeline"]')
    c.until(f"document.querySelectorAll('{E} [data-edevents] [data-event]').length === 2", what='the two events of the list shown')
    c.tap(f'{E} [data-do="edeventadd"]')
    c.page.fill(f'{E} [data-event="2"] [data-f=text]', 'Troisième inventé')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    t = c.js(_TEXT_OF, 'missions/X_REG/X-001A/missionX-001A.yaml') or ''
    c.ok('Premier inventé' in t and 'description: Second inventé' in t and 'Troisième inventé' in t and 'events:' not in t, t[t.find('timeline'):][:300],
         'the list kept, its two events and the added one')
    c.js(_REG_CLEAR)



@case('N61', 'Missions › Registre: a mission added from its file gets a series — the file\'s, else the current series of its family; a number, '
      'never the letter; a family without a series yet gets none', 'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0036, the user\'s answer to Q-0048 (13 Nov): « Il faut garder LETTRE-FAMILLE-NUM-SUFX […] on garde le nommage V2 » — the series '
      'stays a number: the file\'s series, else the family\'s current one (Features SOG\'s counter-proposal, kept); invented X-7xx missions')
def n61(c):
    import yaml
    texts = _REG_TEXTS + [['missions/X_REG/X-712A/missionX-712A.yaml', 'mission: { id: X-712A, type: TESTREG, series: 3 }\ntitle: Du dépôt douze\n']]
    reg_open(c, texts=texts)
    c.tap(f'{R} [data-do="regplan"]')
    c.until(f"!!document.querySelector('{R} [data-regplan]')", what='the plan is shown')
    c.tap(f'{R} [data-do="regwrite"]')
    reg_wait_text(c, lambda t: 'X-712A' in t)
    by = {m['id']: m for m in yaml.safe_load(reg_text(c))['missions']}
    c.eq(by['X-712A'].get('series'), 3, 'the file\'s series', what='X-712A')
    c.eq(by['X-710A'].get('series'), 7, 'no series in the file: the current series of its family (TESTREG: 7)', what='X-710A')
    c.ok(by['X-711A'].get('series') in ('', None), by['X-711A'], 'a family without a series yet: none, never a letter')
    c.js(_REG_CLEAR)



@case('N62', 'Missions: « Mes missions affectées » heads the list as soon as an assignment carries my trigram — the take-off, the aircraft, '
      'the callsign, the rendezvous and the crew\'s channels when the assignment carries them, « Préparer ce vol » in one gesture; another '
      'pilot\'s or a cancelled line is not mine; no group without an assignment of mine; a channel\'s address is https only',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=True,
      rule='SOG-0114 (A), the ergonomist\'s decision of 13 Nov, 16 h 05: « on m\'a affecté une mission : je la vois en tête de Missions, sous '
      '« Mes missions affectées », avec mon rendez-vous […] et le canal quand l\'affectation les porte ; je la prépare en un geste ; je ne tire '
      'rien au sort »; no usage flag; the V2 index missions/affectations.json read as it is (SPEC § 6), an untrusted input; invented X-7xx')
def n62(c):
    import datetime
    import json
    soon = lambda h: (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=h)).strftime('%Y-%m-%dT%H:%M:%SZ')
    idx = {'updatedAt': soon(0), 'assignments': [
        {'mission': 'X-701A', 'title': 'Registre un', 'pilot': 'ABC', 'callsign': 'TEST01', 'aircraft': {'registration': 'F-TEST', 'type': 'C30J'},
         'departure': 'LFRS', 'takeoff': soon(30), 'status': 'affectée', 'role': 'mission', 'rendezvous_at': soon(31),
         'meet': [{'kind': 'discord', 'label': 'Discord VA', 'url': 'https://discord.example.test/abc'}, {'kind': 'srs', 'label': 'SRS', 'value': '243.000'},
                  {'kind': 'other', 'label': 'Piège', 'url': 'javascript:window.__pwn=1'}], 'name': 'Invented Person'},
        {'mission': 'X-705A', 'title': 'Registre cinq', 'pilot': 'XYZ', 'takeoff': soon(5), 'status': 'affectée'},
        {'mission': 'X-704A', 'title': 'Registre quatre', 'pilot': 'ABC', 'takeoff': soon(5), 'status': 'annulée'},
        {'mission': 'X-702A', 'title': 'Passée', 'pilot': 'ABC', 'takeoff': soon(-48), 'status': 'affectée'}]}
    G = f'{M} [data-assigned]'
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_REG_CLEAR)
    c.js(_TEXTS_JS, _REG_TEXTS + [['missions/affectations.json', json.dumps(idx)]])
    c.open('missions', wait=False, app='company')
    c.until(f"document.querySelectorAll('{G}:not([hidden]) [data-assigned-id]').length === 1", timeout=20000, what='one assigned mission, mine')
    c.eq(c.js(f"document.querySelector('{G} [data-assigned-id]').dataset.assignedId"), 'X-701A', 'mine only: not another pilot\'s, not a cancelled or past one', what='mine')
    t = norm(c.text(G))
    c.ok(norm(tx(MS, 'assignedHead', c.lang)) in t and 'LFRS' in t and 'F-TEST C30J' in t and 'TEST01' in t, t, 'the take-off, the aircraft, the callsign')
    c.ok(c.js(f"!!document.querySelector('{G} [data-rdv]')"), t, 'the rendezvous, the assignment carries it')
    c.eq(c.js(f"document.querySelector('{G} [data-do=prepare]').getAttribute('href')"), '#fuel?mission=X-701A', '« Préparer ce vol » in one gesture', what='prepare')
    # retouche de l'ergonome (14/11, 1 h 30) : pour un pilote affecté, sa mission vient avant le tirage — le groupe au-dessus de la rangée « Tirer au sort »
    c.ok(c.js(f"!!(document.querySelector('{G}').compareDocumentPosition(document.querySelector('{M} [data-do=draw]')) & Node.DOCUMENT_POSITION_FOLLOWING)"), '', 'the group above « Tirer au sort »')
    c.eq(c.js(f"[...document.querySelectorAll('{G} [data-meetopen]')].map(a => a.getAttribute('href'))"), ['https://discord.example.test/abc'],
         'a channel\'s address: https only, never javascript:', what='links')
    c.ok(c.js(f"!!document.querySelector('{G} [data-do=meetcopy][data-v=\"243.000\"]')") and 'Invented' not in t, t, 'a value to copy; never a name')
    c.ok(c.js('window.__pwn') is None, '', 'nothing ran')
    c.js(f"document.querySelector('{G}').scrollIntoView({{block: 'center'}})")
    c.shot(f'N62_{c.design}_{c.width}_{c.lang}_delivered.png')
    # no assignment of mine: no group at all
    c.js(_REG_CLEAR)
    c.js(_TEXTS_JS, _REG_TEXTS + [['missions/affectations.json', json.dumps({'assignments': [idx['assignments'][1]]})]])
    c.open('missions', wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-pane=list]')", timeout=20000, what='the list')
    c.settle()
    c.ok(c.js(f"document.querySelector('{G}')?.hidden !== false") and c.count(f'{G} [data-assigned-id]') == 0, '', 'no assignment of mine: no group')
    c.js(_REG_CLEAR)



@case('N63', 'Missions › editor, timeline: a timeline that is a bare text is never replaced — the events go to chronology; when timeline and '
      'chronology are both bare values nothing is written and the step says so instead of offering « + Événement »', 'N', tags=('missions',),
      designs=('standard',), screens=False, langs4=False,
      rule='Audit 194 (Sécurisation, 13 Nov), its note: « A timeline that is a bare text (neither a list nor an object) is replaced by { events: […] } '
      'at the first added event […] leave a non-container value alone »')
def n63(c):
    c.open('missions', wait=False, app='company')
    c.until(f"!!document.querySelector('{M}')", timeout=20000, what='Missions mounted')
    got = c.js("""async () => { const ED = await import('/modules/missions/editor.js');
        const ev = [{ i: -1, at: 'H+10', place: '', text: 'Décollage' }];
        const a = ED.withEvents({ timeline: 'voir le briefing' }, ev);
        const b = ED.withEvents({ timeline: 'voir le briefing', chronology: 'idem' }, ev);
        return [a.timeline, a.chronology, b, ED.eventsStorable({ timeline: 'x', chronology: 'y' }), ED.eventsStorable({ timeline: 'x' })] }""")
    c.eq(got[0], 'voir le briefing', 'the bare timeline is left alone', what='timeline')
    c.eq(got[1], {'events': [{'at': 'H+10', 'text': 'Décollage'}]}, 'the event goes to chronology', what='chronology')
    c.eq(got[2], {'timeline': 'voir le briefing', 'chronology': 'idem'}, 'both bare: nothing written', what='both bare')
    c.eq(got[3:], [False, True], 'the step knows when there is no place for the events', what='storable')



@case('N64', 'Missions › editor, the preview\'s map thumbnail (the mock-up): departure and arrival, the target, the zones in dashed circles, '
      'the turning points and the rendezvous; a liaison aerodrome without a position in the file is placed from the base', 'N',
      tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0287, what was left (the user validated on 13 Nov at 16 h 28): « la vignette de carte de l\'aperçu, la position d\'un terrain '
      'prise dans la base pour une liaison »; the mock-up modules/missions/maquette/editeur_lieux_1280.png; invented X-001A, aerodrome XTST')
def n64(c):
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    full = _ED_FULL.replace('origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }', 'origin: { name: Base Test (XTST) }')
    c.ok(full != _ED_FULL, '', 'the departure without its position in the file')
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_REG_CLEAR)
    c.js(_TEXTS_JS, [[_ED_TEXTS[0][0], _ED_TEXTS[0][1]], ['missions/X_REG/X-001A/missionX-001A.yaml', full]])
    c.open('missions', wait=False, app='company', aero_extra={'aerodromes': [{'icao': 'XTST', 'name': 'XTST TEST', 'lat': 45.0, 'lon': 1.0, 'elev': 100}]})
    c.until(f"!!document.querySelector('{M} [data-do=regopen]')", timeout=15000, what='the Registry button')
    c.tap(f'{M} [data-do="regopen"]')
    c.until(_REG_READ, timeout=20000, what='the registry read')
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the editor')
    T = f'{E} [data-edpreview] [data-edthumb]'
    c.until(f"document.querySelectorAll('{T} circle').length === 7", timeout=15000,
            what='seven marks: departure (from the base), arrival, target, two turning points, the rendezvous, the circle zone')
    got = c.js(f"[...document.querySelectorAll('{T} circle')].map(e => [e.getAttribute('fill'), e.getAttribute('stroke-dasharray')])")
    c.eq(sum(1 for f, d in got if d), 1, 'one dashed circle: the zone with a radius', what='zone')
    c.eq(sum(1 for f, d in got if f == 'var(--sog-accent)'), 2, 'departure and arrival in the accent colour', what='dep arr')
    c.eq(sum(1 for f, d in got if f == 'var(--sog-err)'), 1, 'the target in red', what='target')
    c.js(f"document.querySelector('{E} [data-edpreview]').scrollIntoView({{block: 'center'}})")
    c.shot(f'N64_{c.design}_1280_{c.lang}_delivered.png')
    c.js(_REG_CLEAR)



@case('N65', 'Missions › the list on a phone: each mission\'s title takes the whole width of its row (identifier in bold, then the title), the '
      'route, the aircraft and the time under it in small type; side by side only when the list card is 560 px wide or more', 'N',
      tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0344 (the user\'s iPhone photo, 14 Nov 11 h 12: the titles crushed in a narrow column, one word per line); the ergonomist: on a '
      'phone the title takes the whole width, the details under it, side by side only from 560 px of card; invented X-7xx missions')
def n65(c):
    ROW = f"{M} [data-list] [data-id=\"X-799A\"]"
    geo = f"""(() => {{ const r = document.querySelector('{ROW}'); if (!r) return null; const [a, b] = r.children;
        const R = r.getBoundingClientRect(), A = a.getBoundingClientRect(), B = b.getBoundingClientRect();
        return {{ titleShare: A.width / R.width, below: B.top >= A.bottom - 1, card: document.querySelector('{M} [data-pane=list]').getBoundingClientRect().width }} }})()"""
    for w in (390, 1280):
        c.page.set_viewport_size({'width': w, 'height': c.height})
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_REG_CLEAR)
        reg = _REG_REGISTRY + "  - { id: X-799A, family: TESTREG, title: Un siège pour chaque caisse et le chronomètre en plus, origin: LFOE, destination: LFOJ, aircraftTypes: [C30J], estimate: { block: 272 }, folder: X_REG/X-799A, files: [missionX-799A.yaml] }\n"
        c.js(_TEXTS_JS, [['missions/mission_registry.yaml', reg]] + _REG_TEXTS[1:] + [['missions/X_REG/X-799A/missionX-799A.yaml', mission_doc('X-799A')]])
        c.open('missions', wait=False, app='company')
        c.until(f"!!document.querySelector('{ROW}')", timeout=20000, what=f'{w} px: the list')
        g = c.js(geo)
        if g['card'] < 560:
            c.ok(g['titleShare'] > 0.85 and g['below'], g, f'{w} px: the title over the whole row, the details under it')
        else:
            c.ok(not g['below'], g, f'{w} px: a card of 560 px and more: title and details side by side')
        c.js(f"document.querySelector('{ROW}').scrollIntoView({{block: 'center'}})")
        c.shot(f'N65_{c.design}_{w}_{c.lang}_delivered.png')
    c.js(_REG_CLEAR)



@case('N66', 'Missions on a device: the list and the draw offer only the missions whose file is in the tree the device keeps of the repository '
      '(nothing more read); none readable: the screen says « Aucune mission lisible sur cet appareil : synchronisez » instead of drawing; a file '
      'missing at the opening is said with the mission\'s name', 'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0365 (the phone, d091ecf, still true on 0721a0c: « On tire une mission au sort, mais le fichier est introuvable […] filtrer les '
      'missions réellement jouables »); invented X-7xx: X-702A is in the registry without its file')
def n66(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_REG_CLEAR)
    c.js(_TEXTS_JS, _REG_TEXTS)
    c.open('missions', wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-list] [data-id]')", timeout=20000, what='the list')
    c.settle()
    if c.js(f"!!document.querySelector('{M} [data-do=more]')"):
        c.tap(f'{M} [data-do="more"]')
    ids = c.js(f"[...document.querySelectorAll('{M} [data-list] [data-id]')].map(e => e.dataset.id)")
    c.ok('X-702A' not in ids and 'X-701A' in ids, ids, 'X-702A (no file on the device) is not offered; X-701A is')
    for _ in range(12):   # the draw never opens a mission without its file
        c.tap(f'{M} [data-do="draw"]')
        c.until(f"!!document.querySelector('{M} [data-pane=list]') || !!document.querySelector('{M} [data-why]') || !!document.querySelector('{M} .ms-sheet')",
                timeout=8000, what='drawn')
        c.ok(c.count(f'{M} [data-why=missing]') == 0, c.text(f'{M} [data-why]'), 'the draw opened a mission whose file is there')
        if c.js(f"!!document.querySelector('{M} [data-do=back]')"):
            c.tap(f'{M} [data-do="back"]')
            c.until(f"!!document.querySelector('{M} [data-pane=list]')", timeout=8000, what='back to the list')
    # only a mission without its file: the screen says it, nothing is drawn
    c.js(_REG_CLEAR)
    reg = 'schema: mission-registry\nversion: 1\nmissions:\n  - { id: X-702A, family: TESTREG, title: Registre deux, folder: X_REG/X-702A, files: [missionX-702A.yaml] }\n'
    c.js(_TEXTS_JS, [['missions/mission_registry.yaml', reg]])
    c.open('missions', wait=False, app='company')
    c.until(f"!!document.querySelector('{M} [data-noplayable]')", timeout=20000, what='« Aucune mission lisible sur cet appareil »')
    c.ok(norm(tx(MS, 'noPlayable', c.lang)) in norm(c.text(f'{M} [data-noplayable]')), c.text(f'{M} [data-noplayable]'), 'said in words')
    c.tap(f'{M} [data-do="draw"]')
    c.settle()
    c.eq(c.count(f'{M} [data-why=missing]'), 0, 'nothing drawn', what='no draw')
    c.js(_REG_CLEAR)

# SOG-0441 (lot T1): the drawers of a mission at the pilot's, the pure part (modules/missions/drawers.js). Ids N80 to N89 are kept for the
# session « Affectation des missions » (drawers at the pilot's, assignment), so that they never meet the editor's.
@case('N80', 'Missions bench: the drawers of a mission at the pilot\'s — the play, the reference time, the state from the pilots\' own '
      'records, another pilot\'s record read as an untrusted input', 'N', tags=('missions',), designs=('standard',), screens=False,
      rule='SPEC_MISSIONS_TIROIRS v2 (Q-0087: open for all) and SOG-0441: a drawer opens at its time or its fallback time (computed, never '
      'written), by the pilot\'s gesture (for himself only, Q-0094 pending), or as soon as the record of ONE pilot of the mission says a finding '
      '(zone, object); each pilot writes only his own record '
      '(pilot/<TRI>/missions/<ID>.json); another\'s opening is kept only when it stands (a pilot of the mission, this play, a plausible time, '
      'a leg that crosses the shape), a refused one is named; an opening once seen stays; a record is worth one play only')
def n80(c):
    c.page.goto(f'{c.base}/modules/missions/test/drawers.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__bench && window.__bench.done', timeout=30000)
    except Exception:
        raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', 'modules/missions/test/drawers.html') from None
    r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows })')
    c.ok(r['fail'] == 0 and r['pass'] >= 72, f"{r['pass']} passed, {r['fail']} failed. First failures: {(r['rows'] or [])[:3]}",
         'every check of the bench passes (72 at least)')


# ---- the session « Création de missions »: cases N70 to N79 (the editor's references, the drawers' format)
# an invented mission whose places are cited everywhere a place can be: the route, a part (its trigger point and its onward route), a
# map's centre, two events, the vertical profile
_REF_MISSION = """mission: { id: X-001A, type: REG, subtype: RECHERCHE }
title: Mission complète
summary: Une recherche inventée.
detailed_description: Un paragraphe inventé.
origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
destination: { name: Base Test Sud (XTSU), lat: 44.0, lon: 2.0 }
target: { id: TARGET, name: Cible d'essai, lat: 44.6, lon: 1.4 }
turning_points:
  - { id: PT1, name: Point un, role: entrée, lat: 44.8, lon: 1.2 }
  - { id: PT2, name: Point deux, role: sortie, lat: 44.4, lon: 1.6 }
rendezvous:
  - { id: RDV-1, name: Rendez-vous d'essai, lat: 44.5, lon: 1.5, role: ralliement }
zones:
  - { id: ZONE-1, name: Secteur nord, kind: search, centre: { lat: 44.7, lon: 1.3 }, radius_km: 12 }
route_order: [ORIGIN, PT1, RDV-1, TARGET, PT2, GHOST, DESTINATION]
phases:
  - { id: B, title: Changement, trigger_point: RDV-1, trigger_delay_min: 10, trigger: 10 min après RDV-1, message: Nouvelle DZ., route_order: [RDV-1, PT2, DESTINATION] }
teams:
  - { name: ALPHA1, service: Service d'essai, type: H135, role: recherche }
risks:
  - { hazard: Danger un, mitigation: Parade un }
timeline:
  events:
    - { at: H+10mn, place: PT1, text: Passage au point un }
    - { at: H+25mn, place: RDV-1, text: Jonction }
maps:
  - { id: general, filename: generalX-001A.png, type: general, description: Vue générale inventée. }
  - { id: detail_rdv_1, filename: detail_rdvX-001A-1.png, type: detail_rdv, centre_ref: RDV-1, description: Le rendez-vous. }
vertical_profile:
  route: "ORIGIN, FL100, PT1/FL080, RDV-1, TARGET, PT2, DESTINATION"
"""
_REF_TEXTS = [_ED_TEXTS[0], ['missions/X_REG/X-001A/missionX-001A.yaml', _REF_MISSION]]
_ED_TODO = f"[...document.querySelectorAll('{E} [data-edtodo] [data-todo]')].map(x => x.dataset.todo)"
_ED_TODO_TEXT = f"[...document.querySelectorAll('{E} [data-edtodo] [data-todo]')].map(x => x.textContent).join(' | ')"
_NOTES = "[...document.querySelectorAll('#fNotes .f-note')].map(n => n.dataset.kind + ':' + n.textContent).join(' | ')"
_EV_PLACES = f"[...document.querySelectorAll('{E} [data-event] select[data-f=place]')].map(x => x.value)"
_PLACE_AT = f"""(start) => [...document.querySelectorAll('{E} [data-edplaces] [data-place]')].findIndex(r => r.querySelector('.ms-plbody b').textContent.trim().startsWith(start))"""


@case('N70', 'Missions › editor, the references to the places: a place renamed in the Lieux is renamed everywhere it is cited (the route, a '
      'part\'s trigger point and onward route, a map\'s centre, an event, the vertical profile) — also in the rows of the Chronologie '
      'already on screen; « Retirer » on a place still cited says who cites it and asks a second press (« Retirer quand même »), then '
      'its citations go with it and « À compléter » NAMES the drawer left without its trigger point and the map left without centre; the '
      'second press is inert for a second and the notification stays until then; a '
      'reference already dead in the file is kept and said; a new place never takes an identifier of the file; nothing changed, the '
      'same document', 'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0439 (the ergonomist, 17 Nov 2026: « Renommer un lieu suit partout ; retirer un lieu encore cité est DIT (lesquels le '
      'citent) et demande un geste ; rien n\'est réécrit si rien ne change » ; « une carte laissée sans centre et une partie devenue '
      '« geste seul » sont dites dans « À compléter » »); modules/missions/EDITOR.md')
def n70(c):
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    path = 'missions/X_REG/X-001A/missionX-001A.yaml'
    reg_open(c, _REF_TEXTS)
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the editor')
    # the Chronologie first: its rows stay on screen with the identifiers of the file (the trap of a rename made afterwards)
    c.tap(f'{E} [data-steps] [data-step="timeline"]')
    c.until(f"!!document.querySelector('{E} [data-edevents]')", what='the Chronologie')
    c.eq(c.js(_EV_PLACES), ['PT1', 'RDV-1'], 'the places of the file', what='events before')
    c.eq([t for t in c.js(_ED_TODO) if t in ('deadRef', 'drawerNoPoint', 'mapNoCentre')], ['deadRef'],
         '« À compléter » says the reference already dead in the file (GHOST), nothing else', what='todo at the opening')
    c.ok('GHOST' in c.js(_ED_TODO_TEXT), c.js(_ED_TODO_TEXT), '… and NAMES it: the field that cites it and the absent identifier')
    c.tap(f'{E} [data-steps] [data-step="places"]')
    c.until(f"!!document.querySelector('{E} [data-edplaces]')", what='the Lieux')
    i = c.js(_PLACE_AT, 'PT1')
    c.tap(f'{E} [data-place="{i}"] [data-do="edplace"]')
    c.page.fill(f'{E} [data-plform="{i}"] [data-f=id]', 'ALPHA')
    c.tap(f'{E} [data-plform="{i}"] [data-do="edplaceok"]')
    # « Retirer » the rendezvous: cited six ways — the first press removes nothing, says who cites it, and the button changes
    i = c.js(_PLACE_AT, 'RDV-1')
    c.tap(f'{E} [data-place="{i}"] [data-do="edplace"]')
    first = c.text(f'{E} [data-plform="{i}"] [data-do="edplacedel"]')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    # a DOUBLE press, two clicks in a row: « Retirer quand même » sits exactly where « Retirer » was and is inert for a second, so
    # that nothing is removed unread
    c.js(f"""() => {{ const sel = '{E} [data-plform="{i}"] [data-do="edplacedel"]'; document.querySelector(sel).click(); document.querySelector(sel).click() }}""")
    c.settle()
    c.ok(c.js(_PLACE_AT, 'RDV-1') == i, c.js(_PLACES_JS), 'a place still cited is not removed at the first press, nor by a double press')
    c.ok(c.text(f'{E} [data-plform="{i}"] [data-do="edplacedel"]') != first, first, 'the button now says « Retirer quand même »')
    note = c.js(_NOTES)
    c.ok('RDV-1' in note and 'detail_rdv_1' in note and ' 1 (' in note, note, 'a floating notification names who cites it (the drawer 1, by its rank; the map detail_rdv_1)')
    c.shot('N70_390_cited.png')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.shot('N70_1280_cited.png')
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.settle()
    # the notification stays until its cross or the second press (a plain note leaves by itself after 6 s)
    c.page.wait_for_timeout(6500)
    c.ok('RDV-1' in c.js(_NOTES), c.js(_NOTES), 'the notification is still there after more than 6 s')
    c.tap(f'{E} [data-plform="{i}"] [data-do="edplacedel"]')
    c.eq(c.js(_PLACE_AT, 'RDV-1'), -1, 'the second press removes the place', what='the rendezvous row')
    note = c.js(_NOTES)
    c.ok(note.startswith('ok:') and 'detail_rdv_1' not in note and 'RDV-1' in note, note, 'the second press replaces the notification by a short « retiré, avec ses citations »')
    c.eq([t for t in c.js(_ED_TODO) if t in ('deadRef', 'drawerNoPoint', 'mapNoCentre')], ['deadRef', 'drawerNoPoint', 'mapNoCentre'],
         '« À compléter » says the drawer left without its trigger point and the map left without centre', what='todo after the removal')
    todo = c.js(_ED_TODO_TEXT)
    c.ok(' 1 ' in todo and 'detail_rdv_1' in todo and 'GHOST' in todo, todo, '… and NAMES them: the drawer 1 (its rank, never its letter), the map detail_rdv_1, the dead word GHOST')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N70_390_after.png')
    # a place never cited goes at the first press; a new place never takes an identifier of the file (PT1 is still the name its
    # references carry until the file is saved)
    c.tap(f'{E} [data-do="edplaceadd"][data-kind="pt"]')
    c.until(f"!!document.querySelector('{E} [data-plform] [data-f=name]')", what='the new turning point open')
    c.eq(c.js(f"document.querySelector('{E} [data-plform] [data-f=id]').value"), 'PT3', 'neither PT1 (renamed in this sitting) nor PT2', what='the new identifier')
    c.page.fill(f'{E} [data-plform] [data-f=name]', 'Point trois')
    c.page.fill(f'{E} [data-plform] [data-f=lat]', '44.3')
    c.page.fill(f'{E} [data-plform] [data-f=lon]', '1.7')
    c.tap(f'{E} [data-plform] [data-do="edplaceok"]')
    # the rows of the Chronologie, on screen since before the rename, show the identifier of today
    c.tap(f'{E} [data-steps] [data-step="timeline"]')
    c.until(f"!!document.querySelector('{E} [data-edevents]')", what='the Chronologie again')
    c.eq(c.js(_EV_PLACES), ['ALPHA', ''], 'renamed in the row already on screen; the removed place is gone from its event', what='events after')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    got = c.js("""async (p) => { if (!globalThis.jsyaml) await import('/frame/lib/js-yaml.min.js'); const ED = await import('/modules/missions/editor.js');
      const text = await (%s)(p), d = globalThis.jsyaml.load(text, { schema: globalThis.jsyaml.CORE_SCHEMA });
      return { route: d.route_order, part: d.phases[0], maps: d.maps.map(m => [m.id, m.centre_ref]), events: d.timeline.events.map(e => [e.place || '', e.text]),
        profile: d.vertical_profile.route, pts: d.turning_points.map(x => x.id), rdv: 'rendezvous' in d, dead: ED.deadRefs(d).map(r => r.id) } }""" % _TEXT_OF, path)
    c.eq(got['route'], ['ORIGIN', 'ALPHA', 'TARGET', 'PT2', 'GHOST', 'DESTINATION'], 'the route follows the rename, loses the removed place, keeps the word already dead',
         what='route_order')
    c.eq(got['part'], {'id': 'B', 'title': 'Changement', 'trigger_delay_min': 10, 'trigger': '10 min après RDV-1', 'message': 'Nouvelle DZ.',
                       'route_order': ['PT2', 'DESTINATION']}, 'the part loses its trigger point (its delay stays: said in « À compléter »), its words are kept',
         what='the part B')
    c.eq(got['maps'], [['general', None], ['detail_rdv_1', '']], 'the map keeps its entry, its centre written empty', what='maps')
    c.eq(got['events'], [['ALPHA', 'Passage au point un'], ['', 'Jonction']], 'the events follow; an event keeps its text', what='events')
    c.eq(got['profile'], 'ORIGIN, FL100, ALPHA/FL080, TARGET, PT2, DESTINATION', 'the vertical profile follows, the level after « / » kept', what='profile')
    c.eq([got['pts'], got['rdv'], got['dead']], [['ALPHA', 'PT2', 'PT3'], False, ['GHOST']], 'no reference dead by the editor\'s doing', what='places and dead references')
    c.tap(f'{E} [data-do="edcancel"]')
    # the pure rules: nothing changed gives the very same document; a swap of two identifiers follows the places
    pure = c.js("""async (text) => { if (!globalThis.jsyaml) await import('/frame/lib/js-yaml.min.js'); const ED = await import('/modules/missions/editor.js');
      const base = globalThis.jsyaml.load(text, { schema: globalThis.jsyaml.CORE_SCHEMA }), rows = ED.placesOf(base), swap = structuredClone(rows);
      swap.find(r => r.name === 'Point un').id = 'PT2'; swap.find(r => r.name === 'Point deux').id = 'PT1';
      const hostile = [null, 7, 'x', [], { route_order: 'PT1', phases: 'x', maps: 4, timeline: 'texte', vertical_profile: [], alert: { phases: 3 } },
        { route_order: [null, {}, [], 3, { id: {} }], phases: [null, 3, { trigger_point: {}, route_order: {} }], maps: [null, { centre_ref: [] }], timeline: [null, 'x', { place: 3 }] }];
      let threw = ''; for (const bad of hostile) try { ED.refsOf(bad); ED.deadRefs(bad); ED.withRefs(bad, bad, ED.placesOf(bad)); ED.citedBy(bad, ED.placesOf(bad), 0); ED.removePlace(ED.placesOf(bad), 0, bad) } catch (e) { threw = String(e) }
      return { same: ED.withRefs(base, base, rows) === base, never: ED.withRefs(base, base, null) === base,
        swap: ED.withRefs(ED.withPlaces(base, swap), base, swap).route_order, free: ED.removePlace(rows, rows.findIndex(r => r.id === 'ZONE-1'), base).rows.length - rows.length, threw } }""", _REF_MISSION)
    c.eq(pure, {'same': True, 'never': True, 'swap': ['ORIGIN', 'PT2', 'RDV-1', 'TARGET', 'PT1', 'GHOST', 'DESTINATION'], 'free': -1, 'threw': ''},
         'nothing changed (or the Lieux never opened): the same document; a swap follows the places; a place never cited goes at once; hostile documents do not throw',
         what='the pure rules')
    c.js(_REG_CLEAR)



# an invented mission written the way the user's workshop writes it (zones and objects at the top, cited by identifier), then the same
# keys written inside the parts (the V3 editor's way), a V2 part by the hour, and what a hostile file does
_DRAWERS_JS = """async () => { const MS = await import('/frame/lib/mission.js');
  const base = { mission: { id: 'X-401A', type: 'SAR' }, title: 'Tiroirs', cruise_speed_kt: 120,
    origin: { name: 'Base Test (XTST)', lat: 44.5, lon: 1.0 }, destination: { name: 'Base Test Sud (XTSU)', lat: 44.0, lon: 1.2 },
    target: { id: 'TARGET', name: 'Cible', lat: 44.6, lon: 1.3 },
    turning_points: [{ id: 'PT1', name: 'Un', lat: 44.8, lon: 1.2 }, { id: 'PT2', name: 'Deux', lat: 44.7, lon: 1.4 }],
    zones: [{ id: 'ZONE-1', name: 'Secteur', kind: 'search', centre: { lat: 44.62, lon: 1.28 }, radius_km: 4, ceiling_ft: 3000 }],
    objects: [{ id: 'OBJ-1', kind: 'person', name: 'Naufragé', lat: 44.61, lon: 1.31, altitude_ft: 2500, detection_range_nm: 0.3, detection_height_ft: 800 },
      { id: 'OBJ-2', kind: 'aircraft', lat: 44.8, lon: 1.2, route_order: ['PT1', 'TARGET'], speed_kt: 110, detection_range_nm: 0.8 }],
    route_order: ['ORIGIN', 'PT1', 'TARGET', 'DESTINATION'], x_mission_editor: { version: '1.0' } };
  const read = (phases, more = {}) => { try { return MS.readMission({ ...base, ...more, phases }) } catch (e) { return { threw: String(e) } } };
  const keys = m => m.threw ? m.threw : (m.drawers || []).map(d => [d.id, d.key && d.key.kind, d.keyWhy, d.condition]);
  const byId = read([{ id: 'B', title: 'Zone', trigger_zone: 'ZONE-1', trigger_actor: 'OBJ-2', fallback_delay_min: 60, route_order: ['PT1', 'TARGET'] },
    { id: 'C', trigger_object: 'OBJ-1' },
    { id: 'D', trigger_condition: { kind: 'arrival', point: 'DESTINATION', radius_nm: 1, speed_max_kt: 30, require_on_ground: true, required_points: ['PT2'] } }]);
  const inPart = read([{ id: 'B', trigger_zone: { centre: { lat: 44.62, lon: 1.28 }, radius_km: 4 }, zone_shown: false },
    { id: 'C', trigger_object: { kind: 'raft', lat: 44.61, lon: 1.31, detection_range_nm: 0.3, require_confirmation: false } },
    { id: 'D', trigger_point: 'PT1', trigger_delay_min: 10 }]);
  const odd = read([{ id: 'B', trigger_condition: { kind: 'hover', object: 'OBJ-1' }, fallback_delay_min: 90 }, { id: 'C', trigger_zone: 'ZONE-9' },
    { id: 'D', trigger_zone: { centre: { lat: 44, lon: 1 }, radius_km: 1e9 } }, { id: 'E' }, { id: 'B' }, { id: 'Z' }]);
  const many = read(Array.from({ length: 14 }, (_, i) => ({ title: 'T' + (i + 1) })));
  const b = byId.threw ? {} : byId.drawers[0].key, c = byId.threw ? {} : byId.drawers[1].key, dd = byId.threw ? {} : byId.drawers[2].key;
  return { byId: keys(byId), zone: [b.shape, b.ceilingFt, b.shown, b.fallbackMin, b.actor && [b.actor.id, b.actor.moving, b.actor.motion.route.map(p => p.id)]],
    object: c.object && [c.object.rangeNm, c.object.heightFt, c.object.altitudeFt, c.object.confirm, c.object.moving],
    arrival: [dd.point, dd.at, dd.radiusNm, dd.speedMaxKt, dd.onGround, dd.required],
    route: byId.threw ? null : [byId.drawers[0].route.map(p => p.id), MS.missionFlight(byId).route.points.map(p => p.id)],
    inPart: keys(inPart), inPartKeys: inPart.threw ? null : [inPart.drawers[0].key.shape, inPart.drawers[0].key.shown, inPart.drawers[1].key.object.confirm, inPart.drawers[2].key],
    odd: keys(odd), oddRefused: odd.drawersRefused, oddFallback: odd.threw ? null : odd.drawers[0].key.fallbackMin,
    many: many.threw ? null : [many.drawers.map(d => d.id).join(''), many.drawers.map(d => d.rank), many.drawersRefused],
    hostile: [keys(read([{ id: 'B', trigger_zone: 'ZONE-1' }], { zones: 7 })), keys(read([{ id: 'B', trigger_object: 'OBJ-1' }], { objects: 'x', turning_points: { id: 'SEUL', lat: 1, lon: 1 } })),
      keys(read('texte')), keys(read([{ id: 'B', trigger_point: 'constructor' }]))],
    kinds: MS.OBJECT_KINDS, passage: MS.passageMin ? MS.passageMin(MS.readMission(base), 'PT1') : null } }"""


@case('N71', 'Mission reader, the drawers: the parts of a mission (`phases`) are read as drawers — the zone and the object cited by identifier '
      '(zones and objects at the top, the user\'s workshop) or written inside the part (the V3 editor), the geometry always resolved in the '
      'key; a zone crossed by a moving target; the arrival key (at the aerodrome, on the ground, slow, after a stop); a V2 part by the hour; '
      'a condition the reader does not read, a zone it cannot find or out of its bounds: the gesture alone, said, with its fallback hour; '
      'twelve drawers at most (B to M), each with its rank; a mission whose `zones` is not a list is read all the same', 'N', tags=('missions',),
      designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0440 (the ergonomist, 17 Nov 2026: « le lecteur doit lire LES DEUX formes […] Tu résous l\'identifiant en géométrie dans '
      '`key` […] un genre inconnu de condition = « geste seul », dit »); docs/technique/FORMAT_MISSION.md; the bench frame/lib/test/mission.html')
def n71(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    got = c.js(_DRAWERS_JS)
    c.eq(got['byId'], [['B', 'zone', '', ''], ['C', 'object', '', ''], ['D', 'arrival', '', 'arrival']], 'the three keys cited by identifier are read', what='keys by identifier')
    c.eq(got['zone'], [{'circle': {'lat': 44.62, 'lon': 1.28, 'radiusM': 4000}}, 3000, True, 60, ['OBJ-2', True, ['PT1', 'TARGET']]],
         'the zone of `zones` resolved in the key: its circle, its ceiling, shown by default, its fallback hour, the moving target that crosses it', what='the zone')
    c.eq(got['object'], [0.3, 800, 2500, True, False], 'the object of `objects`: range in NM, height and altitude in ft, « within range AND declared » by default', what='the object')
    c.eq(got['arrival'], ['DESTINATION', {'lat': 44.0, 'lon': 1.2}, 1, 30, True, [{'id': 'PT2', 'lat': 44.7, 'lon': 1.4}]], 'the arrival key, its place and its stop resolved', what='the arrival')
    c.eq(got['route'], [['PT1', 'TARGET'], ['PT1', 'TARGET']], 'the onward route of a drawer is resolved and never enters the mission\'s own route', what='routes')
    c.eq(got['inPart'], [['B', 'zone', '', ''], ['C', 'object', '', ''], ['D', 'time', '', '']], 'the same keys written inside the part, and a V2 part by the hour', what='keys in the part')
    c.eq(got['inPartKeys'], [{'circle': {'lat': 44.62, 'lon': 1.28, 'radiusM': 4000}}, False, False, {'kind': 'time', 'point': 'PT1', 'delayMin': 10}],
         'a hidden zone; an object found by range alone; the hour', what='the keys in the part')
    c.eq([got['odd'], got['oddRefused'], got['oddFallback']],
         [[['B', 'hand', 'condition', 'hover'], ['C', 'hand', 'zone', ''], ['D', 'hand', 'zone', ''], ['E', 'hand', '', '']], 2, 90],
         'a condition the reader cannot read, a zone that does not exist, a radius out of bounds: the gesture alone, said; a fourth drawer (E) is '
         'read; a duplicate and an id out of B to M are refused and counted; the fallback hour is kept', what='unreadable keys')
    c.eq(got['many'], ['BCDEFGHIJKLM', list(range(1, 13)), 2], 'twelve drawers at most, B to M, each with its rank (1 to 12: what the screen says); '
         'the thirteenth and the fourteenth are refused and counted', what='twelve drawers')
    c.eq(got['hostile'], [[['B', 'hand', 'zone', '']], [['B', 'hand', 'object', '']], [], [['B', 'hand', 'point', '']]],
         'a mission whose zones, objects or phases are not lists is read all the same; « constructor » is not a point', what='hostile lists')
    c.ok('aircraft' in (got['kinds'] or []) and 'raft' in got['kinds'] and got['passage'] == {'nm': 20, 'min': 10}, [got['kinds'], got['passage']],
         'the closed list of kinds; passageMin gives the distance and the estimated minutes to a point of part A')



@case('N72', 'Missions › editor: after typing in a field, ONE real click on another group opens it — what the finger is pressing is never '
      'redrawn (the groups\' buttons, the « À compléter » button and « Enregistrer » are the same elements before and after a keystroke and '
      'after leaving the field)', 'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0449 (17 Nov 2026, found while moving the editor\'s screen; the ergonomist: « on ne redessine pas ce que le doigt est en '
      'train de presser »): the step pills were replaced at every input and at every change — leaving a field of the Récit by pressing a '
      'pill redrew it between the press and the release, and the click was lost')
def n72(c):
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    reg_open(c, _REF_TEXTS)
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the editor')
    c.tap(f'{E} [data-steps] [data-step="story"]')
    c.until(f"!!document.querySelector('{E} [data-k=edstory][data-f=summary]')", what='the Récit unfolded')
    # the buttons are marked, then a field is typed in: the SAME elements must still be there (a redrawn button has lost its mark)
    c.js(f"document.querySelectorAll('{E} [data-steps] [data-step], {E} [data-do=edsave], {E} [data-do=edtodo], {E} [data-do=edcancel]').forEach(b => b.__kept = true)")
    c.page.fill(f'{E} [data-k=edstory][data-f=summary]', 'Un résumé retouché, puis un seul clic.')
    kept = c.js(f"[...document.querySelectorAll('{E} [data-steps] [data-step], {E} [data-do=edsave], {E} [data-do=edtodo], {E} [data-do=edcancel]')].map(b => !!b.__kept)")
    c.ok(len(kept) == 9 and all(kept), kept, 'the six groups\' buttons and the three buttons of the foot are the same elements after the keystrokes')
    line = c.js(f"document.querySelector('{E} [data-line=story]').textContent")
    c.ok('38' in line, line, 'and the line of the group follows the typing (38 signs)')
    # ONE real click (press and release of a pointer), straight from the field: the Lieux unfold
    c.page.click(f'{E} [data-steps] [data-step="places"]')
    c.until(f"!!document.querySelector('{E} [data-edplaces]')", timeout=3000, what='the Lieux unfolded by ONE click')
    c.eq(c.js(f"document.querySelector('{E}').dataset.step"), 'places', 'one click was enough', what='the open group')
    # the same from the Cadre: a title typed, one click on « Enregistrer » saves
    c.tap(f'{E} [data-steps] [data-step="cadre"]')
    c.until(f"!!document.querySelector('{E} input[data-k=edtitle]')", what='the Cadre unfolded')
    c.page.fill(f'{E} input[data-k=edtitle]', 'Mission complète, retouchée')
    c.page.click(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved by ONE click after typing')
    t = c.js(_TEXT_OF, 'missions/X_REG/X-001A/missionX-001A.yaml') or ''
    c.ok('title: Mission complète, retouchée' in t and 'Un résumé retouché, puis un seul clic.' in t, t[:300], 'both fields written')
    c.js(_REG_CLEAR)


_AT_MISSION = _REF_MISSION.replace('route_order: [ORIGIN, PT1, RDV-1, TARGET, PT2, GHOST, DESTINATION]', 'route_order: [ORIGIN, PT1, RDV-1, TARGET, PT2, DESTINATION]').replace(
    'teams:\n', "  - { id: C, title: Entrée du secteur, trigger_zone: ZONE-1, fallback_delay_min: 60 }\n"
    "  - { id: D, title: Retour, trigger_condition: { kind: arrival, point: DESTINATION, radius_nm: 1, speed_max_kt: 30, require_on_ground: true } }\nteams:\n", 1)
EDTX_FILE = 'modules/missions/editor_texts.js'
_AT_TEXTS = [_ED_TEXTS[0], ['missions/X_REG/X-001A/missionX-001A.yaml', _AT_MISSION]]
_AT_FLOW = f"[...document.querySelectorAll('{E} [data-atflow] [data-part]')].map(x => [x.dataset.kind, x.querySelector('b').textContent.trim()])"
_AT_LINES = f"Object.fromEntries([...document.querySelectorAll('{E} [data-line]')].map(x => [x.dataset.line, x.textContent.trim()]))"


@case('N73', 'Missions › the workshop: the editor in its new shape — the unfolding (« Au départ », then the drawers of the file by their rank, '
      'read as they are), the sheet of the departure in six groups that each say their content in one line (one unfolded at a time; all '
      'folded on a phone when a mission is modified, the Cadre unfolded on a wide screen and for a new mission), the foot « Enregistrer · '
      'À compléter (n) · Annuler » whose middle button opens the named list; the map folded behind its button on a phone; saving without '
      'touching anything writes nothing, and a change keeps the drawers of the file', 'N', tags=('missions',), designs=('standard',),
      screens=False, langs4=False,
      rule='SOG-0444, lot P1 (modules/missions/EDITOR.md « Porting the workshop », the mock-up modules/missions/maquette/atelier_*.png '
      'accepted by the ergonomist on 17 Nov 2026 with six corrections): one authoring tool — the six-step editor BECOMES the workshop')
def n73(c):
    path = 'missions/X_REG/X-001A/missionX-001A.yaml'
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    reg_open(c, _AT_TEXTS)
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the workshop')
    c.eq(c.js(_AT_FLOW), [['start', norm(row(c, 'atStart', EDTX_FILE))], ['drawer', f"{row(c, 'atDrawer', EDTX_FILE).replace('{n}', '1')} · Changement"],
                          ['drawer', f"{row(c, 'atDrawer', EDTX_FILE).replace('{n}', '2')} · Entrée du secteur"],
                          ['drawer', f"{row(c, 'atDrawer', EDTX_FILE).replace('{n}', '3')} · Retour"]],
         'the unfolding: the departure, then the three drawers of the file, said by their rank', what='the unfolding')
    c.eq(c.js(f"document.querySelector('{E}').dataset.step"), '', 'on a phone every group is folded', what='the open group')
    lines = c.js(_AT_LINES)
    c.ok(set(lines) == {'cadre', 'teams', 'places', 'story', 'risks', 'timeline'} and all(lines.values()) and 'XTST → XTSU' in lines['cadre'], lines,
         'each of the six groups says its content in one line (the Cadre: its family and « XTST → XTSU »)')
    c.eq(c.js(f"getComputedStyle(document.querySelector('{E} [data-atmapbody]')).display"), 'none', 'on a phone the map is folded behind its button', what='the map')
    c.tap(f'{E} [data-do="edmap"]')
    c.until(f"getComputedStyle(document.querySelector('{E} [data-atmapbody]')).display !== 'none'", what='the map unfolded by its button')
    c.ok(c.count(f'{E} [data-atmapbody] [data-edthumb]') == 1, 'no sketch', 'the sketch of the places in the map')
    c.tap(f'{E} [data-do="edmap"]')
    # the foot: « À compléter (n) » alone on a phone, a button that opens the named list
    btn = c.text(f'{E} [data-edtodobtn]')
    c.ok('(4)' in btn and c.js(f"getComputedStyle(document.querySelector('{E} [data-edtodobtn] .ms-attodofirst')).display") == 'none', btn,
         'the button says the count alone on a phone (never a cut text)')
    c.ok(c.js(f"getComputedStyle(document.querySelector('{E} [data-edtodo]')).display") == 'none', 'shown', 'the list is closed')
    c.tap(f'{E} [data-do="edtodo"]')
    c.until(f"!document.querySelector('{E} [data-edtodo]').hidden", what='the named list opened by the button')
    c.eq(c.js(_ED_TODO), ['theatre'], 'the one point of the departure to complete, named', what='the list')
    c.eq(c.js(f"[...document.querySelectorAll('{E} [data-edtodo] [data-dtodo]')].map(x => x.dataset.dtodo)"), ['1', '2', '3'],
         'then one line per drawer that has something to complete (SOG-0445)', what='the drawers to complete')
    seen = c.js(f"""(() => {{ const l = document.querySelector('{E} [data-edtodo]').getBoundingClientRect(), b = document.querySelector('{E} [data-edtodobtn]').getBoundingClientRect();
      return [l.height > 0 && l.top >= 0 && l.bottom <= b.top + 1, b.bottom <= innerHeight] }})()""")
    c.eq(seen, [True, True], 'the list opens ON SCREEN, just above its button (never at the end of a page that scrolls)', what='the list on screen')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N73_390_workshop.png')
    c.tap(f'{E} [data-do="edtodo"]')
    # a group unfolds by its name; touched again, it folds; one at a time
    c.tap(f'{E} [data-steps] [data-step="places"]')
    c.until(f"!!document.querySelector('{E} [data-edplaces]')", what='the Lieux unfolded')
    c.tap(f'{E} [data-steps] [data-step="risks"]')
    c.until(f"!!document.querySelector('{E} [data-edrisks]')", what='the Risques unfolded')
    c.eq(c.count(f'{E} [data-edform]'), 1, 'one group unfolded at a time', what='unfolded groups')
    c.tap(f'{E} [data-steps] [data-step="risks"]')
    c.until(f"!document.querySelector('{E} [data-edform]')", what='the group folded when touched again')
    # saving without touching anything writes nothing; a change keeps the drawers of the file as they are
    c.tap(f'{E} [data-do="edsave"]')
    c.wait(400)
    c.eq(c.js(_TEXT_OF, path), _AT_MISSION, 'nothing touched: the file is the same', what='the file')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")  # at 390 the toast covers the foot
    c.tap(f'{E} [data-steps] [data-step="story"]')
    c.until(f"!!document.querySelector('{E} [data-k=edstory][data-f=summary]')", what='the Récit unfolded')
    c.page.fill(f'{E} [data-k=edstory][data-f=summary]', 'Un résumé changé dans l’atelier.')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    kept = c.js("""async (p) => { if (!globalThis.jsyaml) await import('/frame/lib/js-yaml.min.js'); const MS = await import('/frame/lib/mission.js');
      const d = globalThis.jsyaml.load(await (%s)(p), { schema: globalThis.jsyaml.CORE_SCHEMA });
      return { summary: d.summary, keys: MS.readMission(d).drawers.map(x => [x.rank, x.key.kind]), zone: d.phases[1].trigger_zone } }""" % _TEXT_OF, path)
    c.eq(kept, {'summary': 'Un résumé changé dans l’atelier.', 'keys': [[1, 'time'], [2, 'zone'], [3, 'arrival']], 'zone': 'ZONE-1'},
         'the summary is written; the three drawers of the file are kept as they are', what='the saved file')
    # a wide screen: the sheet beside the map and the unfolding, the Cadre unfolded, the first point said in the foot
    c.tap(f'{E} [data-do="edcancel"]')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.until(_REG_READ, timeout=20000, what='back to the registry')
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} input[data-k=edtitle]')", timeout=10000, what='on a wide screen the Cadre is unfolded at the opening')
    c.ok(c.js(f"getComputedStyle(document.querySelector('{E} .ms-atgrid')).display") == 'grid' and
         c.js(f"getComputedStyle(document.querySelector('{E} [data-atmapbody]')).display") != 'none' and
         c.js(f"getComputedStyle(document.querySelector('{E} [data-do=edmap]')).display") == 'none', 'not side by side',
         'wide: the map (always shown, no button) and the unfolding on the left, the sheet on the right')
    c.ok(c.js(f"getComputedStyle(document.querySelector('{E} [data-edtodobtn] .ms-attodofirst')).display") != 'none', 'hidden',
         'wide: the foot also says the first point to complete')
    row_w = c.js(f"(() => {{ const r = document.querySelector('{E} .ms-atflowrow'); return [r.scrollWidth > r.clientWidth || r.children.length <= 4, getComputedStyle(r).flexWrap] }})()")
    c.eq(row_w[1], 'nowrap', 'the unfolding is ONE row (it scrolls sideways, it never wraps)', what='the row')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N73_1280_workshop.png')
    # a drawer keyed by an object in a mission that has none: the sheet says so and leads to the Lieux (SOG-0445, the ergonomist's reading)
    c.tap(f'{E} [data-atflow] [data-sel="B"]')
    c.until(f"!!document.querySelector('{E} [data-drawer] [data-f=key]')", what='the sheet of drawer 1')
    c.page.select_option(f'{E} [data-drawer] [data-f=key]', 'object')
    c.until(f"!!document.querySelector('{E} [data-drawer] [data-dwnone]')", what='nothing to choose is said')
    none = c.text(f'{E} [data-drawer] [data-dwnone]')
    c.ok(norm(row(c, 'dwNoObject', EDTX_FILE)) in norm(none) and c.count(f'{E} [data-drawer] [data-f=object]') == 0, none,
         '« Aucun objet dans cette mission — créez-le dans les Lieux », never an empty list')
    c.tap(f'{E} [data-drawer] [data-do="eddrplaces"]')
    c.until(f"!!document.querySelector('{E} [data-edplaces]')", what='the link opens the Lieux of the departure')
    c.eq(c.js(f"document.querySelector('{E}').dataset.step"), 'places', 'the Lieux are unfolded', what='the open group')
    # a new mission: the Cadre unfolded, no drawer, the unfolding alone with « Au départ »
    c.tap(f'{E} [data-do="edcancel"]')
    c.until(_REG_READ, timeout=20000, what='back to the registry')
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.tap(f'{R} [data-do="edcreate"]')
    c.until(f"!!document.querySelector('{E} input[data-k=edtitle]')", timeout=10000, what='a new mission opens on its Cadre, on a phone too')
    c.eq([c.count(f'{E} [data-atflow] [data-part]'), c.count(f'{E} [data-drawerskept]')], [1, 0], 'a new mission has its departure alone', what='the unfolding of a new mission')
    c.js(_REG_CLEAR)



_KEYREF_JS = """async () => { const ED = await import('/modules/missions/editor.js'), MS = await import('/frame/lib/mission.js'); const J = x => JSON.stringify(x);
  const base = { mission: { id: 'X-001A', type: 'REG' }, title: 'Clés',
    origin: { name: 'Base Test (XTST)', lat: 45, lon: 1 }, destination: { name: 'Base Test Sud (XTSU)', lat: 44, lon: 2 },
    turning_points: [{ id: 'PT1', name: 'Un', lat: 44.8, lon: 1.2 }, { id: 'PT2', name: 'Deux', lat: 44.4, lon: 1.6 }],
    zones: [{ id: 'ZONE-1', name: 'Secteur', kind: 'search', centre: { lat: 44.7, lon: 1.3 }, radius_km: 12 }],
    route_order: ['ORIGIN', 'PT1', 'PT2', 'DESTINATION'],
    phases: [{ id: 'B', title: 'Zone', trigger_zone: 'ZONE-1', zone_shown: false, fallback_delay_min: 60 },
      { id: 'C', title: 'Arrivée', trigger_condition: { kind: 'arrival', point: 'PT2', radius_nm: 1, speed_max_kt: 30, required_points: ['PT1', 'PT2'] } },
      { id: 'D', title: 'Dans la partie', trigger_zone: { centre: { lat: 44.7, lon: 1.3 }, radius_km: 3 } },
      { id: 'E', title: 'Suite', trigger_condition: { kind: 'sequence', steps: [{ kind: 'hover', point: 'PT1', radius_m: 50, duration_sec: 10, max_gap_sec: 2, speed_tolerance_kt: 5, height_min_ft: 0, height_max_ft: 50 },
        { kind: 'landing', point: 'PT2', radius_m: 30, duration_sec: 5, max_gap_sec: 2 }] } },
      { id: 'F', title: 'Retour', trigger_condition: { kind: 'arrival', point: 'DESTINATION', radius_nm: 1, speed_max_kt: 30 } }] };
  const rows = ED.placesOf(base), at = id => rows.findIndex(r => r.id === id), kinds = d => MS.readMission(d).drawers.map(x => [x.rank, x.key.kind, x.keyWhy]);
  const ren = rows.map(r => r.id === 'ZONE-1' ? { ...r, id: 'SECTEUR' } : r.id === 'PT2' ? { ...r, id: 'BRAVO' } : r), d1 = ED.withRefs(ED.withPlaces(base, ren), base, ren);
  const gone = rows.filter(r => r.id !== 'ZONE-1' && r.id !== 'PT2'), d2 = ED.withRefs(ED.withPlaces(base, gone), base, gone);
  return { refs: ED.refsOf(base).filter(r => r.where.startsWith('drawer')).map(r => [r.where, r.name, r.id]),
    same: ED.withRefs(base, base, rows) === base,
    renamed: { zone: d1.phases[0].trigger_zone, point: d1.phases[1].trigger_condition.point, stops: d1.phases[1].trigger_condition.required_points,
      steps: d1.phases[3].trigger_condition.steps.map(x => x.point), inPart: J(d1.phases[2]) === J(base.phases[2]), word: J(d1.phases[4]) === J(base.phases[4]),
      read: J(kinds(d1)) === J(kinds(base)), keys: kinds(base).map(x => x[1]) },
    citedZone: ED.citedBy(base, rows, at('ZONE-1')).map(c => [c.where, c.name, c.n]), citedPoint: ED.citedBy(base, rows, at('PT2')).map(c => [c.where, c.name, c.n]),
    removed: { b: d2.phases[0], c: d2.phases[1], steps: d2.phases[3].trigger_condition.steps, f: J(d2.phases[4]) === J(base.phases[4]), read: kinds(d2).slice(0, 2) },
    noKey: ED.drawersNoKey ? [ED.drawersNoKey(base), ED.drawersNoKey(d2)] : null, todo: ED.todo(d2).filter(t => t.key === 'drawerNoKey').map(t => [t.step, t.vars.name]),
    dead: ED.deadRefs({ ...base, phases: [{ id: 'B', trigger_zone: 'ZONE-9' }] }).map(r => [r.where, r.name, r.id]) } }"""


@case('N74', 'Missions › editor: the key of a drawer written by identifier follows the places — a renamed zone or point is renamed in '
      '`trigger_zone`, in the point of an arrival or of a condition (each step of a sequence) and in its required stops; « Retirer » a zone '
      'that a drawer\'s key cites first says so (« le tiroir 2 (sa clé…) »), then removes the key and keeps the fallback hour, and '
      '« À compléter » names the drawer left without its key; a zone written inside the part and the words DESTINATION / ORIGIN are never '
      'touched; nothing touched, the document is the same object', 'N', tags=('missions', 'security'), designs=('standard',), screens=False,
      langs4=False,
      rule='SOG-0445, lot P3, first brick (modules/missions/EDITOR.md § 5: « a drawer\'s zone and object are references like the others »; '
      'docs/technique/FORMAT_MISSION.md § 3: by identifier, at the top — Q-0095): since the reader reads a key by identifier (SOG-0440), '
      'renaming or removing its zone in the Lieux left the drawer with a dead key, silently')
def n74(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    r = c.js(_KEYREF_JS)
    c.eq(r['refs'], [['drawerKey', '1', 'ZONE-1'], ['drawerKey', '2', 'PT2'], ['drawerStop', '2', 'PT1'], ['drawerStop', '2', 'PT2'],
                     ['drawerKey', '4', 'PT1'], ['drawerKey', '4', 'PT2'], ['drawerKey', '5', 'DESTINATION']],
         'the references of the drawers\' keys, by rank (a zone written inside the part cites nothing)', what='refsOf')
    c.ok(r['same'] is True, r['same'], 'nothing touched: the document is the same object (audit 182)')
    c.eq(r['renamed'], {'zone': 'SECTEUR', 'point': 'BRAVO', 'stops': ['PT1', 'BRAVO'], 'steps': ['PT1', 'BRAVO'], 'inPart': True, 'word': True, 'read': True,
                        'keys': ['zone', 'arrival', 'zone', 'condition', 'arrival']},
         'a rename is followed by the zone of a key, the point of an arrival, its stops, the steps of a sequence; the reader reads the same keys', what='after a rename')
    c.eq(r['citedZone'], [['drawerKey', '1', 1]], 'the zone is cited by the key of drawer 1', what='citedBy the zone')
    c.eq(r['citedPoint'], [['route', '', 1], ['drawerKey', '2', 1], ['drawerStop', '2', 1], ['drawerKey', '4', 1]], 'the point: the route, a key, a stop, a step',
         what='citedBy the point')
    c.eq(r['removed'], {'b': {'id': 'B', 'title': 'Zone', 'zone_shown': False, 'fallback_delay_min': 60},
                        'c': {'id': 'C', 'title': 'Arrivée', 'trigger_condition': {'kind': 'arrival', 'radius_nm': 1, 'speed_max_kt': 30, 'required_points': ['PT1']}},
                        'steps': [{'kind': 'hover', 'point': 'PT1', 'radius_m': 50, 'duration_sec': 10, 'max_gap_sec': 2, 'speed_tolerance_kt': 5, 'height_min_ft': 0,
                                   'height_max_ft': 50}, {'kind': 'landing', 'radius_m': 30, 'duration_sec': 5, 'max_gap_sec': 2}], 'f': True,
                        'read': [[1, 'hand', ''], [2, 'hand', 'condition']]},
         'a removed zone: the key goes, the fallback hour and « zone montrée » stay; a removed point: the condition stays without it (the reader: by hand)',
         what='after a removal')
    c.eq(r['noKey'], [[], ['1', '2']], 'the drawers left without their key, by rank', what='drawersNoKey')
    c.eq(r['todo'], [['places', '1'], ['places', '2']], '« À compléter » names them', what='todo')
    c.eq(r['dead'], [['drawerKey', '1', 'ZONE-9']], 'a key that cites a zone the mission does not have is a dead reference, named', what='deadRefs')
    # on screen: « Retirer » the zone of drawer 2's key
    path = 'missions/X_REG/X-001A/missionX-001A.yaml'
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    reg_open(c, _AT_TEXTS)
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the workshop')
    c.tap(f'{E} [data-steps] [data-step="places"]')
    c.until(f"!!document.querySelector('{E} [data-edplaces]')", what='the Lieux')
    i = c.js(_PLACE_AT, 'ZONE-1')
    c.tap(f'{E} [data-place="{i}"] [data-do="edplace"]')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.tap(f'{E} [data-plform="{i}"] [data-do="edplacedel"]')
    c.settle()
    c.ok(c.js(_PLACE_AT, 'ZONE-1') == i, c.js(_PLACES_JS), 'a zone cited by a drawer\'s key is not removed at the first press')
    note = norm(c.js(_NOTES))
    c.ok('ZONE-1' in note and norm(row(c, 'ref_drawerKey', EDTX_FILE).replace('{name}', '2')) in note, note,
         'the notification says who cites it: the drawer 2, its key')
    c.shot('N74_390_cited.png')
    c.wait(1100)
    c.tap(f'{E} [data-plform="{i}"] [data-do="edplacedel"]')
    c.eq(c.js(_PLACE_AT, 'ZONE-1'), -1, 'the second press removes the zone', what='the zone row')
    c.ok('drawerNoKey' in c.js(_ED_TODO) and ' 2 ' in c.js(_ED_TODO_TEXT), c.js(_ED_TODO_TEXT), '« À compléter » names the drawer 2, left without its key')
    key2 = c.js(f"document.querySelector('{E} [data-atflow] [data-part=\"2\"]').textContent")
    c.ok(norm(row(c, 'atKey_hand', EDTX_FILE)) in norm(key2), key2, 'the unfolding says the key of drawer 2 as it is now: the pilot\'s gesture')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    got = c.js("""async (p) => { if (!globalThis.jsyaml) await import('/frame/lib/js-yaml.min.js');
      const d = globalThis.jsyaml.load(await (%s)(p), { schema: globalThis.jsyaml.CORE_SCHEMA });
      return { parts: d.phases.slice(1), zones: 'zones' in d } }""" % _TEXT_OF, path)
    c.eq(got, {'parts': [{'id': 'C', 'title': 'Entrée du secteur', 'fallback_delay_min': 60},
                         {'id': 'D', 'title': 'Retour', 'trigger_condition': {'kind': 'arrival', 'point': 'DESTINATION', 'radius_nm': 1, 'speed_max_kt': 30,
                                                                             'require_on_ground': True}}], 'zones': False},
         'the file: the key of the part is gone with its zone, its fallback hour is kept; the other part is untouched', what='the saved file')
    c.js(_REG_CLEAR)



_DROWS_JS = """async () => { const ED = await import('/modules/missions/editor_drawers.js'), MS = await import('/frame/lib/mission.js'); const J = x => JSON.stringify(x);
  const base = { mission: { id: 'X-001A', type: 'REG' }, title: 'Tiroirs', cruise_speed_kt: 120,
    origin: { name: 'Base Test (XTST)', lat: 45, lon: 1 }, destination: { name: 'Base Test Sud (XTSU)', lat: 44, lon: 2 },
    turning_points: [{ id: 'PT1', name: 'Un', lat: 44.8, lon: 1.2 }, { id: 'PT2', name: 'Deux', lat: 44.4, lon: 1.6 }],
    zones: [{ id: 'ZONE-1', name: 'Secteur', kind: 'search', centre: { lat: 44.7, lon: 1.3 }, radius_km: 12 }],
    objects: [{ id: 'OBJ-1', kind: 'person', name: 'Naufragé', lat: 44.61, lon: 1.31, detection_range_nm: 0.3 }],
    route_order: ['ORIGIN', 'PT1', 'PT2', 'DESTINATION'],
    phases: [{ id: 'B', title: 'Heure', trigger: '10 min après PT1', trigger_point: 'PT1', trigger_delay_min: 10, message: 'Un message.', brief: 'Ligne un.\\nLigne deux.',
        route_order: ['PT1', { id: 'PT2', hold: 5 }, 'DESTINATION'] },
      'une valeur nue',
      { id: 'C', title: 'Zone', trigger_zone: 'ZONE-1', zone_shown: false, fallback_delay_min: 60, x_mission_editor: { a: 1 } },
      { id: 'C', title: 'Doublon' },
      { id: 'D', title: 'Objet', trigger_object: 'OBJ-1' },
      { id: 'E', title: 'Arrivée', trigger_condition: { kind: 'arrival', point: 'DESTINATION', radius_nm: 1, speed_max_kt: 30, require_on_ground: true, required_points: ['PT2'], extra: 'gardé' } },
      { id: 'F', title: 'Dans la partie', trigger_zone: { centre: { lat: 44.7, lon: 1.3 }, radius_km: 3 } },
      { id: 'G', title: 'Tenue', trigger_condition: { kind: 'hover', point: 'PT1' } },
      { id: 'H', title: 'Geste' }] };
  const rows = ED.drawerRowsOf(base), on = (id, f) => rows.map(r => r.id === id ? f(r) : r), w = r => ED.withDrawerRows(base, r);
  const d1 = w(on('C', r => ({ ...r, title: 'Zone retouchée' }))), added = ED.blankDrawer(rows, base);
  const d8 = w([...rows.filter(r => r.id !== 'D'), { ...added, title: 'Neuf', message: 'Message.', key: 'zone', zone: 'ZONE-1', shown: true, fallback: '45', route: ['PT2'] }]);
  const d6 = w(rows.map(r => r.id === 'B' ? { ...r, delay: '5000' } : r.id === 'C' ? { ...r, fallback: '-3' } : r));
  let many = [], threw = '';
  for (let n = 0; n < 14; n++) { const b = ED.blankDrawer(many, {}); if (b) many.push(b) }
  for (const bad of [null, 7, 'x', [], { phases: 7 }, { phases: [null, 3, [], { id: '__proto__' }, { id: 'constructor' }] }])
    try { ED.drawerRowsOf(bad); ED.withDrawerRows(bad, [{ i: -1, id: '__proto__' }, null, 5]); ED.drawersTodo(bad) } catch (e) { threw += J(bad) + ' ' + e + ' | ' }
  return { rows: rows.map(r => [r.i, r.id, r.key, r.keptWhy]), ranks: J(rows.map(r => r.id)) === J(MS.readMission(base).drawers.map(d => d.id)),
    slots: MS.drawerSlots(base).map(x => x.i + x.id).join(' '),
    time: [rows[0].point, rows[0].delay, rows[0].said, rows[0].brief, rows[0].route], zone: [rows[1].zone, rows[1].shown, rows[1].fallback],
    arrival: [rows[3].arrPoint, rows[3].arrRadius, rows[3].arrSpeed, rows[3].arrGround, rows[3].stops],
    same: J(w(rows)) === J(base), one: J(d1.phases[2]) === J({ ...base.phases[2], title: 'Zone retouchée' }) && [0, 1, 3, 4, 5, 6, 7, 8].every(i => J(d1.phases[i]) === J(base.phases[i])),
    route: w(on('B', r => ({ ...r, route: ['PT2', 'DESTINATION'] }))).phases[0].route_order,
    toHand: w(on('C', r => ED.withKey(r, 'hand'))).phases[2],
    toArrival: w(on('H', r => ({ ...ED.withKey(r, 'arrival'), arrPoint: 'DESTINATION', arrRadius: '2', arrSpeed: '40', arrGround: true, fallback: '90' }))).phases[8],
    arrivalKept: w(on('E', r => ({ ...r, arrRadius: '3', stops: [] }))).phases[5].trigger_condition,
    bounds: ['trigger_delay_min' in d6.phases[0], 'fallback_delay_min' in d6.phases[2]],
    kept: J(w(on('F', r => ({ ...r, title: 'Autre' }))).phases[6]) === J({ id: 'F', title: 'Autre', trigger_zone: base.phases[6].trigger_zone }),
    added: [added.id, added.i, added.key], order: d8.phases.map(p => typeof p === 'string' ? 'nue' : p.id + (p.title === 'Doublon' ? '*' : '')), fresh: d8.phases[8],
    next: ED.nextDrawerId(rows.filter(r => r.id !== 'D'), base), read: MS.readMission(d8).drawers.map(d => [d.rank, d.id, d.key.kind]),
    twelve: [many.length, many.map(r => r.id).join(''), ED.withDrawerRows({}, [...many, { i: -1, id: 'B', title: 'en trop' }]).phases.length],
    none: 'phases' in ED.withDrawerRows({ phases: [{ id: 'B' }] }, []), hostile: J(ED.withDrawerRows({}, [{ i: -1, id: '__proto__', title: 'x' }])), threw,
    todo: ED.drawersTodo(base).map(t => t.name + ':' + t.key).join(' '),
    blank: ED.drawerRowsOf({ phases: [{ id: 'B', trigger_delay_min: ' ', fallback_delay_min: '  ' }] }).map(r => [r.delay, r.fallback]),
    hidden: (() => { const doc = { phases: [{ id: 'B', title: 'Ti\u202Etre\u200B\u206A\uFFF9', message: 'a\u2066b\u200Dc fin\u202F!' }] }, rows = ED.drawerRowsOf(doc),
      d = ED.withDrawerRows(doc, [{ ...rows[0], message: 'x\u202Ey' }]);
      return [rows[0].title, rows[0].message, J(ED.withDrawerRows(doc, rows)) === J(doc), d.phases[0].message, d.phases[0].title === doc.phases[0].title] })(),
    clone: ED.withDrawerRows(base, rows) !== base } }"""


@case('N75', 'Missions › the workshop, the drawers as rows (pure part, no screen): each part of the file the reader accepts is one row '
      '(its place, its letter, its texts, its key in fields — hour, passage zone, object, arrival, the pilot\'s gesture — its fallback '
      'hour, its onward route); a key the workshop does not edit is shown and kept as it is; nothing touched, the same document; one field '
      'changed, that field alone; another key removes the fields of the former one; a number out of its bounds is never written; a new '
      'drawer takes the first free letter (never one the file still carries), twelve at most; the parts the reader refuses stay in place',
      'N', tags=('missions', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0445, lot P3 (modules/missions/EDITOR.md § 7 quater; docs/technique/FORMAT_MISSION.md § 2 to § 5; audit 182: only what the '
      'author changed is written): modules/missions/editor_drawers.js, and drawerSlots of frame/lib/mission.js — the one rule of '
      'acceptance of the parts, shared by the reader and the workshop')
def n75(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    r = c.js(_DROWS_JS)
    c.eq(r['rows'], [[0, 'B', 'time', ''], [2, 'C', 'zone', ''], [4, 'D', 'object', ''], [5, 'E', 'arrival', ''], [6, 'F', 'kept', 'inPart'],
                     [7, 'G', 'kept', 'condition'], [8, 'H', 'hand', '']], 'seven drawers; the bare value and the duplicate are not rows', what='the rows')
    c.ok(r['ranks'] is True and r['slots'] == '0B 2C 4D 5E 6F 7G 8H', [r['ranks'], r['slots']], 'the rows are the reader\'s drawers, in its order (drawerSlots)')
    c.eq(r['time'], ['PT1', '10', '10 min après PT1', 'Ligne un.\nLigne deux.', ['PT1', 'PT2', 'DESTINATION']], 'the hour: its point, its delay, its words; the briefing keeps its lines',
         what='the row of the hour')
    c.eq([r['zone'], r['arrival']], [['ZONE-1', False, '60'], ['DESTINATION', '1', '30', True, ['PT2']]], 'the zone and the arrival, in fields', what='zone, arrival')
    c.ok(r['same'] is True and r['one'] is True, [r['same'], r['one']], 'nothing touched: the same document; one title changed: that field alone, every other part identical')
    c.eq(r['route'], [{'id': 'PT2', 'hold': 5}, 'DESTINATION'], 'the onward route rewritten from its words: an entry kept keeps its other keys', what='route_order')
    c.eq(r['toHand'], {'id': 'C', 'title': 'Zone', 'x_mission_editor': {'a': 1}}, 'zone → gesture: the key and the fallback hour go, the rest stays', what='another key')
    c.eq(r['toArrival'], {'id': 'H', 'title': 'Geste', 'trigger_condition': {'kind': 'arrival', 'point': 'DESTINATION', 'radius_nm': 2, 'speed_max_kt': 40,
                                                                           'require_on_ground': True}, 'fallback_delay_min': 90}, 'gesture → arrival', what='a new key')
    c.eq(r['arrivalKept'], {'kind': 'arrival', 'point': 'DESTINATION', 'radius_nm': 3, 'speed_max_kt': 30, 'require_on_ground': True, 'extra': 'gardé'},
         'an arrival changed keeps its other keys; its stops emptied leave the file', what='the condition')
    c.eq(r['bounds'], [False, False], 'a delay of 5 000 min and a fallback of −3 are not written (never brought back into the bounds)', what='out of bounds')
    c.ok(r['kept'] is True, r['kept'], 'a key kept as it is (a zone written inside the part) stays when the title changes')
    c.eq([r['added'], r['next']], [['I', -1, 'hand'], 'I'], 'a new drawer: the first free letter; a letter removed in this sitting is not taken again', what='the new letter')
    c.eq(r['order'], ['B', 'nue', 'C', 'C*', 'E', 'F', 'G', 'H', 'I'], 'D removed, one added: the letters stay, the new one last, the refused parts in place', what='phases')
    c.eq(r['fresh'], {'id': 'I', 'title': 'Neuf', 'message': 'Message.', 'trigger_zone': 'ZONE-1', 'zone_shown': True, 'fallback_delay_min': 45, 'route_order': ['PT2']},
         'the new part, by identifier (never a zone written inside it)', what='the new part')
    c.eq(r['read'], [[1, 'B', 'time'], [2, 'C', 'zone'], [3, 'E', 'arrival'], [4, 'F', 'zone'], [5, 'G', 'hand'], [6, 'H', 'hand'], [7, 'I', 'zone']],
         'the reader reads the result: the ranks close up', what='read back')
    c.eq(r['twelve'], [12, 'BCDEFGHIJKLM', 12], 'twelve drawers at most, B to M', what='twelve')
    c.ok(r['none'] is False and r['hostile'] == '{}' and r['threw'] == '', [r['none'], r['hostile'], r['threw']],
         'every drawer removed: `phases` leaves the file; a hostile letter writes nothing; no hostile input throws')
    c.eq(r['blank'], [['', '']], 'a blank text in a number of the file is not zero', what='blank numbers')
    c.eq(r['hidden'], ['Titre', 'ab\u200dc fin\u202f!', True, 'xy', True],
         'the invisible format characters (direction overrides, zero-width space, deprecated formats, annotations) leave what the workshop shows and writes — the joiner and the '
         'narrow no-break space stay; a text of the file the author does not touch is kept as it is', what='format characters')
    c.ok(r['clone'] is True, r['clone'], 'nothing touched: a COPY of equal content (never the object received)')
    c.eq(r['todo'], '2:noMessage 2:noBrief 3:noFallback 3:noMessage 3:noBrief 4:noFallback 4:noMessage 4:noBrief 5:noFallback 5:noMessage 5:noBrief '
         '6:keyUnread 6:noMessage 6:noBrief 7:noMessage 7:noBrief', 'what each drawer has to complete, by rank', what='drawersTodo')


# SOG-0441 (lot T2): the « Tiroirs » section, its view mounted in a bare page with a fake frame (documents in memory)
@case('N81', 'Missions bench: the « Tiroirs » section — a browsed mission says only « Tiroirs : n »; the pilot\'s own mission shows each '
      'drawer, its key in words, « Ouvrir le tiroir » in two steps, the opening on time with its note, another pilot\'s record', 'N',
      tags=('missions',), designs=('standard',), screens=False,
      rule='SOG-0441 T2: the section is whole only for MY mission (assigned to me, or the mission of my current flight); a closed drawer '
      'shows neither message nor briefing; the gesture writes the pilot\'s own record only, after a second touch within five seconds; a '
      'drawer that opens while the sheet is shown is announced once; another pilot\'s finding opens it for all and is kept on the device, '
      'his gesture opens it for him only and is said, a refused opening is said with its author; « Resceller » at the Full level only')
def n81(c):
    c.page.goto(f'{c.base}/modules/missions/test/drawers_view.html', wait_until='load')
    try:
        c.page.wait_for_function('window.__bench && window.__bench.done', timeout=60000)
    except Exception:
        raise Fail('the bench never reported done (window.__bench.done)', 'a finished bench', 'modules/missions/test/drawers_view.html') from None
    r = c.js('({ pass: window.__bench.pass, fail: window.__bench.fail, rows: window.__bench.rows })')
    c.ok(r['fail'] == 0 and r['pass'] >= 64, f"{r['pass']} passed, {r['fail']} failed. First failures: {(r['rows'] or [])[:3]}",
         'every check of the bench passes (64 at least)')

# SOG-0441 (lot T2): the « Tiroirs » section on the mission sheet. Invented missions X-90x (no real mission, no AIP content).
DW = 'modules/missions/drawers_view.js'
_DW_REGISTRY = """missions:
  - { id: X-901A, family: TESTTIROIR, title: Recherche en mer, folder: X_TIR/X-901A, files: [missionX-901A.yaml] }
  - { id: X-902A, family: TESTTIROIR, title: Transport simple, folder: X_TIR/X-902A, files: [missionX-902A.yaml] }
  - { id: X-903A, family: TESTTIROIR, title: Ravitaillement, folder: X_TIR/X-903A, files: [missionX-903A.yaml] }
"""
_DW_MISSION = """mission: { id: X-901A, type: SAR, subtype: RECHERCHE }
title: Recherche en mer
summary: Un voilier inventé a lancé un appel de détresse. Décollez, la suite vous sera donnée en vol.
origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
destination: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
aircraft: [{ type: EC25, cruise_level: 1500 ft, cruise_speed_kt: 120 }]
turning_points:
  - { id: PT1, lat: 44.75, lon: 1.25 }
zones:
  - { id: ZONE-9, name: Zone de travail, kind: mission, centre: { lat: 44.7, lon: 1.2 }, radius_km: 5 }
route_order: [ORIGIN, PT1, DESTINATION]
phases:
  - id: B
    title: Nouvel ordre du centre
    message: "Echo radar au nord, descendez voir."
    brief: Altitude de recherche 500 ft.
    trigger_point: ORIGIN
    trigger_delay_min: 40
  - id: C
    title: Secteur de recherche
    message: "Cherchez un radeau orange."
    brief: Balayage en créneaux.
    trigger_zone: { centre: { lat: 44.62, lon: 1.28 }, radius_km: 4 }
    fallback_delay_min: 90
  - id: D
    title: Retour <img src=x onerror="window.__pwn=1">
    message: "Mission terminée, retour à la base."
    brief: Rendez compte à l'arrivée.
"""
_DW_OTHER = """mission: { id: X-903A, type: TRANSPORT }
title: Ravitaillement
summary: Une mission que ce pilote ne joue pas.
zones:
  - { id: ZONE-8, name: Zone de dépose, kind: mission, centre: { lat: 44.1, lon: 1.9 }, radius_km: 3 }
phases:
  - { id: B, title: Titre secret, message: "Message secret.", trigger_point: ORIGIN, trigger_delay_min: 5 }
"""
_DW_CLEAR = """async () => { if (!(await indexedDB.databases()).some(d => d.name === 'sogFrame')) return false; const db = await new Promise((res, rej) => { const r = indexedDB.open('sogFrame'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
  for (const st of ['pending', 'docs']) { if (!db.objectStoreNames.contains(st)) continue;
    const keys = await new Promise(res => { const q = db.transaction(st).objectStore(st).getAllKeys(); q.onsuccess = () => res(q.result); q.onerror = () => res([]) });
    const t = db.transaction(st, 'readwrite'); for (const k of keys) if (/^(missions\\/|pilot\\/[A-Z]{3}\\/missions\\/|cache\\/missions\\/)/.test(String(k))) t.objectStore(st).delete(k);
    await new Promise(res => { t.oncomplete = res; t.onerror = res }) }
  db.close(); return true }"""


@case('N82', 'Missions: the « Tiroirs » section of the sheet — my assigned mission shows its drawers closed, in order (one gesture, on the '
      'first closed one; the next say « après le tiroir n »), another pilot\'s gesture said, « Ouvrir le tiroir » in two steps writes my record; '
      'a mission I only browse says « Tiroirs : n »',
      'N', tags=('missions',), designs=('standard',), langs4=True,
      rule='SOG-0441 T2 (SPEC_MISSIONS_TIROIRS § 5): in HIS mission the pilot reads one drawer per line — closed: its title and its key in '
      'words (« heure estimée »; the fallback time only when it concerns him: no live position on the flight of the mission, a key the device does not follow), neither message nor briefing; « Ouvrir le tiroir » asks a '
      'second touch, then writes pilot/<TRI>/missions/<ID>.json and shows how and when it opened, its message and its briefing; the gesture '
      'of another pilot of the mission opens for him only and is said; a mission that is not his says only « Tiroirs : n »; a title is text')
def n82(c):
    import datetime
    import json
    at = lambda m: (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=m)).strftime('%Y-%m-%dT%H:%M:%SZ')
    off = at(-30)                                  # the assigned take-off, thirty minutes ago: B is due in ten minutes
    idx = {'updatedAt': at(0), 'assignments': [
        {'mission': 'X-901A', 'title': 'Recherche en mer', 'pilot': 'ABC', 'callsign': 'TEST31', 'takeoff': off, 'status': 'affectée', 'role': 'mission'},
        {'mission': 'X-901A', 'title': 'Recherche en mer', 'pilot': 'XYZ', 'callsign': 'TEST32', 'takeoff': off, 'status': 'affectée', 'role': 'mission'}]}
    peer = {'schema': 1, 'mission': 'X-901A', 'seance': f'A:{off[:10]}', 'drawer_B': {'state': 'open', 'at': at(-5), 'how': 'hand'}, 'by': 'XYZ'}
    BOOK = 'pilot/ABC/missions/X-901A.json'
    S = f'{M} [data-drawers]'
    row = lambda k: tx(DW, k, c.lang)
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    c.js(_DW_CLEAR)
    c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _DW_REGISTRY], ['missions/X_TIR/X-901A/missionX-901A.yaml', _DW_MISSION],
                     ['missions/X_TIR/X-902A/missionX-902A.yaml', mission_doc('X-902A')], ['missions/X_TIR/X-903A/missionX-903A.yaml', _DW_OTHER],
                     ['missions/affectations.json', json.dumps(idx)]])
    c.open('missions', wait=False, app='company', docs=[['pilot/XYZ/missions/X-901A.json', peer, 'document']])
    c.until(f"!!document.querySelector('{M} [data-list] [data-id=\"X-901A\"]')", timeout=20000, what='the list')

    def sheet(mid):
        """Opens the sheet of a mission from the list (back to the list first)."""
        if c.js(f"!!document.querySelector('{M} [data-do=back]')"):
            c.tap(f'{M} [data-do="back"]')
            c.until(f"!!document.querySelector('{M} [data-pane=list]')", timeout=8000, what='back to the list')
        if c.js(f"!document.querySelector('{M} [data-list] [data-id=\"{mid}\"]') && !!document.querySelector('{M} [data-do=more]')"):
            c.tap(f'{M} [data-do="more"]')
        c.tap(f'{M} [data-list] [data-id="{mid}"]')
        c.until(f"document.querySelector('{M} .ms-sheet')?.dataset.id === '{mid}'", timeout=10000, what=f'the sheet of {mid}')

    # my assigned mission: three drawers, closed; the order — only the first closed drawer can open
    sheet('X-901A')
    c.until(f"document.querySelectorAll('{S} [data-dw]').length === 3", timeout=10000, what='the three drawers of my mission')
    c.eq(c.js(f"[...document.querySelectorAll('{S} [data-dw]')].map(e => e.dataset.dw + (e.dataset.open || ''))"), ['B', 'C', 'D'], 'three drawers, all closed', what='drawers')
    c.eq(norm(c.text(f'{S} h3')), norm(row('head')), 'the section is titled', what='title')
    nth = lambda n: norm(row('drawerN').replace('{n}', str(n)))
    after = lambda n: norm(row('afterDrawer').replace('{n}', str(n)))
    kb = norm(c.text(f'{S} [data-dw="B"] [data-dw-key]'))
    c.ok(norm(row('estimated')) in kb and re.search(r'\d\d:\d\dZ', kb) is not None, kb, 'drawer 1: its time, said « heure estimée » (the take-off is the planned one)')
    c.ok(norm(c.text(f'{S} [data-dw="C"] .dw-top')) == nth(2) + ' · Secteur de recherche' and c.count(f'{S} [data-dw] .dw-ico') == 3,
         c.text(f'{S} [data-dw="C"] .dw-top'), 'the mock-up: « Tiroir 2 · Titre » (a rank, never a letter) and an envelope on each closed drawer')
    c.eq([norm(c.text(f'{S} [data-dw="{d}"] [data-dw-after]')) for d in 'CD'], [after(1), after(2)],
         'the order: the next drawers say « après le tiroir n », neither key nor gesture', what='locked drawers')
    c.eq(c.js(f"[...document.querySelectorAll('{S} [data-dw-open]')].map(b => b.dataset.dwOpen)"), ['B'],
         '« Ouvrir le tiroir » is offered on the first closed drawer only', what='gestures')
    page = c.text(S)
    c.ok('Echo radar' not in page and 'radeau' not in page and 'Rendez compte' not in page and c.count(f'{S} [data-dw-text]') == 0, page[:200],
         'a closed drawer shows neither its message nor its briefing')
    c.ok(c.js('window.__pwn') is None and c.count(f'{S} img') == 0 and '<img' in c.text(f'{S} [data-dw="D"]'), c.text(f'{S} [data-dw="D"]'),
         'a title is shown as text, never interpreted')
    c.ok(norm(c.text(f'{S} [data-dw="B"] [data-dw-hand="XYZ"]')).startswith('XYZ') and c.count(f'{S} [data-dw="B"][data-open]') == 0,
         c.text(f'{S} [data-dw="B"]'), 'the gesture of another pilot of the mission: said, the drawer stays closed here')
    c.ok(c.js(f"(() => {{ const z = document.querySelector('{M} .ms-first [data-zones]'); return !!z && getComputedStyle(z).display === 'none' }})()"),
         c.text(f'{M} .ms-first'), 'in MY mission the « Tiroirs » section takes the place of the zones line of the first page (the zones stay in Détail)')
    c.js(f"document.querySelector('{S}').scrollIntoView({{block: 'start'}})")
    c.shot(f'N82_{c.design}_{c.width}_{c.lang}_closed.png')
    # the gesture, in two steps, on the first drawer
    c.tap(f'{S} [data-dw-open="B"]')
    c.eq(norm(c.text(f'{S} [data-dw-open="B"]')), norm(row('confirm')), 'first touch: « Confirmer », nothing opened', what='armed')
    c.ok(c.doc(BOOK) is None and c.count(f'{S} [data-dw="B"][data-open]') == 0, c.doc(BOOK), 'nothing written at the first touch')
    c.tap(f'{S} [data-dw-open="B"]')
    book = c.until_doc(BOOK, lambda d: d and d.get('drawer_B', {}).get('state') == 'open', what='my record carries the drawer B open')
    c.ok(book['drawer_B']['how'] == 'hand' and book['seance'] == f'A:{off[:10]}' and book['by'] == 'ABC' and 'drawer_C' not in book and 'drawer_D' not in book,
         book, 'my record: the drawer, by hand, the play, the author — the other drawers untouched')
    c.until(f"document.querySelector('{S} [data-dw=\"B\"]')?.dataset.open === 'hand'", timeout=6000, what='the drawer 1 is open on screen')
    t = c.text(f'{S} [data-dw="B"]')
    c.ok('Echo radar' in t and 'Altitude de recherche' in t and re.search(r'\d\d:\d\dZ', t) is not None and c.count(f'{S} [data-dw-open="B"]') == 0, t,
         'open: how and when, its message and its briefing, no gesture left')
    # the second drawer is now the first closed one: its key, the pilot's sentence, the only gesture
    kc = norm(c.text(f'{S} [data-dw="C"] [data-dw-key]'))
    note = norm(c.text(f'{S} [data-dw="C"] [data-dw-note]'))
    c.ok(kc == norm(row('keyZone')) and note.startswith(norm(row('noLive').split('{x}')[0])) and re.search(r'\d\d:\d\dZ', note) is not None
         and 'H +' not in note, [kc, note],
         'drawer 2: « s\'ouvre au passage de la zone montrée sur la Carte », and the pilot\'s sentence — no live position here (no started flight of this mission): the fallback hour first, once')
    c.eq(c.js(f"[...document.querySelectorAll('{S} [data-dw-open]')].map(b => b.dataset.dwOpen)"), ['C'], 'the gesture moved to drawer 2', what='gestures')
    c.eq(norm(c.text(f'{S} [data-dw="D"] [data-dw-after]')), after(2), 'drawer 3 still waits for drawer 2', what='drawer 3')
    c.eq(c.doc('pilot/XYZ/missions/X-901A.json').get('drawer_B', {}).get('how'), 'hand', 'another pilot\'s record is never written', what='the other record')
    c.js(f"document.querySelector('{S}').scrollIntoView({{block: 'start'}})")
    c.shot(f'N82_{c.design}_{c.width}_{c.lang}_open.png')
    # a mission I only browse: one line, nothing of its drawers; a mission without drawers: no section
    sheet('X-903A')
    c.until(f"!!document.querySelector('{S} [data-dw-count]')", timeout=8000, what='the line « Tiroirs : 1 »')
    t = c.text(f'{M} .ms-sheet')
    c.ok('1' in c.text(f'{S} [data-dw-count]') and 'secret' not in t and c.count(f'{S} [data-dw]') == 0 and c.count(f'{S} button') == 0, t[-200:],
         'a browsed mission: « Tiroirs : 1 », neither title, nor key, nor gesture')
    c.ok(c.js(f"(() => {{ const z = document.querySelector('{M} .ms-first [data-zones]'); return !!z && getComputedStyle(z).display !== 'none' }})()"),
         t[:200], 'a browsed mission keeps its zones line')
    sheet('X-902A')
    c.settle()
    c.eq(c.count(S), 0, 'a mission without drawers has no section', what='section')
    c.js(_DW_CLEAR)


# SOG-0441 (zone lot): the drawers follow the flight. An invented mission whose three drawers have a zone, an object and an arrival.
_DW_LIVE_REGISTRY = """missions:
  - { id: X-904A, family: TESTTIROIR, title: Recherche suivie, folder: X_TIR/X-904A, files: [missionX-904A.yaml] }
"""
_DW_LIVE = """mission: { id: X-904A, type: SAR, subtype: RECHERCHE }
title: Recherche suivie
summary: Un canot inventé dérive au sud de la base. Décollez ; la suite vous sera donnée au passage de la zone.
origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
destination: { name: Base Test Sud (XTSU), lat: 44.5, lon: 1.0 }
aircraft: [{ type: EC25, cruise_level: 1500 ft, cruise_speed_kt: 120 }]
zones:
  - { id: ZONE-1, name: Secteur nord, kind: search, centre: { lat: 44.8, lon: 1.0 }, radius_km: 3 }
objects:
  - { id: OBJ-1, kind: raft, name: Canot, lat: 44.7, lon: 1.0, detection_range_nm: 0.5 }
route_order: [ORIGIN, DESTINATION]
phases:
  - id: B
    title: Secteur de recherche
    message: "Un canot orange a été vu au sud du secteur."
    brief: Descendez à 500 ft et cherchez vers le sud.
    trigger_zone: ZONE-1
    fallback_delay_min: 60
  - id: C
    title: Canot en vue
    message: "Restez en vue du canot, un navire arrive."
    brief: Orbitez à 500 ft.
    trigger_object: OBJ-1
    fallback_delay_min: 90
  - id: D
    title: Compte rendu
    message: "Mission terminée."
    brief: Rendez compte au centre.
    trigger_condition: { kind: arrival, point: DESTINATION, radius_nm: 1, speed_max_kt: 30, require_on_ground: true }
    fallback_delay_min: 120
"""


@case('N83', 'Missions: the drawers follow the flight — with a live position on the started flight of the mission, the first closed drawer '
      'says « Cet appareil suit ce passage »; the zone crossed opens it and writes the finding, with its two fixes, in my record; an object '
      'in range offers « Objet en vue » (refused out of range, never opened by the range alone); the landed arrival opens the last one',
      'N', tags=('missions',), designs=('standard',), langs4=True,
      rule='SOG-0441, zone lot (the ergonomist, 17 Nov 2026, 21 h 48): the frame\'s crossing service (frame/lib/crossing.js, SOG-0447) judges '
      'each leg of the live position (ctx.live.watch) for the FIRST closed drawer of the mission of the started flight — a zone the leg '
      'touches, an object in range (the pilot then declares « Objet en vue »), an arrival landed; the finding is written in the pilot\'s own '
      'record pilot/<TRI>/missions/<ID>.json with the two fixes of the leg, so that another device replays it; « Cet appareil ne suit pas '
      'encore ce passage » stays only for what the device really does not judge; the launcher and the simulator are simulated (two routes), '
      'no network')
def n83(c):
    import datetime
    import json
    at = lambda m: (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=m)).strftime('%Y-%m-%dT%H:%M:%SZ')
    full = {'server': True, 'root': '', 'git': True, 'data': True, 'dataGit': True, 'dataRepo': '', 'lfs': False, 'csp': True, 'relaxNav': False,
            'host': 'TEST', 'lan': False, 'suite': 'abcd1234abcd1234'}
    fix = lambda lat, lon, **more: {'lat': lat, 'lon': lon, 'altFt': 2000, 'aglFt': 1500, 'onGround': False, 'headingDeg': 180, 'trackDeg': 180,
                                    'gsKt': 120, 'source': 'xplane', **more}
    now = {'fix': fix(44.9, 1.0)}                  # north of the zone (its centre is at 44.8, radius 3 km)
    c.context.route(re.compile(r'/__setup/status'), lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(full)))
    c.context.route(re.compile(r'/__setup/sim/position'),
                    lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({**now['fix'], 'at': at(0)})))
    start = at(-12)
    flight = {'schema': 1, 'by': 'fuel', 'updated_at': start, 'mission': 'X-904A', 'started': {'at': start},
              'aircraft': {'type': 'EC25', 'registration': 'F-TEST'},
              'route': {'text': 'XTST XTSU', 'dep': 'XTST', 'arr': 'XTSU', 'points': [{'id': 'XTST', 'lat': 45.0, 'lon': 1.0}, {'id': 'XTSU', 'lat': 44.5, 'lon': 1.0}],
                        'distanceNm': 30, 'trackDeg': 180}, 'level': {'ft': 1500}}
    BOOK = 'pilot/ABC/missions/X-904A.json'
    S = f'{M} [data-drawers]'
    row = lambda k: tx(DW, k, c.lang)
    head = lambda k: norm(row(k).split('{')[0])
    try:
        c.page.goto(c.base + '/frame/manifest.webmanifest')
        c.js(_DW_CLEAR)
        c.js(_TEXTS_JS, [['missions/mission_registry.yaml', _DW_LIVE_REGISTRY], ['missions/X_TIR/X-904A/missionX-904A.yaml', _DW_LIVE]])
        c.open('missions', wait=False, app='company', docs=[['pilot/ABC/current_flight.json', flight, 'document']])
        c.until(f"!!document.querySelector('{M} [data-list] [data-id=\"X-904A\"]')", timeout=20000, what='the list')
        c.tap(f'{M} [data-list] [data-id="X-904A"]')
        c.until(f"document.querySelector('{M} .ms-sheet')?.dataset.id === 'X-904A'", timeout=10000, what='the sheet of X-904A')

        def frame_it(name):
            """The section at the top of the screen, then the picture."""
            c.js(f"document.querySelector('{S}').scrollIntoView({{block: 'start'}})")
            c.shot(f'N83_{c.design}_{c.width}_{c.lang}_{name}.png')

        # followed: the mission of my started flight, a live position, the first closed drawer is a zone
        c.until(f"!!document.querySelector('{S} [data-dw=\"B\"] [data-dw-follow=\"followed\"]')", timeout=40000, what='the first drawer followed by this device')
        c.eq(norm(c.text(f'{S} [data-dw="B"] [data-dw-note]')), norm(row('followed')), '« Cet appareil suit ce passage » — no fallback hour, it does not concern him',
             what='the note of a followed drawer')
        c.ok(c.count(f'{S} [data-dw-open="B"]') == 1 and c.count(f'{S} [data-dw-seen]') == 0 and c.count(f'{S} [data-dw][data-locked]') == 2
             and (c.doc(BOOK) or {}).get('drawer_B') is None, c.text(S), 'the gesture stays, the next two drawers wait, nothing opened outside the zone')
        frame_it('followed')
        # crossed: the next fix is inside the zone — the finding is written with the two fixes of the leg
        now['fix'] = fix(44.80, 1.0)
        c.until(f"document.querySelector('{S} [data-dw=\"B\"]')?.dataset.open === 'zone'", timeout=40000, what='the first drawer opened by the zone')
        book = c.until_doc(BOOK, lambda d: d and d.get('drawer_B', {}).get('state') == 'open', what='my record carries the finding')
        b = book['drawer_B']
        c.ok(b['how'] == 'zone' and b.get('source') == 'xplane' and abs(b['from']['lat'] - 44.9) < 1e-9 and abs(b['to']['lat'] - 44.8) < 1e-9
             and b['to'].get('altFt') == 2000 and b['to'].get('onGround') is False and book['seance'].startswith(f'S:{start[:19]}') and 'drawer_C' not in book, book,
             'my record: the zone, the source, the TWO fixes of the leg at full precision, the play of this flight — the next drawer untouched')
        t = norm(c.text(f'{S} [data-dw="B"]'))
        c.ok(head('openZoneMe') in t and 'canot orange' in t and 'Descendez' in t and re.search(r'\d\d:\d\dZ', t) is not None, t,
             'open: « ouvert au passage de la zone, à … », its message and its briefing')
        # the object, out of range: followed, « Objet en vue » is offered but refused
        c.until(f"!!document.querySelector('{S} [data-dw=\"C\"] [data-dw-follow=\"followed\"]')", timeout=20000, what='the second drawer followed')
        c.ok(norm(c.text(f'{S} [data-dw="C"] [data-dw-key]')) == norm(row('keyObject')) and c.count(f'{S} [data-dw-seen="C"]') == 1
             and c.count(f'{S} [data-dw-seen="C"].primary') == 0, c.text(f'{S} [data-dw="C"]'),
             'drawer 2: « s\'ouvre quand l\'objet est trouvé », « Objet en vue » offered, not yet the main button')
        c.tap(f'{S} [data-dw-seen="C"]')
        c.wait(600)
        c.ok('drawer_C' not in c.doc(BOOK) and c.count(f'{S} [data-dw="C"][data-open]') == 0, c.doc(BOOK), '« Objet en vue » out of range writes nothing')
        frame_it('crossed')
        # in range: the sentence and the main button; the range alone never opens
        now['fix'] = fix(44.705, 1.0, altFt=600, aglFt=600)
        c.until(f"!!document.querySelector('{S} [data-dw=\"C\"] [data-dw-follow=\"range\"]')", timeout=40000, what='the object in range')
        c.ok(norm(c.text(f'{S} [data-dw="C"] [data-dw-note]')) == norm(row('inRange')) and c.count(f'{S} [data-dw-seen="C"].primary') == 1
             and 'drawer_C' not in c.doc(BOOK), c.text(f'{S} [data-dw="C"]'),
             'in range: « À portée de l\'objet : déclarez « Objet en vue » », the main button, nothing written before the pilot\'s word')
        frame_it('range')
        c.tap(f'{S} [data-dw-seen="C"]')
        book = c.until_doc(BOOK, lambda d: d and d.get('drawer_C', {}).get('state') == 'open', what='my record carries the object found')
        c.ok(book['drawer_C']['how'] == 'object' and abs(book['drawer_C']['to']['lat'] - 44.705) < 1e-9 and 'drawer_D' not in book, book,
             'my record: the object, the fix in range')
        c.until(f"document.querySelector('{S} [data-dw=\"C\"]')?.dataset.open === 'object'", timeout=8000, what='the second drawer open on screen')
        # the arrival: in flight over the aerodrome opens nothing; landed, slow, it does
        c.until(f"!!document.querySelector('{S} [data-dw=\"D\"] [data-dw-follow=\"followed\"]')", timeout=20000, what='the third drawer followed')
        now['fix'] = fix(44.5, 1.0, altFt=1200, aglFt=800)
        c.wait(11000)
        c.ok('drawer_D' not in c.doc(BOOK), c.doc(BOOK), 'over the arrival aerodrome, in flight: nothing opens')
        now['fix'] = fix(44.5, 1.0, altFt=400, aglFt=0, onGround=True, gsKt=6)
        c.until(f"document.querySelector('{S} [data-dw=\"D\"]')?.dataset.open === 'arrival'", timeout=40000, what='the third drawer opened by the arrival')
        book = c.doc(BOOK)
        c.ok(book['drawer_D']['how'] == 'arrival' and book['drawer_D']['to'].get('onGround') is True
             and head('openArrivalMe') in norm(c.text(f'{S} [data-dw="D"]')), book.get('drawer_D'),
             'landed and slow at the arrival: the last drawer opens, « ouvert à l\'arrivée, à … »')
    finally:
        c.context.unroute(re.compile(r'/__setup/status'))
        c.context.unroute(re.compile(r'/__setup/sim/position'))
    c.js(_DW_CLEAR)


_HIDDEN_JS = """async () => { const MS = await import('/frame/lib/mission.js');
  const doc = { mission: { id: 'X-001A', type: 'REG' }, title: 'Mis\\u202Esion\\u2066 cachée\\u206A', summary: 'Un ré\\u200Bsumé.', detailed_description: 'Un para\\uFEFFgraphe.',
    origin: { name: 'Base\\u200E Test (XTST)', lat: 45, lon: 1 }, destination: { name: 'Base Test Sud (XTSU)', lat: 44, lon: 2 },
    turning_points: [{ id: 'PT1', name: 'Po\\u202Dint', lat: 44.8, lon: 1.2 }], route_order: ['ORIGIN', 'PT1\\u200B', 'DESTINATION'],
    phases: [{ id: 'B', title: 'Ti\\u202Etre', trigger: 'au\\u2066 point', trigger_point: 'PT1\\u200B', trigger_delay_min: 5, message: 'Mes\\u202Esage a\\u200Db',
      brief: 'Ligne\\uFFF9 un.\\nFin\\u202F!' }] };
  const m = MS.readMission(doc), d = m.drawers[0];
  return { visible: typeof MS.visible === 'function' ? [MS.visible('a\\u061Cb\\u2060c\\u2069d\\u206Fe\\uFFFBf'), MS.visible('g\\u200Ch\\u200Di\\u202Fj'), MS.visible(null), MS.visible(7)] : null,
    mission: [m.title, m.summary, m.details, m.origin.name, Object.values(m.points).map(p => p.name)],
    drawer: [d.title, d.trigger, d.message, d.brief, d.key.kind, d.keyWhy],
    registry: MS.readRegistry({ missions: [{ id: 'X-001A', family: 'REG', title: 'Re\\u202Egistre', folder: 'X_REG/X-001A', files: ['missionX-001A.yaml'] }] }).map(r => r.title) } }"""


@case('N76', 'Mission reader: the invisible format characters that deceive the eye (direction overrides and isolates, zero-width space, word '
      'joiner, deprecated formats, interlinear annotations, byte-order mark) are removed from every text read from a mission file or a '
      'registry — title, summary, description, names, the title, the words, the message and the briefing of a drawer — and from an '
      'identifier before it is compared (a route word « PT1 » followed by a zero-width space is PT1); the joiner, the non-joiner and '
      'the narrow no-break space are kept', 'N', tags=('missions', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='Sécurisation, review of 18 Nov 2026 (after SOG-0445): a mission file is written by any pilot, and the pilot\'s screen shows its '
      'title, its message and its briefing — a text must not read otherwise than it is written. ONE function, `visible` of '
      'frame/lib/mission.js, used by the reader and by the workshop (modules/missions/editor_drawers.js); docs/technique/FORMAT_MISSION.md § 5')
def n76(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    r = c.js(_HIDDEN_JS)
    c.eq(r['mission'], ['Mission cachée', 'Un résumé.', ['Un paragraphe.'], 'Base Test (XTST)', ['Point']],
         'the title, the summary, the description, the names: read without the hidden characters', what='the mission')
    c.eq(r['drawer'], ['Titre', 'au point', 'Message a\u200db', 'Ligne un.\nFin\u202f!', 'time', ''],
         'the drawer: its texts without them (the joiner and the narrow no-break space kept), and its trigger point « PT1 + zero-width space » is PT1',
         what='the drawer')
    c.eq(r['registry'], ['Registre'], 'a title of the registry too', what='the registry')
    c.eq(r['visible'], ['abcdef', 'g\u200ch\u200di\u202fj', '', '7'], 'the one function: what it removes, what it keeps, nothing for nothing', what='visible')



_OBJ_JS = """async () => { const ED = await import('/modules/missions/editor.js'); const J = x => JSON.stringify(x);
  const base = { mission: { id: 'X-001A', type: 'REG' }, title: 'Objets',
    origin: { name: 'Base Test (XTST)', lat: 45, lon: 1 }, destination: { name: 'Base Test Sud (XTSU)', lat: 44, lon: 2 },
    target: { id: 'TARGET', name: 'Cible', lat: 44.6, lon: 1.4 }, turning_points: [{ id: 'PT1', name: 'Un', lat: 44.8, lon: 1.2 }],
    zones: [{ id: 'ZONE-1', name: 'Secteur', kind: 'search', centre: { lat: 44.7, lon: 1.3 }, radius_km: 12 }],
    objects: [{ id: 'OBJ-1', kind: 'person', name: 'Naufragé', lat: 44.61, lon: 1.31, detection_range_nm: 0.3, callsign: 'gardé' },
      { id: 'OBJ-2', kind: 'aircraft', name: 'Cible mobile', lat: 44.8, lon: 1.2, route_order: ['PT1', 'TARGET'], speed_kt: 110, detection_range_nm: 0.8 }],
    route_order: ['ORIGIN', 'PT1', 'TARGET', 'DESTINATION'],
    phases: [{ id: 'B', title: 'Objet', trigger_object: 'OBJ-1', fallback_delay_min: 90 }, { id: 'C', title: 'Zone', trigger_zone: 'ZONE-1', trigger_actor: 'OBJ-2' },
      { id: 'D', title: 'Suivi', trigger_condition: { kind: 'hover', object: 'OBJ-1', radius_m: 50 } }] };
  const rows = ED.placesOf(base), at = id => rows.findIndex(r => r.id === id), on = (id, f) => rows.map(r => r.id === id ? f(r) : r);
  const w = r => ED.withRefs(ED.withPlaces(base, r), base, r);
  const fresh = { kind: 'object', i: -1, id: ED.nextPlaceId(rows, 'object', base), name: 'Épave', role: '', okind: 'wreck', lat: '44.5', lon: '1.4', range: '1', height: '', alt: '',
    confirm: true, moving: false };
  const gone = w(rows.filter(r => r.id !== 'OBJ-1'));
  return { rows: rows.filter(r => r.kind === 'object').map(r => [r.i, r.id, r.name, r.okind, r.lat, r.lon, r.range, r.height, r.alt, r.confirm, r.moving]),
    same: J(ED.withPlaces(base, rows)) === J(base) && ED.withRefs(base, base, rows) === base,
    edited: w(on('OBJ-1', r => ({ ...r, range: '0.5', confirm: false, alt: '2500', height: '800' }))).objects,
    bounds: [w(on('OBJ-1', r => ({ ...r, range: '0' }))).objects[0], w(on('OBJ-1', r => ({ ...r, range: '500', okind: 'bomb', alt: '-2000' }))).objects[0]],
    added: [fresh.id, w([...rows, fresh]).objects[2]],
    refs: ED.refsOf(base).filter(r => r.where !== 'route').map(r => [r.where, r.name, r.id]),
    cited: [ED.citedBy(base, rows, at('OBJ-1')).map(c => [c.where, c.name, c.n]), ED.citedBy(base, rows, at('OBJ-2')).map(c => [c.where, c.name, c.n])],
    gone: { phases: gone.phases, objects: gone.objects.map(o => o.id), noKey: ED.drawersNoKey(gone) }, actor: w(rows.filter(r => r.id !== 'OBJ-2')).phases[1],
    renamed: w(on('PT1', r => ({ ...r, id: 'ALPHA' }))).objects[1].route_order,
    dead: [ED.deadRefs(base).length, ED.deadRefs({ ...base, objects: [] }).map(r => [r.where, r.name, r.id])],
    hidden: [ED.storyOf({ summary: 'Ré\\u200Bsumé \\u202Ecaché' }).summary, ED.placesOf({ target: { id: 'TARGET', name: 'Ci\\u2066ble', lat: 1, lon: 1 } })[0].name,
      J(ED.withStory({ summary: 'Ré\\u200Bsumé' }, ED.storyOf({ summary: 'Ré\\u200Bsumé' }))) === J({ summary: 'Ré\\u200Bsumé' })],
    todo: ED.todo({ ...base, phases: [], objects: [{ id: 'OBJ-1', kind: 'person' }] }).filter(t => t.step === 'places').map(t => t.key) } }"""

_OBJ_MISSION = _AT_MISSION.replace('teams:\n', "  - { id: E, title: Naufragé, trigger_object: OBJ-1, fallback_delay_min: 90 }\nteams:\n", 1).replace(
    'route_order: [ORIGIN', "objects:\n  - { id: OBJ-1, kind: person, name: Naufragé, lat: 44.61, lon: 1.31, detection_range_nm: 0.3 }\n"
    "  - { id: OBJ-2, kind: aircraft, name: Cible mobile, lat: 44.8, lon: 1.2, route_order: [PT1, TARGET], speed_kt: 110, detection_range_nm: 0.8 }\n"
    "route_order: [ORIGIN", 1)
_OBJ_TEXTS = [_ED_TEXTS[0], ['missions/X_REG/X-001A/missionX-001A.yaml', _OBJ_MISSION]]
_PLACE_LINE = f"""(i) => {{ const r = document.querySelector('{E} [data-edplaces] [data-place="' + i + '"]'); return r ? [r.dataset.kind, r.querySelector('.ms-plbadge').textContent.trim(), r.querySelector('.ms-plbody b').textContent.trim(), r.querySelector('.ms-plbody .f-muted').textContent.trim()] : null }}"""


@case('N77', 'Missions › the workshop, the objects to find are rows of the Lieux: one row « OBJ » per object of the mission (its kind, its '
      'range, « caché au pilote », the drawer whose key it is — « clé du tiroir 4 » — or « aucun tiroir ne le cite »), a zone says the drawer '
      'that uses it too; its sheet has no identifier to type (the workshop gives it: OBJ-3), a kind from the reader\'s list, its position, '
      'its range, its heights and « trouvé seulement quand le pilote le déclare »; a moving target keeps its route and its speed; « Retirer » '
      'an object that a drawer cites says so first; an event of the timeline is never placed on an object; the sketch draws it; the '
      'references follow (the key and the target of a drawer, the object of a condition, the route of a target)', 'N',
      tags=('missions', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0445, lot P3 (modules/missions/EDITOR.md § 5 and § 7; docs/technique/FORMAT_MISSION.md § 3: an object is written by '
      'identifier, at the top — Q-0095; the reading hides it from the pilot while the drawer that cites it is closed). Security review of '
      '18 Nov: the texts of the six steps go through `visible` of the reader too')
def n77(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    r = c.js(_OBJ_JS)
    c.eq(r['rows'], [[0, 'OBJ-1', 'Naufragé', 'person', '44.61', '1.31', '0.3', '', '', True, False],
                     [1, 'OBJ-2', 'Cible mobile', 'aircraft', '44.8', '1.2', '0.8', '', '', True, True]], 'the objects of the mission, as rows of the Lieux', what='rows')
    c.ok(r['same'] is True, r['same'], 'nothing touched: the same content, and the references give back the same object')
    c.eq(r['edited'], [{'id': 'OBJ-1', 'kind': 'person', 'name': 'Naufragé', 'lat': 44.61, 'lon': 1.31, 'detection_range_nm': 0.5, 'callsign': 'gardé',
                        'detection_height_ft': 800, 'altitude_ft': 2500, 'require_confirmation': False},
                       {'id': 'OBJ-2', 'kind': 'aircraft', 'name': 'Cible mobile', 'lat': 44.8, 'lon': 1.2, 'route_order': ['PT1', 'TARGET'], 'speed_kt': 110,
                        'detection_range_nm': 0.8}], 'an object changed: its fields alone, its other keys kept; the moving target untouched', what='objects after an edit')
    c.eq(r['bounds'], [{'id': 'OBJ-1', 'kind': 'person', 'name': 'Naufragé', 'lat': 44.61, 'lon': 1.31, 'callsign': 'gardé'},
                       {'id': 'OBJ-1', 'name': 'Naufragé', 'lat': 44.61, 'lon': 1.31, 'callsign': 'gardé'}],
         'a range of 0 or of 500 NM, an altitude of −2 000 ft, a kind out of the list are not written (never brought back into the bounds)', what='out of bounds')
    c.eq(r['added'], ['OBJ-3', {'id': 'OBJ-3', 'name': 'Épave', 'kind': 'wreck', 'lat': 44.5, 'lon': 1.4, 'detection_range_nm': 1, 'require_confirmation': True}],
         'a new object: an identifier the file does not carry, found within range AND on the pilot\'s word by default', what='a new object')
    c.eq(r['refs'], [['drawerKey', '1', 'OBJ-1'], ['drawerKey', '2', 'ZONE-1'], ['drawerActor', '2', 'OBJ-2'], ['drawerKey', '3', 'OBJ-1'],
                     ['objectRoute', 'OBJ-2', 'PT1'], ['objectRoute', 'OBJ-2', 'TARGET']], 'the references to and from the objects', what='refsOf')
    c.eq(r['cited'], [[['drawerKey', '1', 1], ['drawerKey', '3', 1]], [['drawerActor', '2', 1]]], 'who cites each object', what='citedBy')
    c.eq(r['gone'], {'phases': [{'id': 'B', 'title': 'Objet', 'fallback_delay_min': 90}, {'id': 'C', 'title': 'Zone', 'trigger_zone': 'ZONE-1', 'trigger_actor': 'OBJ-2'},
                                {'id': 'D', 'title': 'Suivi', 'trigger_condition': {'kind': 'hover', 'radius_m': 50}}], 'objects': ['OBJ-2'], 'noKey': ['1']},
         'an object removed: the key of the drawer goes (its fallback hour stays), the condition loses its object; the drawer left without key is named', what='after a removal')
    c.eq([r['actor'], r['renamed']], [{'id': 'C', 'title': 'Zone', 'trigger_zone': 'ZONE-1'}, ['ALPHA', 'TARGET']],
         'the target removed: the pilot crosses the zone; a place renamed is renamed in the route of a target', what='the target of a zone, the route of a target')
    c.eq(r['dead'], [0, [['drawerKey', '1', 'OBJ-1'], ['drawerActor', '2', 'OBJ-2']]], 'an object the mission has is no dead reference; one it has not is named', what='deadRefs')
    c.eq(r['hidden'], ['Résumé caché', 'Cible', True], 'the six steps read their texts without the invisible format characters; a text not touched is kept as it is',
         what='format characters in the editor')
    c.eq(r['todo'], ['unplaced'], 'an object without position is « à placer »', what='todo')
    # on screen
    path = 'missions/X_REG/X-001A/missionX-001A.yaml'
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    reg_open(c, _OBJ_TEXTS)
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the workshop')
    c.tap(f'{E} [data-steps] [data-step="places"]')
    c.until(f"!!document.querySelector('{E} [data-edplaces]')", what='the Lieux')
    i = c.js(_PLACE_AT, 'OBJ-1')
    line = c.js(_PLACE_LINE, i)
    c.ok(line[0] == 'object' and line[1] == row(c, 'plObject', EDTX_FILE) and line[2] == 'OBJ-1 · Naufragé' and
         all(norm(x) in norm(line[3]) for x in (row(c, 'ok_person', EDTX_FILE), row(c, 'plRangeIs', EDTX_FILE).replace('{r}', '0,3'), row(c, 'plHidden', EDTX_FILE),
                                                row(c, 'plKeyOf', EDTX_FILE).replace('{name}', '4'))), line,
         'the row of an object: « OBJ », its identifier and its name, its kind, its range (a decimal comma in a French sentence), « caché au pilote », '
         '« clé du tiroir 4 »')
    moving = c.js(_PLACE_LINE, c.js(_PLACE_AT, 'OBJ-2'))
    c.ok(norm(row(c, 'plNoDrawer', EDTX_FILE)) in norm(moving[3]) and norm(row(c, 'plMoving', EDTX_FILE)) in norm(moving[3]), moving,
         'the moving target: « aucun tiroir ne le cite », « cible mobile, gardée telle quelle »')
    zone = c.js(_PLACE_LINE, c.js(_PLACE_AT, 'ZONE-1'))
    c.ok(norm(row(c, 'plKeyOf', EDTX_FILE).replace('{name}', '2')) in norm(zone[3]), zone, 'a zone says the drawer that uses it: « clé du tiroir 2 »')
    c.js(f"document.querySelector('{E} [data-place=\"{i}\"]').scrollIntoView({{block: 'center'}})")
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N77_390_objects.png')
    # the sheet of an object: no identifier to type, seven fields
    c.tap(f'{E} [data-place="{i}"] [data-do="edplace"]')
    F = f'{E} [data-plform="{i}"]'
    c.ok(c.count(f'{F} [data-f=id]') == 0 and 'OBJ-1' in c.text(f'{F} [data-plid]'), c.text(f'{F} [data-plid]'), 'the identifier is said, never typed')
    c.eq(c.js(f"[...document.querySelectorAll('{F} [data-f]')].map(x => x.dataset.f)"), ['name', 'okind', 'lat', 'lon', 'range', 'confirm', 'height', 'alt'],
         'the fields of an object', what='fields')
    fold = c.js(f"(() => {{ const d = document.querySelector('{F} [data-plheights]'); return [d.open, d.querySelector('summary').textContent.trim(), d.querySelectorAll('[data-f]').length] }})()")
    c.eq(fold, [False, norm(row(c, 'plHeights', EDTX_FILE)), 2], 'the rule of seven: the two heights are in ONE fold « Hauteur — facultatif », closed at first',
         what='the fold of the heights')
    c.eq(c.js(f"document.querySelector('{F} [data-f=confirm]').checked"), True, '« trouvé seulement quand le pilote le déclare » is checked (the default of the format)',
         what='the box')
    c.eq(c.js(f"[...document.querySelectorAll('{F} [data-f=okind] option')].map(o => o.value)"), ['', 'wreck', 'raft', 'person', 'vehicle', 'container', 'ship', 'smoke', 'aircraft'],
         'the kinds are the reader\'s list', what='kinds')
    c.page.fill(f'{F} [data-f=range]', '0.5')
    forged = c.js(f"""() => {{ const f = document.querySelector('{F} [data-f=range]'), x = f.cloneNode(); x.dataset.f = 'id'; x.value = 'FORGED'; f.parentNode.appendChild(x);
      x.dispatchEvent(new Event('input', {{ bubbles: true }})); x.remove(); return document.querySelector('{F} [data-plid]').textContent }}""")
    c.ok('OBJ-1' in forged and 'FORGED' not in forged and c.js(_PLACE_AT, 'OBJ-1') == i, forged, 'a forged field « id » does not rename an object')
    c.js(f"document.querySelector('{F}').scrollIntoView({{block: 'center'}})")
    c.shot('N77_390_object_sheet.png')
    c.tap(f'{F} [data-f=confirm]')
    c.tap(f'{F} [data-do="edplaceok"]')
    # « + Objet à trouver »: the workshop gives the identifier
    c.tap(f'{E} [data-do="edplaceadd"][data-kind="object"]')
    c.until(f"!!document.querySelector('{E} [data-plform] [data-plid]')", what='the new object open')
    c.ok('OBJ-3' in c.text(f'{E} [data-plform] [data-plid]') and c.js(f"document.querySelector('{E} [data-plform] [data-f=confirm]').checked") is True,
         c.text(f'{E} [data-plform] [data-plid]'), 'the new object is OBJ-3, and its box « trouvé seulement quand le pilote le déclare » is checked from the start')
    c.page.fill(f'{E} [data-plform] [data-f=name]', 'Épave')
    c.page.select_option(f'{E} [data-plform] [data-f=okind]', 'wreck')
    c.page.fill(f'{E} [data-plform] [data-f=lat]', '44.5')
    c.page.fill(f'{E} [data-plform] [data-f=lon]', '1.4')
    c.page.fill(f'{E} [data-plform] [data-f=range]', '1')
    c.tap(f'{E} [data-plform] [data-do="edplaceok"]')
    c.eq(c.count(f'{E} [data-atmapbody] [data-thobject]'), 3, 'the sketch draws the three objects (the map is the author\'s)', what='objects on the sketch')
    # « Retirer » an object that a drawer cites
    i = c.js(_PLACE_AT, 'OBJ-1')
    c.tap(f'{E} [data-place="{i}"] [data-do="edplace"]')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.tap(f'{E} [data-plform="{i}"] [data-do="edplacedel"]')
    c.settle()
    note = norm(c.js(_NOTES))
    c.ok(c.js(_PLACE_AT, 'OBJ-1') == i and 'OBJ-1' in note and norm(row(c, 'ref_drawerKey', EDTX_FILE).replace('{name}', '4')) in note, note,
         'the first press removes nothing and says who cites it: the drawer 4, its key')
    c.wait(1100)
    c.tap(f'{E} [data-plform="{i}"] [data-do="edplacedel"]')
    c.eq(c.js(_PLACE_AT, 'OBJ-1'), -1, 'the second press removes the object', what='the object row')
    # an event of the timeline is never placed on an object
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.tap(f'{E} [data-steps] [data-step="timeline"]')
    c.until(f"!!document.querySelector('{E} [data-edevents]')", what='the Chronologie')
    opts = c.js(f"[...document.querySelectorAll('{E} [data-event] select[data-f=place] option')].map(o => o.value)")
    c.ok(opts and not any(o.startswith('OBJ') for o in opts), opts, 'no object among the places of an event (the timeline is read by the pilot)')
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.tap(f'{E} [data-steps] [data-step="places"]')
    c.until(f"!!document.querySelector('{E} [data-edplaces]')", what='the Lieux on a wide screen')
    c.js(f"document.querySelector('{E} [data-edplaces] [data-kind=object]').scrollIntoView({{block: 'center'}})")
    c.shot('N77_1280_objects.png')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    got = c.js("""async (p) => { if (!globalThis.jsyaml) await import('/frame/lib/js-yaml.min.js');
      const d = globalThis.jsyaml.load(await (%s)(p), { schema: globalThis.jsyaml.CORE_SCHEMA });
      return { objects: d.objects, part: d.phases[3] } }""" % _TEXT_OF, path)
    c.eq(got, {'objects': [{'id': 'OBJ-2', 'kind': 'aircraft', 'name': 'Cible mobile', 'lat': 44.8, 'lon': 1.2, 'route_order': ['PT1', 'TARGET'], 'speed_kt': 110,
                            'detection_range_nm': 0.8},
                           {'id': 'OBJ-3', 'name': 'Épave', 'kind': 'wreck', 'lat': 44.5, 'lon': 1.4, 'detection_range_nm': 1, 'require_confirmation': True}],
               'part': {'id': 'E', 'title': 'Naufragé', 'fallback_delay_min': 90}},
         'the file: the moving target as it was, the new object by identifier at the top, the drawer without its key (its fallback hour kept)', what='the saved file')
    c.js(_REG_CLEAR)



_DW = f'{E} [data-drawer]'
_DW_FIELDS = f"[...document.querySelectorAll('{_DW} [data-k=eddr]')].map(x => x.dataset.f)"
_DW_VAL = f"""(f) => {{ const x = document.querySelector('{_DW} [data-k=eddr][data-f="' + f + '"]'); return !x ? null : x.type === 'checkbox' ? x.checked : x.value }}"""
_DW_CARDS = f"[...document.querySelectorAll('{E} [data-atflow] [data-kind=drawer]')].map(x => [x.dataset.sel, x.querySelector('b').textContent.trim(), (x.querySelector('[data-dkey]')?.textContent || '').trim(), (x.querySelector('[data-dmark]')?.textContent || '').trim(), x.getAttribute('aria-current')])"


@case('N78', 'Missions › the workshop, the sheet of a drawer: a card of the unfolding is touched and its sheet takes the place of the '
      'departure\'s — the key (the pilot\'s gesture, an hour, a passage zone, an object to find, the arrival at the aerodrome; a zone and '
      'an object are CHOSEN among those of the mission), its fallback time, « Montrer la zone au pilote », the texts (title, message, '
      'briefing), the onward route in chips; « ＋ Tiroir » adds the next one (the pilot\'s gesture by default); « Retirer ce tiroir » '
      'takes two presses and the ranks close up; touching a drawer without changing anything writes nothing; typing never redraws a card '
      '(one click after typing is enough); the drawers count in « À compléter », one line per drawer; the file is written by '
      'identifier, the key said in plain words never names the zone nor the object', 'N', tags=('missions', 'security'),
      designs=('standard',), screens=False, langs4=False,
      rule='SOG-0445, lot P3 (modules/missions/EDITOR.md § 1, § 5 and § 7; the mock-up modules/missions/maquette/tiroirs_*.png accepted on '
      '17 Nov 2026; Q-0095: by identifier, at the top; SOG-0449: what the finger is pressing is never redrawn)')
def n78(c):
    path = 'missions/X_REG/X-001A/missionX-001A.yaml'
    T = lambda k, **v: norm(__import__('functools').reduce(lambda t, kv: t.replace('{' + kv[0] + '}', str(kv[1])), v.items(), row(c, k, EDTX_FILE)))  # noqa: E731
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    reg_open(c, _OBJ_TEXTS)
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the workshop')
    cards = c.js(_DW_CARDS)
    c.eq([[x[0], norm(x[1]), norm(x[2]), x[4]] for x in cards],
         [['B', f"{T('atDrawer', n=1)} · Changement", T('atKey_time'), None], ['C', f"{T('atDrawer', n=2)} · Entrée du secteur", T('atKey_zone'), None],
          ['D', f"{T('atDrawer', n=3)} · Retour", T('atKey_arrival'), None], ['E', f"{T('atDrawer', n=4)} · Naufragé", T('atKey_object'), None]],
         'the four drawers of the file, each a card that can be touched; none chosen at the opening', what='the cards')
    c.eq(c.count(f'{E} [data-atflow] [data-dradd]'), 1, '« ＋ Tiroir » is the last card', what='the add card')
    c.ok(c.count(f'{E} [data-drawerskept]') == 0, 'still there', 'the sentence « ils ne se modifient pas encore ici » is gone')
    # a drawer touched: its sheet; nothing changed, nothing written
    c.tap(f'{E} [data-atflow] [data-sel="C"]')
    c.until(f"!!document.querySelector('{_DW}')", what='the sheet of drawer 2')
    c.ok(c.count(f'{E} [data-steps]') == 0 and norm(c.text(f'{_DW} [data-dwhead]')) == T('dwSheet', n=2), c.text(f'{_DW} [data-dwhead]'),
         'the sheet of the drawer takes the place of the departure\'s')
    c.eq(c.js(_DW_FIELDS), ['key', 'zone', 'shown', 'fallback', 'title', 'message', 'brief', 'routeadd'], 'the fields of a drawer keyed by a zone', what='fields')
    c.eq([c.js(_DW_VAL, f) for f in ('key', 'zone', 'shown', 'fallback', 'title')], ['zone', 'ZONE-1', True, '60', 'Entrée du secteur'], 'read from the file', what='values')
    c.eq(c.js(f"[...document.querySelectorAll('{_DW} [data-f=zone] option')].map(o => o.value)"), ['', 'ZONE-1'], 'the zones of the mission, to choose from', what='zones')
    folds = c.js(f"[...document.querySelectorAll('{_DW} [data-dgrp]')].map(g => [g.dataset.dgrp, g.querySelector('.ms-dbody') ? getComputedStyle(g.querySelector('.ms-dbody')).display !== 'none' : true, (g.querySelector('[data-dline]')?.textContent || '').trim()])")
    c.eq(folds, [['key', True, ''], ['texts', False, norm(' · '.join(['Entrée du secteur', T('dwTodo_noMessage'), T('dwTodo_noBrief')]))], ['route', False, T('dwLineNoRoute')],
                ['pilot', False, T('dwPilotLine')]],
         'on a phone: « La clé » unfolded; « Les textes », « La suite de route » and « Ce que le pilote voit » folded, each saying its content in one line',
         what='the groups of the sheet')
    c.tap(f'{E} [data-do="edsave"]')
    c.wait(400)
    c.eq(c.js(_TEXT_OF, path), _OBJ_MISSION, 'a drawer touched, nothing changed: the file is the same', what='the file')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    # typing never redraws a card: the title follows in place, and ONE click on another card is enough
    c.tap(f'{_DW} [data-do="eddrgrp"][data-grp="texts"]')
    c.until(f"getComputedStyle(document.querySelector('{_DW} [data-dgrp=texts] .ms-dbody')).display !== 'none'", what='« Les textes » unfolded')
    c.js(f"document.querySelectorAll('{E} [data-atflow] button, {_DW} [data-do=eddrgrp]').forEach(b => b.__kept = true)")
    c.page.fill(f'{_DW} [data-f=title]', 'Entrée nord')
    c.page.fill(f'{_DW} [data-f=message]', 'Écho radar au nord.\nDescendez voir.')
    c.page.fill(f'{_DW} [data-f=brief]', 'Nouvelle tâche : reconnaissance du secteur.')
    kept = c.js(f"[...document.querySelectorAll('{E} [data-atflow] button, {_DW} [data-do=eddrgrp]')].map(b => !!b.__kept)")
    c.ok(len(kept) == 10 and all(kept), kept, 'the cards, « Essayer les clés » and the three group titles are the same elements after the keystrokes (SOG-0449)')
    c.eq(norm(c.text(f'{_DW} [data-dline="texts"]')), norm(' · '.join(['Entrée nord', T('dwLineMsg', n=35).replace('(s)', 's'), T('dwLineBrief', n=43).replace('(s)', 's')])),
         'the line of « Les textes » follows the typing', what='the line of the texts')
    cards = c.js(_DW_CARDS)
    c.eq([norm(cards[1][1]), cards[1][3]], [f"{T('atDrawer', n=2)} · Entrée nord", '✓'], 'the card follows the typing: its title, its mark (nothing left to complete)',
         what='the card of drawer 2')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N78_390_drawer_texts.png')
    c.js(f"document.querySelector('{_DW}').scrollIntoView({{block: 'start'}})")
    c.shot('N78_390_drawer_zone.png')
    # another key: an object to find — chosen among the objects of the mission; the fallback time stays
    c.page.select_option(f'{_DW} [data-f=key]', 'object')
    c.until(f"!!document.querySelector('{_DW} [data-f=object]')", what='the key « object »')
    c.eq([c.js(_DW_VAL, f) for f in ('key', 'object', 'fallback', 'shown')], ['object', 'OBJ-1', '60', None], 'the first object is proposed, the fallback time is kept', what='values')
    c.eq(norm(c.js(_DW_CARDS)[1][2]), T('atKey_object'), 'the card says the new key', what='the key on the card')
    # the onward route: chips
    c.tap(f'{_DW} [data-do="eddrgrp"][data-grp="route"]')
    c.until(f"getComputedStyle(document.querySelector('{_DW} [data-dgrp=route] .ms-dbody')).display !== 'none'", what='« La suite de route » unfolded')
    c.page.select_option(f'{_DW} [data-f=routeadd]', 'PT2')
    c.until(f"document.querySelectorAll('{_DW} [data-chip]').length === 1", what='one chip')
    c.page.select_option(f'{_DW} [data-f=routeadd]', 'DESTINATION')
    c.until(f"document.querySelectorAll('{_DW} [data-chip]').length === 2", what='two chips')
    c.page.select_option(f'{_DW} [data-f=routeadd]', 'PT1')
    c.until(f"document.querySelectorAll('{_DW} [data-chip]').length === 3", what='three chips')
    c.tap(f'{_DW} [data-chip="PT1"] [data-do="eddrchipdel"]')
    c.eq(c.js(f"[...document.querySelectorAll('{_DW} [data-chip]')].map(x => x.dataset.chip)"), ['PT2', 'DESTINATION'], 'a chip removed; the others in order', what='the route')
    # the arrival drawer: its fields; a key kept as it is would say so (N75) — here the hour
    c.page.click(f'{E} [data-atflow] [data-sel="D"]')
    c.until(f"document.querySelector('{_DW}')?.dataset.drawer === 'D'", timeout=3000, what='drawer 3 by ONE click after typing')
    c.eq(c.js(_DW_FIELDS), ['key', 'arrPoint', 'arrRadius', 'arrSpeed', 'arrGround', 'stopadd', 'fallback', 'title', 'message', 'brief', 'routeadd'], 'the fields of an arrival', what='fields')
    c.eq([c.js(_DW_VAL, f) for f in ('arrPoint', 'arrRadius', 'arrSpeed', 'arrGround')], ['DESTINATION', '1', '30', True], 'read from the file', what='the arrival')
    # « ＋ Tiroir »: the fifth, by the pilot's gesture; then an hour after take-off
    c.tap(f'{E} [data-atflow] [data-dradd]')
    c.until(f"document.querySelector('{_DW}')?.dataset.drawer === 'F'", what='the new drawer open (the first free letter)')
    c.eq([norm(c.text(f'{_DW} [data-dwhead]')), c.js(_DW_VAL, 'key'), c.js(_DW_FIELDS)], [T('dwSheet', n=5), 'hand', ['key', 'title', 'message', 'brief', 'routeadd']],
         'a new drawer: rank 5, the pilot\'s gesture, nothing else asked', what='the new drawer')
    c.page.fill(f'{_DW} [data-f=title]', 'Retour anticipé')
    c.page.select_option(f'{_DW} [data-f=key]', 'time')
    c.until(f"!!document.querySelector('{_DW} [data-f=delay]')", what='the key « hour »')
    c.eq(c.js(_DW_VAL, 'point'), 'ORIGIN', 'after the take-off by default', what='the point')
    c.page.fill(f'{_DW} [data-f=delay]', '20')
    # « À compléter »: one line per drawer
    c.tap(f'{E} [data-do="edtodo"]')
    c.until(f"!document.querySelector('{E} [data-edtodo]').hidden", what='the list')
    lines = c.js(f"[...document.querySelectorAll('{E} [data-edtodo] [data-dtodo]')].map(x => [x.dataset.dtodo, x.textContent.trim()])")
    c.eq([x[0] for x in lines], ['1', '3', '4', '5'], 'one line per drawer that has something to complete (drawer 2 has nothing left)', what='the drawers to complete')
    c.ok(norm(lines[0][1]) == T('dwTodoOf', name=1, what=T('dwTodo_noBrief')) and T('dwTodo_noFallback') in norm(lines[1][1]), lines,
         'each line names the drawer by its rank and says what is missing')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N78_390_todo.png')
    c.tap(f'{E} [data-do="edtodo"]')
    # « Retirer ce tiroir »: two presses, the second inert for a second; the ranks close up
    c.tap(f'{E} [data-atflow] [data-sel="B"]')
    c.until(f"document.querySelector('{_DW}')?.dataset.drawer === 'B'", what='drawer 1')
    c.js(f"""() => {{ const b = document.querySelector('{_DW} [data-do=eddrdel]'); b.click(); document.querySelector('{_DW} [data-do=eddrdel]').click() }}""")
    c.settle()
    c.ok(c.js(f"document.querySelector('{_DW}')?.dataset.drawer") == 'B' and norm(c.text(f'{_DW} [data-do=eddrdel]')) == T('plRemoveAnyway'),
         c.text(f'{_DW} [data-do=eddrdel]'), 'a double press removes nothing: the button now says « Retirer quand même »')
    c.wait(1100)
    c.tap(f'{_DW} [data-do=eddrdel]')
    c.until(f"!document.querySelector('{_DW}')", what='the drawer removed, back to the departure')
    c.eq([[x[0], norm(x[1])] for x in c.js(_DW_CARDS)],
         [['C', f"{T('atDrawer', n=1)} · Entrée nord"], ['D', f"{T('atDrawer', n=2)} · Retour"], ['E', f"{T('atDrawer', n=3)} · Naufragé"],
          ['F', f"{T('atDrawer', n=4)} · Retour anticipé"]], 'the ranks close up, the letters stay', what='the cards after the removal')
    # a wide screen: the sheet of the drawer on the right
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.tap(f'{E} [data-atflow] [data-sel="C"]')
    c.until(f"document.querySelector('{_DW}')?.dataset.drawer === 'C'", what='drawer 1 on a wide screen')
    wide = c.js(f"[...document.querySelectorAll('{_DW} .ms-dbody')].map(x => getComputedStyle(x).display !== 'none').concat([...document.querySelectorAll('{_DW} [data-dline]')].map(x => getComputedStyle(x).display === 'none'))")
    c.eq(wide, [True, True, True, True, True, True], 'on a wide screen the groups are unfolded and say no line', what='the groups on a wide screen')
    c.shot('N78_1280_drawer_object.png')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    got = c.js("""async (p) => { if (!globalThis.jsyaml) await import('/frame/lib/js-yaml.min.js'); const MS = await import('/frame/lib/mission.js');
      const d = globalThis.jsyaml.load(await (%s)(p), { schema: globalThis.jsyaml.CORE_SCHEMA });
      return { parts: d.phases, read: MS.readMission(d).drawers.map(x => [x.rank, x.id, x.key.kind, x.keyWhy]), zones: d.zones.map(z => z.id), objects: d.objects.map(o => o.id) } }""" % _TEXT_OF, path)
    c.eq(got['parts'], [
        {'id': 'C', 'title': 'Entrée nord', 'fallback_delay_min': 60, 'trigger': norm(row(c, 'dwSaid_object', EDTX_FILE)), 'message': 'Écho radar au nord.\nDescendez voir.',
         'brief': 'Nouvelle tâche : reconnaissance du secteur.', 'trigger_object': 'OBJ-1', 'route_order': ['PT2', 'DESTINATION']},
        {'id': 'D', 'title': 'Retour', 'trigger_condition': {'kind': 'arrival', 'point': 'DESTINATION', 'radius_nm': 1, 'speed_max_kt': 30, 'require_on_ground': True}},
        {'id': 'E', 'title': 'Naufragé', 'trigger_object': 'OBJ-1', 'fallback_delay_min': 90},
        {'id': 'F', 'title': 'Retour anticipé', 'trigger': norm(T('dwSaid_time', n=20, p=T('dwAtTakeoff'))), 'trigger_point': 'ORIGIN', 'trigger_delay_min': 20}],
        'the file: drawer B removed; C keyed by the object BY IDENTIFIER (its zone key and « zone montrée » gone, its fallback time kept), its words neutral; '
        'D and E untouched; the new F after take-off', what='phases')
    c.eq(got['read'], [[1, 'C', 'object', ''], [2, 'D', 'arrival', ''], [3, 'E', 'object', ''], [4, 'F', 'time', '']], 'the reader reads them', what='read back')
    c.eq([got['zones'], got['objects']], [['ZONE-1'], ['OBJ-1', 'OBJ-2']], 'the zone and the objects stay at the top of the mission (a drawer cites them, it never carries them)',
         what='zones and objects')
    c.js(_REG_CLEAR)



DV_FILE = 'modules/missions/drawers_view.js'
_PV = f"Object.fromEntries(['name', 'key', 'case', 'note', 'msg', 'brief', 'route'].map(k => [k, (document.querySelector('{_DW} [data-pv' + k + ']')?.textContent || '').trim()]))"


@case('N79', 'Missions › the workshop, « Ce que le pilote voit » and the stops of an arrival: the sheet of a drawer shows the drawer as the '
      'pilot will see it — closed: its name, the sentence of its key and the note, in the very words of the pilot\'s screen (the same '
      'function); open: its message, its briefing, its onward route — read from the document of the sitting by the reader, and it '
      'follows the typing in place; a zone that is not shown says « s\'ouvre en vol »; the stops an arrival requires are chips, added '
      'from the places of the mission and removed one by one', 'N', tags=('missions', 'security'), designs=('standard',), screens=False,
      langs4=False,
      rule='SOG-0445, end of lot P3 (modules/missions/EDITOR.md § 7 octies; the mock-up tiroirs.html « Ce que le pilote voit »; '
      '`describe` of modules/missions/drawers_view.js, the session « Affectation »: one function, so that the workshop never says '
      'something else than the pilot\'s screen; Security review of 18 Nov: the preview reads the document through the reader, never '
      'the rows in memory)')
def n79(c):
    path = 'missions/X_REG/X-001A/missionX-001A.yaml'
    T = lambda k, f=EDTX_FILE, **v: norm(__import__('functools').reduce(lambda t, kv: t.replace('{' + kv[0] + '}', str(kv[1])), v.items(), row(c, k, f)))  # noqa: E731
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    reg_open(c, _OBJ_TEXTS)
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the workshop')
    c.tap(f'{E} [data-atflow] [data-sel="C"]')
    c.until(f"document.querySelector('{_DW}')?.dataset.drawer === 'C'", what='the sheet of drawer 2')
    pv = c.js(_PV)
    c.eq([norm(pv['name']), norm(pv['key'])], [f"{T('atDrawer', n=2)} · Entrée du secteur", T('keyZone', DV_FILE)],
         'closed: its name and the sentence of its key — the words of the pilot\'s screen (a zone shown on the Map)', what='the closed drawer')
    c.ok(T('willOpen', DV_FILE).split('{t}')[0].strip() in norm(pv['note']) and norm(pv['note']).startswith(T('noLive', DV_FILE).split('{x}')[0].strip())
         and norm(pv['case']) == T('dwPilotCase'), [pv['case'], pv['note']],
         'and the note the pilot reads without a live position — it says its case itself, then the fallback time —, under the line « Sur '
         'l\'appareil du pilote : » (not the author\'s own)')
    c.eq([norm(pv['msg']), pv['brief'], pv['route']], [T('dwPilotNoMsg'), '', ''], 'open: no message yet, no briefing, no onward route', what='the open drawer')
    # it follows the typing and the boxes, in place
    c.js(f"document.querySelectorAll('{_DW} [data-pvbefore], {_DW} [data-pvafter]').forEach(x => x.__kept = true)")
    c.tap(f'{_DW} [data-f=shown]')
    c.page.fill(f'{_DW} [data-f=title]', 'Entrée nord')
    c.page.fill(f'{_DW} [data-f=message]', 'Écho radar au nord.')
    c.page.select_option(f'{_DW} [data-f=routeadd]', 'PT2')
    c.until(f"document.querySelectorAll('{_DW} [data-chip]').length === 1", what='one place in the onward route')
    pv = c.js(_PV)
    c.eq([norm(pv['name']), norm(pv['key']), pv['msg'], norm(pv['route'])],
         [f"{T('atDrawer', n=2)} · Entrée nord", T('keyHidden', DV_FILE), 'Écho radar au nord.', T('dwPilotRoute', r='Point deux')],
         'the title, the message and the route follow; a zone that is not shown: « s\'ouvre en vol »', what='after typing')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.js(f"document.querySelector('{_DW} [data-dgrp=pilot]').scrollIntoView({{block: 'center'}})")
    c.shot('N79_1280_pilot.png')
    # the stops of an arrival: chips
    c.tap(f'{E} [data-atflow] [data-sel="D"]')
    c.until(f"document.querySelector('{_DW}')?.dataset.drawer === 'D'", what='the sheet of drawer 3')
    c.eq(norm(c.js(_PV)['key']), T('keyArrival', DV_FILE, p='DESTINATION'), 'an arrival: the sentence of the pilot\'s screen', what='the key of an arrival')
    c.page.select_option(f'{_DW} [data-f=stopadd]', 'PT2')
    c.until(f"document.querySelectorAll('{_DW} [data-stop]').length === 1", what='one stop')
    c.page.select_option(f'{_DW} [data-f=stopadd]', 'PT1')
    c.until(f"document.querySelectorAll('{_DW} [data-stop]').length === 2", what='two stops')
    c.tap(f'{_DW} [data-stop="PT1"] [data-do="eddrstopdel"]')
    c.eq(c.js(f"[...document.querySelectorAll('{_DW} [data-stop]')].map(x => x.dataset.stop)"), ['PT2'], 'a stop removed; the other stays', what='the stops')
    # on a phone: the group is folded and says what it holds
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.settle()
    c.tap(f'{E} [data-atflow] [data-sel="C"]')
    c.until(f"document.querySelector('{_DW}')?.dataset.drawer === 'C'", what='drawer 2 on a phone')
    c.eq([c.js(f"getComputedStyle(document.querySelector('{_DW} [data-dgrp=pilot] .ms-dbody')).display"), norm(c.text(f'{_DW} [data-dline="pilot"]'))], ['none', T('dwPilotLine')],
         'folded on a phone, with its line', what='the group on a phone')
    c.tap(f'{_DW} [data-do="eddrgrp"][data-grp="pilot"]')
    c.until(f"getComputedStyle(document.querySelector('{_DW} [data-dgrp=pilot] .ms-dbody')).display !== 'none'", what='« Ce que le pilote voit » unfolded')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.js(f"document.querySelector('{_DW} [data-dgrp=pilot]').scrollIntoView({{block: 'start'}})")
    c.shot('N79_390_pilot.png')
    c.tap(f'{E} [data-do="edsave"]')
    c.until(f"!!document.querySelector('{E} [data-edpending]')", timeout=10000, what='saved')
    got = c.js("""async (p) => { if (!globalThis.jsyaml) await import('/frame/lib/js-yaml.min.js');
      const d = globalThis.jsyaml.load(await (%s)(p), { schema: globalThis.jsyaml.CORE_SCHEMA });
      return { c: d.phases[1], stops: d.phases[2].trigger_condition.required_points } }""" % _TEXT_OF, path)
    c.eq(got, {'c': {'id': 'C', 'title': 'Entrée nord', 'trigger_zone': 'ZONE-1', 'zone_shown': False, 'fallback_delay_min': 60, 'message': 'Écho radar au nord.',
                     'route_order': ['PT2']}, 'stops': ['PT2']},
         'the file: what was typed, « zone montrée » written false, the stop of the arrival by identifier', what='the saved file')
    c.js(_REG_CLEAR)



# ---- the session « Création de missions », second range: cases N90 to N109 (the trial of the keys, and what follows)
_TRIAL_JS = """async () => { const TR = await import('/modules/missions/editor_trial.js'), MS = await import('/frame/lib/mission.js'); const J = x => JSON.stringify(x);
  // an invented mission: XTST (45N 1E) → PT1 → TARGET → XTSU (44N 2E) at 120 kt; a zone around PT1 under 3 000 ft, an object near the target
  const doc = { mission: { id: 'X-001A', type: 'REG' }, title: 'Essai', cruise_speed_kt: 120,
    origin: { name: 'Base Test (XTST)', lat: 45, lon: 1 }, destination: { name: 'Base Test Sud (XTSU)', lat: 44, lon: 2 },
    target: { id: 'TARGET', name: 'Cible', lat: 44.6, lon: 1.4 },
    turning_points: [{ id: 'PT1', name: 'Un', lat: 44.8, lon: 1.2 }, { id: 'PT2', name: 'Deux', lat: 44.4, lon: 1.6 }],
    zones: [{ id: 'ZONE-1', name: 'Secteur', kind: 'search', centre: { lat: 44.8, lon: 1.2 }, radius_km: 5, ceiling_ft: 3000 }],
    objects: [{ id: 'OBJ-1', kind: 'person', name: 'Naufragé', lat: 44.6, lon: 1.42, detection_range_nm: 1, altitude_ft: 0, detection_height_ft: 2500 }],
    route_order: ['ORIGIN', 'PT1', 'TARGET', 'DESTINATION'],
    phases: [{ id: 'B', title: 'Zone', trigger_zone: 'ZONE-1', fallback_delay_min: 60 },
      { id: 'C', title: 'Objet', trigger_object: 'OBJ-1', fallback_delay_min: 90, route_order: ['PT2'] },
      { id: 'D', title: 'Retour', trigger_condition: { kind: 'arrival', point: 'DESTINATION', radius_nm: 1, speed_max_kt: 30, require_on_ground: true, required_points: ['PT2'] } },
      { id: 'E', title: 'Heure', trigger_point: 'ORIGIN', trigger_delay_min: 5 }, { id: 'F', title: 'Geste' }] };
  const other = { mission: { id: 'X-001A', type: 'REG' }, title: 'E', cruise_speed_kt: 120, origin: { name: 'Base Test (XTST)', lat: 45, lon: 1 },
    destination: { name: 'Base Test Sud (XTSU)', lat: 44, lon: 2 }, turning_points: [{ id: 'PT1', name: 'Un', lat: 44.8, lon: 1.2 }], route_order: ['ORIGIN', 'PT1', 'DESTINATION'],
    phases: [{ id: 'B', title: 'Tenue', trigger_condition: { kind: 'hover', point: 'PT1', radius_m: 50, duration_sec: 10, max_gap_sec: 2, speed_tolerance_kt: 5, height_min_ft: 0, height_max_ft: 50 },
      fallback_delay_min: 20 }, { id: 'C', title: 'Heure', trigger_point: 'GHOST', trigger_delay_min: 5 }] };
  const m = MS.readMission(doc), r3 = x => Math.round(x * 1000) / 1000;
  const said = r => r.log.map(l => l.min + ':' + l.ev + (l.rank ? ' ' + l.rank : '') + (l.how ? ' ' + l.how : '') + (l.why ? ' ' + l.why : '')).join(' | ');
  const sum = r => ({ ok: r.ok, fix: r.fix && [r3(r.fix.lat), r3(r.fix.lon), r.fix.altFt, r.fix.onGround, r.fix.gsKt], landed: r.landedMin, drawers: r.drawers.map(d => [d.rank, d.open, d.how, d.min]), log: said(r) });
  let threw = '';
  // des « missions » qui ne viennent pas du lecteur : un arrêt nul, une clé qui lève quand on la lit, des points qui ne sont pas des objets
  const trap = { ...m, drawers: [{ id: 'B', rank: 1, route: [null, 5], get key() { throw new Error('piège') } }] },
    stops = { ...m, drawers: [{ id: 'B', rank: 1, route: [], key: { kind: 'arrival', at: { lat: 44, lon: 2 }, radiusNm: 1, required: [null, 7, { id: 'X' }] } }] };
  for (const bad of [null, 7, {}, { drawers: 5 }, { drawers: [null, { id: '__proto__' }] }, trap, stops, { ...m, points: 5, routeOrder: 7 }])
    try { TR.trialRun(bad, { untilMin: 'x', hands: 3 }); TR.trialRun(bad, { untilMin: 60, altFt: 1000 }) } catch (e) { threw += e + ' | ' }
  const before = J(m), full = TR.trialRun(m, { untilMin: 120, altFt: 2000 });
  return { start: sum(TR.trialRun(m, { untilMin: 0, altFt: 2000 })), ten: sum(TR.trialRun(m, { untilMin: 10, altFt: 2000 })), full: sum(full), trail: [full.trail.length <= TR.TRIAL.trail, full.trail[0]],
    ceiling: sum(TR.trialRun(m, { untilMin: 30, altFt: 5000 })).log, noAlt: sum(TR.trialRun(m, { untilMin: 30 })).log,
    silent: sum(TR.trialRun(m, { untilMin: 120, altFt: 2000, declares: false })), hand: sum(TR.trialRun(m, { untilMin: 12, altFt: 2000, hands: { B: 3 } })).drawers[0],
    unjudged: sum(TR.trialRun(MS.readMission(other), { untilMin: 40, altFt: 1000 })), noRoute: [TR.trialRun(MS.readMission({ mission: { id: 'X-001A' }, title: 'x' }), { untilMin: 10 }).ok,
      TR.trialRun(null, { untilMin: 10 }).why], threw, trapped: [TR.trialRun(trap, { untilMin: 60 }).why, TR.trialRun(stops, { untilMin: 60, altFt: 1000 }).ok], untouched: J(m) === before } }"""


@case('N90', 'Missions › the workshop, the trial of the keys (pure part, no screen): the aircraft of the trial leaves the departure, follows '
      'the route of the departure at a constant speed, takes the onward route of a drawer that opens and lands at the arrival; each key '
      'is judged by the frame\'s crossing service on the path between two fixes — a zone crossed (under its ceiling), an object within '
      'range (and declared), an arrival landed after its required stops — and an hour by the reader\'s estimate; the order of the flight '
      '(only the first closed drawer can open; what is due plays as soon as the one before opens); a datum that is missing never '
      'satisfies a key: the log says « unknown » and why; a key the flight does not judge yet opens at its fallback time only; nothing '
      'is written in the mission, no input throws', 'N', tags=('missions', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0444, lot P4 (modules/missions/EDITOR.md § 4: « It runs the same pure judgement as the flight — frame/lib/crossing.js — '
      'else the trial lies. A datum that is missing never satisfies a key »; frame/INTEGRATION.md § 12b; the order: '
      'modules/missions/drawers.js): modules/missions/editor_trial.js')
def n90(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    r = c.js(_TRIAL_JS)
    none = [[1, False, None, None], [2, False, None, None], [3, False, None, None], [4, False, None, None], [5, False, None, None]]
    c.eq(r['start'], {'ok': True, 'fix': [45, 1, 2000, True, 0], 'landed': None, 'drawers': none, 'log': '0:start'},
         'at the departure: on the ground, every drawer closed', what='minute 0')
    c.eq([r['ten']['fix'], r['ten']['drawers'][0], r['ten']['log']], [[44.728, 1.272, 2000, False, 120], [1, True, 'zone', 6.25], '0:start | 6.25:open 1 zone'],
         'ten minutes later: 20 NM along the route, the zone around PT1 entered at 6 min 15 s', what='minute 10')
    c.eq(r['full'], {'ok': True, 'fix': [44, 2, 2000, True, 0], 'landed': 37,
                     'drawers': [[1, True, 'zone', 6.25], [2, True, 'object', 14.75], [3, True, 'arrival', 37], [4, True, 'time', 37], [5, False, None, None]],
                     'log': '0:start | 6.25:open 1 zone | 14.75:open 2 object | 14.75:route 2 | 37:landed | 37:open 3 arrival | 37:open 4 time | 37:hand 5'},
         'the whole flight: the zone, the object within range (the aircraft then takes the onward route of that drawer, through PT2), the arrival landed after its '
         'required stop, the hour — due since minute 5 — as soon as the drawer before opens; the last one is to be opened by hand', what='the whole flight')
    c.eq(r['trail'], [True, [45, 1]], 'the trail starts at the departure and is bounded', what='the trail')
    c.eq([r['ceiling'], r['noAlt']], ['0:start | 6.25:ceiling 1', '0:start | 6.25:unknown 1 alt'],
         'above the ceiling of the zone: said, nothing opens; without an altitude: UNKNOWN, said when the aircraft is in the zone — a missing datum never satisfies a key',
         what='the ceiling and a missing altitude')
    c.eq([r['silent']['drawers'][:3], r['silent']['log']], [[[1, True, 'zone', 6.25], [2, True, 'fallback', 90], [3, False, None, None]],
                                                             '0:start | 6.25:open 1 zone | 14.75:near 2 | 37:landed | 90:open 2 fallback | 90:stops 3'],
         'an object within range but not declared: « à portée » is said, the drawer opens at its fallback time; the arrival then says the stop was not made',
         what='within range AND declared')
    c.eq(r['hand'], [1, True, 'hand', 3], 'the pilot\'s gesture at minute 3 opens the first drawer', what='by hand')
    c.eq([r['unjudged']['drawers'], r['unjudged']['log']], [[[1, True, 'fallback', 20], [2, False, None, None]], '0:start | 0:unjudged 1 | 20:open 1 fallback | 20:unread 2 | 37:landed'],
         'a key the flight does not judge yet (a hover) opens at its fallback time only, and says so; a key the reader cannot read stays closed, and says so',
         what='not judged, not read')
    c.ok(r['noRoute'] == [False, 'route'] and r['threw'] == '' and r['untouched'] is True, [r['noRoute'], r['threw'], r['untouched']],
         'a mission without a route to follow: no trial, said; no hostile input throws; the mission read is not touched')
    c.eq(r['trapped'], ['data', True], 'a « mission » that is not the reader\'s: a key that throws when read gives « no trial » (never an exception); null stops of '
         'an arrival are skipped', what='inputs that are not the reader\'s')



# an invented mission for the trial: XTST (45N 1E) → PT1 → TARGET → XTSU (44N 2E) at 120 kt and 2 000 ft; a zone around PT1 under 3 000 ft,
# an object near the target (the same as the pure case N90, as a file)
_TRIAL_MISSION = """mission: { id: X-001A, type: REG, subtype: RECHERCHE }
title: Mission d'essai
summary: Une recherche inventée.
cruise_speed_kt: 120
cruise_level: 2000 ft
origin: { name: Base Test (XTST), lat: 45.0, lon: 1.0 }
destination: { name: Base Test Sud (XTSU), lat: 44.0, lon: 2.0 }
target: { id: TARGET, name: Cible d'essai, lat: 44.6, lon: 1.4 }
turning_points:
  - { id: PT1, name: Point un, lat: 44.8, lon: 1.2 }
  - { id: PT2, name: Point deux, lat: 44.4, lon: 1.6 }
zones:
  - { id: ZONE-1, name: Secteur nord, kind: search, centre: { lat: 44.8, lon: 1.2 }, radius_km: 5, ceiling_ft: 3000 }
objects:
  - { id: OBJ-1, kind: person, name: Naufragé, lat: 44.6, lon: 1.42, detection_range_nm: 1, altitude_ft: 0, detection_height_ft: 2500 }
route_order: [ORIGIN, PT1, TARGET, DESTINATION]
phases:
  - { id: B, title: Zone, trigger_zone: ZONE-1, fallback_delay_min: 60 }
  - { id: C, title: Objet, trigger_object: OBJ-1, fallback_delay_min: 90, route_order: [PT2] }
  - { id: D, title: Retour, trigger_condition: { kind: arrival, point: DESTINATION, radius_nm: 1, speed_max_kt: 30, require_on_ground: true, required_points: [PT2] } }
  - { id: E, title: Geste }
teams:
  - { name: ALPHA1, service: Service d'essai, type: H135, role: recherche }
"""
_TRIAL_TEXTS = [_ED_TEXTS[0], ['missions/X_REG/X-001A/missionX-001A.yaml', _TRIAL_MISSION]]
_TR = f'{E} [data-trial]'
_TR_SET = f"""(v) => {{ const r = document.querySelector('{_TR} [data-f=min]'); r.value = String(v); r.dispatchEvent(new Event('input', {{ bubbles: true }})); return r.value }}"""
_TR_STATES = f"[...document.querySelectorAll('{E} [data-atflow] [data-trstate]')].map(x => [x.dataset.trstate, x.dataset.open, x.textContent.trim()])"
_TR_LOG = f"[...document.querySelectorAll('{_TR} [data-trlog] li')].map(x => x.textContent.trim())"


@case('N91', 'Missions › the workshop, « Essayer les clés »: a button of the unfolding puts the trial pane in the place of the sheet, beside '
      'the map (never a window over it) — the time on a slider, the altitude and the speed of the aircraft of the trial, « le pilote dit '
      'Objet en vue », a log in plain sentences; the sketch shows the aircraft and its trail, each card of the unfolding says « ouvert à '
      'H + 6 min » or « fermé »; the slider updates everything in place (no button is redrawn); « Ouvrir à la main » plays the pilot\'s '
      'gesture; on a phone the map unfolds by itself; closing the trial brings the sheet back and nothing was written in the mission',
      'N', tags=('missions', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0444, lot P4 (modules/missions/EDITOR.md § 4 and § 7 decies; the mock-up modules/missions/maquette/atelier_essai_*.png; '
      'the same judgement as the flight: modules/missions/editor_trial.js on frame/lib/crossing.js, pure case N90; SOG-0449)')
def n91(c):
    path = 'missions/X_REG/X-001A/missionX-001A.yaml'
    T = lambda k, **v: norm(__import__('functools').reduce(lambda t, kv: t.replace('{' + kv[0] + '}', str(kv[1])), v.items(), row(c, k, EDTX_FILE)))  # noqa: E731
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    reg_open(c, _TRIAL_TEXTS)
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the workshop')
    c.ok(c.count(_TR) == 0 and norm(c.text(f'{E} [data-atflow] [data-trbtn]')) == T('trBtn'), c.text(f'{E} [data-atflow] [data-trbtn]'),
         '« Essayer les clés » is a button of the unfolding; no trial at the opening')
    c.tap(f'{E} [data-atflow] [data-trbtn]')
    c.until(f"!!document.querySelector('{_TR}')", what='the trial pane')
    c.ok(c.count(f'{E} [data-steps]') == 0 and c.js(f"getComputedStyle(document.querySelector('{E} .ms-atgrid')).display") == 'grid', 'not beside',
         'the pane takes the place of the sheet, beside the map and the unfolding')
    c.eq(c.js(f"[...document.querySelectorAll('{_TR} [data-k=edtr]')].map(x => [x.dataset.f, x.type === 'checkbox' ? x.checked : x.value])"),
         [['min', '0'], ['alt', '2000'], ['speed', '120'], ['declares', True]], 'the time at zero, the altitude and the speed of the mission, the pilot declares', what='the fields')
    c.eq([norm(x) for x in c.js(_TR_LOG)], [norm(f"{T('trAt', m=0)} — {T('trStart', n=4).replace('(s)', 's')}")], 'the log starts at the departure', what='the log at zero')
    c.eq(c.js(_TR_STATES), [[str(n), '', T('trClosed')] for n in (1, 2, 3, 4)], 'every card says « fermé »', what='the cards at zero')
    # the slider: everything follows in place, no button is redrawn
    c.js(f"document.querySelectorAll('{E} button').forEach(b => b.__kept = true)")
    c.eq(c.js(_TR_SET, 10), '10', 'the slider at ten minutes', what='the slider')
    kept = c.js(f"[...document.querySelectorAll('{E} button')].map(b => !!b.__kept)")
    c.ok(len(kept) >= 10 and all(kept), kept, 'no button was redrawn by the slider (SOG-0449)')
    c.eq([norm(c.text(f'{_TR} [data-trlabel]')), c.js(_TR_STATES)[0], norm(c.js(_TR_LOG)[1])],
         [T('trAt', m=10), ['1', '1', T('trOpenAt', m=6)], norm(f"{T('trAt', m=6)} — {T('trOpen_zone', n=1)}")],
         'ten minutes later: the zone was entered at H + 6 min, the card of drawer 1 says so, the log too', what='minute 10')
    c.ok(c.count(f'{E} [data-atmapbody] [data-trplane]') == 1 and c.count(f'{E} [data-atmapbody] [data-trtrail]') == 1, 'no aircraft', 'the sketch shows the aircraft and its trail')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N91_1280_trial.png')
    # the whole flight: the object (the aircraft takes the onward route), the arrival landed after its stop; the last drawer is the pilot's
    c.js(_TR_SET, 40)
    log = c.js(_TR_LOG)
    c.eq([x[1:] for x in c.js(_TR_STATES)], [['1', T('trOpenAt', m=6)], ['1', T('trOpenAt', m=14)], ['1', T('trOpenAt', m=37)], ['', T('trClosed')]],
         'at forty minutes: three drawers open, the fourth is the pilot\'s gesture', what='the cards at minute 40')
    c.ok(all(any(norm(t) in norm(x) for x in log) for t in (T('trOpen_object', n=2), T('trEv_route', n=2), T('trEv_landed'), T('trOpen_arrival', n=3), T('trEv_hand', n=4))), log,
         'the log in sentences: the object found, the onward route taken, landed, the arrival, « à ouvrir à la main »')
    c.eq(norm(c.text(f'{_TR} [data-trhand]')), T('trHandBtn', n=4), '« Ouvrir à la main le tiroir 4 »', what='the gesture button')
    c.tap(f'{_TR} [data-trhand]')
    c.until(f"document.querySelector('{_TR} [data-trhand]').disabled", what='every drawer open')
    c.eq(c.js(_TR_STATES)[3][1:], ['1', T('trOpenAt', m=40)], 'the gesture opens it at the minute of the slider', what='drawer 4')
    # a datum that is missing never satisfies a key; an object not declared stays closed
    c.tap(f'{_TR} [data-do="edtrreset"]')
    c.page.fill(f'{_TR} [data-f=alt]', '')
    c.tap(f'{_TR} [data-f=declares]')
    c.js(_TR_SET, 20)
    log = c.js(_TR_LOG)
    c.ok(any(norm(T('trUnknown_alt', n=1)) in norm(x) for x in log) and c.js(_TR_STATES)[0][1] == '', log,
         'without an altitude the zone under a ceiling is UNKNOWN: said, and the drawer stays closed')
    c.page.fill(f'{_TR} [data-f=alt]', '2000')
    c.js(_TR_SET, 20)
    c.ok(any(norm(T('trEv_near', n=2)) in norm(x) for x in c.js(_TR_LOG)) and c.js(_TR_STATES)[1][1] == '', c.js(_TR_LOG),
         'within range but not declared: « il reste fermé tant que le pilote ne dit pas Objet en vue »')
    # on a phone: the map unfolds by itself, the pane is under the unfolding
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.settle()
    c.ok(c.js(f"getComputedStyle(document.querySelector('{E} [data-atmapbody]')).display") != 'none', 'folded', 'on a phone the map unfolds by itself during the trial')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.js(f"document.querySelector('{_TR}').scrollIntoView({{block: 'start'}})")
    c.shot('N91_390_trial.png')
    c.js(f"document.querySelector('{E} [data-atmap]').scrollIntoView({{block: 'start'}})")
    c.shot('N91_390_trial_map.png')
    # closing the trial: the sheet is back, nothing was written
    c.tap(f'{_TR} [data-do="edtrialoff"]')
    c.until(f"!document.querySelector('{_TR}') && !!document.querySelector('{E} [data-steps]')", what='the sheet back')
    c.tap(f'{E} [data-do="edsave"]')
    c.wait(400)
    c.eq(c.js(_TEXT_OF, path), _TRIAL_MISSION, 'the trial wrote nothing in the mission: the file is the same', what='the file')
    c.js(_REG_CLEAR)



# the pure part of the workshop's map: what it draws of the rows of the Lieux (modules/missions/editor_map.js, mapFeatures)
_MAPF_JS = """async () => {
  const EM = await import('/modules/missions/editor_map.js'), ED = await import('/modules/missions/editor.js');
  const doc = { mission: { id: 'X-001A', type: 'REG' }, title: 'x',
    origin: { name: 'Base Test (XTST)', lat: 45.0, lon: 1.0 }, destination: { name: 'Base Test Sud (XTSU)' },
    target: { id: 'TARGET', name: 'Cible', lat: 44.6, lon: 1.4 },
    turning_points: [{ id: 'PT1', name: 'Point un', lat: 44.8, lon: 1.2 }, { id: 'PT2', name: 'Hors bornes', lat: 95, lon: 1.6 }, { id: 'PT3', name: 'Sans position' }],
    zones: [{ id: 'ZONE-1', name: 'Ronde', centre: { lat: 44.8, lon: 1.2 }, radius_km: 5 },
      { id: 'ZONE-2', name: 'Contour', points: [{ lat: 44.5, lon: 1.5 }, { lat: 44.5, lon: 1.7 }, { lat: 44.4, lon: 1.7 }, { lat: 44.4, lon: 1.5 }] },
      { id: 'ZONE-3', name: 'Rayon hostile', centre: { lat: 44.2, lon: 1.9 }, radius_km: 99999 },
      { id: 'ZONE-4', name: 'Deux sommets', points: [{ lat: 44.5, lon: 1.5 }, { lat: 44.5, lon: 1.7 }, { lat: 'x', lon: 1.7 }] }],
    objects: [{ id: 'OBJ-1', kind: 'person', name: 'N'.repeat(200), lat: 44.6, lon: 1.42, detection_range_nm: 1 }] };
  const rows = ED.placesOf(doc), before = JSON.stringify([rows, doc]);
  const f = EM.mapFeatures(rows, { zones: doc.zones, adPos: n => /XTSU/.test(n) ? { lat: 44.0, lon: 2.0 } : null,
    path: [{ lat: 45, lon: 1 }, { lat: 44.8, lon: 1.2 }, { lat: 999, lon: 0 }, { lat: 44, lon: 2 }],
    run: { ok: true, trail: [[45, 1], [44.9, 1.1], ['x', 2], [44.85, 1.15]] } });
  const kindOf = i => rows[i].kind + (rows[i].id ? ':' + rows[i].id : ''), R = 6371.0088, rad = Math.PI / 180,
    km = (a, b) => { const h = Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lon - a.lon) * rad / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)) },
    ring = f.polygons.find(p => kindOf(+p.id.slice(6)) === 'zone:ZONE-1').rings[0], far = ring.map(p => km({ lat: 44.8, lon: 1.2 }, p)),
    inBox = p => p.lon >= f.box.w && p.lon <= f.box.e && p.lat >= f.box.s && p.lat <= f.box.n;
  let threw = '';
  const hostile = [null, 'x', 42, [null, 7, 'x', { kind: 'zone', i: '__proto__', poly: 4 }, { kind: 'zone', i: -1, poly: 4 }, { kind: 'pt', lat: {}, lon: [] }]];
  for (const h of hostile) try { EM.mapFeatures(h, { zones: h, adPos: () => { throw new Error('x') }, path: h, run: { ok: true, trail: h } }) } catch (e) { if (!/^Error: x$/.test(String(e))) threw += String(e) }
  return { points: f.points.map(p => [p.id === 'plane' ? 'plane' : kindOf(+p.id.slice(6)), p.kind, p.lat, p.lon]),
    labels: [f.points.find(p => p.kind === 'object').label, EM.mapFeatures([{ kind: 'pt', name: 'N'.repeat(200), lat: 1, lon: 1 }]).points[0].label.length],
    polygons: f.polygons.map(p => [kindOf(+p.id.slice(6)), p.rings.length, p.rings[0].length]),
    circle: [ring.length, +ring[0].lat.toFixed(4), ring[0].lon, +Math.min(...far).toFixed(2), +Math.max(...far).toFixed(2)],
    lines: f.lines.map(l => [l.id, !!l.dash, l.points.length]), box: f.box, tags: f.labels.map(l => [l.text, l.lat, l.lon]),
    longTag: EM.mapFeatures([{ kind: 'pt', id: 'I'.repeat(40), lat: 1, lon: 1 }, { kind: 'pt', name: 'Sans identifiant · suite', lat: 2, lon: 2 }]).labels.map(l => l.text),
    inside: [...f.points, ...f.polygons.flatMap(p => p.rings[0]), ...f.lines.flatMap(l => l.points)].every(inBox),
    none: [EM.mapFeatures([]).box, EM.mapFeatures(ED.placesOf({ mission: { id: 'X-001A' }, origin: { name: 'Sans position' } })).box],
    empty: hostile.map(h => { const g = EM.mapFeatures(h, { zones: h, path: h, run: { ok: true, trail: h } }); return [g.points.length, g.lines.length, g.polygons.length, g.box] }),
    threw, untouched: JSON.stringify([rows, doc]) === before } }"""


@case('N92', 'Missions › the workshop, the map (pure part, no screen): what the map draws of the rows of the Lieux — every located place '
      'as a point of its kind (the departure and the arrival at the position of the base when the file gives none), a round zone as a '
      'ring around its centre at its radius, a contour by its vertices read in the file, the route of the departure as a dashed line, '
      'and during a trial of the keys the trail and the aircraft; the frame holds everything; a number out of its bounds is never '
      'brought back into them — the element is not drawn; no hostile input throws; nothing read is touched',
      'N', tags=('missions', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0444, lot P2, first brick (modules/missions/EDITOR.md § 2 and § 7 undecies; modules/maps/INTEGRATION.md § 7 bis, '
      '`authorLayers`: points, lines, polygons): modules/missions/editor_map.js, `mapFeatures`; a file of data/ is an input that is not '
      'trusted: bounded numbers, labels cut')
def n92(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    r = c.js(_MAPF_JS)
    c.eq(r['points'], [['dep', 'dep', 45, 1], ['arr', 'arr', 44, 2], ['target:TARGET', 'target', 44.6, 1.4], ['zone:ZONE-1', 'zone', 44.8, 1.2], ['zone:ZONE-2', 'zone', 44.45, 1.6], ['zone:ZONE-3', 'zone', 44.2, 1.9],
                       ['pt:PT1', 'pt', 44.8, 1.2], ['object:OBJ-1', 'object', 44.6, 1.42], ['plane', 'plane', 44.85, 1.15]],
         'every located place is a point of its kind: the arrival at the position of the base; a round zone is also a point at its centre, a contour at its middle (they are moved by it); a '
         'zone whose radius is out of bounds is its centre alone; a point at '
         'latitude 95 and a point without a position are not drawn; the aircraft of the trial at the end of its trail', what='the points')
    c.eq(r['labels'], ['OBJ-1', 60], 'a label is the identifier, else the name cut at sixty signs', what='the labels')
    c.eq(r['polygons'], [['zone:ZONE-1', 1, 64], ['zone:ZONE-2', 1, 4]],
         'a round zone is a ring of 64 vertices, a contour its own vertices; a contour with a vertex that is not a position is not drawn', what='the zones')
    c.ok(r['circle'][:3] == [64, 44.845, 1.2] and 4.99 <= r['circle'][3] <= r['circle'][4] <= 5.01, r['circle'],
         'the ring starts due north of the centre and every vertex is at 5 km of it')
    c.eq([r['tags'], r['longTag']], [[['XTST', 45, 1], ['XTSU', 44, 2], ['TARGET', 44.6, 1.4], ['ZONE-1', 44.8, 1.2], ['ZONE-2', 44.45, 1.6], ['ZONE-3', 44.2, 1.9],
                                       ['PT1', 44.8, 1.2], ['OBJ-1', 44.6, 1.42]], ['I' * 24, 'Sans identifiant']],
         'every place drawn carries a label: its identifier (the code of an aerodrome), on its point, or in the middle of its contour; cut at 24 signs; without an '
         'identifier, the beginning of its name', what='the labels')
    c.eq(r['lines'], [['route', True, 3], ['trail', False, 3]], 'the route of the departure is dashed (a position out of bounds is skipped), the trail of the trial is plain',
         what='the lines')
    c.ok(r['inside'] is True and r['box']['w'] < 1 and r['box']['e'] > 2 and r['box']['s'] < 44 and r['box']['n'] > 45, r['box'], 'the frame holds every element, with a margin')
    c.eq(r['none'], [None, None], 'nothing located: no frame (the screen then shows no map)', what='nothing located')
    c.eq(r['empty'], [[0, 0, 0, None]] * 4, 'rows, zones, a route and a trail that are not what they should be: nothing is drawn', what='hostile inputs')
    c.ok(r['threw'] == '' and r['untouched'] is True, [r['threw'], r['untouched']], 'no hostile input throws (but the caller\'s own function); what was read is not touched')



# MapLibre is loaded on demand: its Map is wrapped the moment it appears, to keep the map of the workshop (window.__edMap, taken when the screen frames it)
# and to count the maps removed (window.__edMapRemoved) — nothing of this is in the product
_EDMAP_HOOK = """(() => { let ml; window.__edMap = null; window.__edMapRemoved = 0;
  const hook = v => { const M = v && v.Map; if (M && !M.prototype.__ed) { M.prototype.__ed = 1;
    const fb = M.prototype.fitBounds, rm = M.prototype.remove;
    M.prototype.fitBounds = function (...a) { if (this.getContainer().closest('[data-atmapslot]')) window.__edMap = this; return fb.apply(this, a) };
    M.prototype.remove = function (...a) { window.__edMapRemoved++; return rm.apply(this, a) } } return v };
  Object.defineProperty(window, 'maplibregl', { configurable: true, get() { return ml }, set(v) { ml = hook(v) } }) })()"""
_EDMAP = f'{E} [data-atmapbody]'
_EDMAP_XY = """([la, lo]) => { const m = window.__edMap, p = m.project([lo, la]), r = m.getContainer().getBoundingClientRect(); return [r.left + p.x, r.top + p.y] }"""
# the author's elements drawn under a position (or, without one, in the whole view): their identifiers, once each
_EDMAP_IDS = """(at) => { const m = window.__edMap; if (!m) return null; const p = at ? m.project([at[1], at[0]]) : null;
  const f = (p ? m.queryRenderedFeatures([[p.x - 3, p.y - 3], [p.x + 3, p.y + 3]]) : m.queryRenderedFeatures()).filter(x => x.layer.id.startsWith('me-auth-'));
  return [...new Set(f.map(x => x.properties.fid))].sort() }"""
_EDMAP_VIEW = "(() => { const c = window.__edMap.getCenter(); return [+c.lat.toFixed(3), +c.lng.toFixed(3), +window.__edMap.getZoom().toFixed(2)] })()"


@case('N93', 'Missions › the workshop, the map: the mission is drawn on the suite\'s map base in a frame of fixed size — the places, the '
      'zones, the objects, the route of the departure — in place of the sketch, which stays under it until the map is there (and when '
      'there is none); a place touched leads to its row of the Lieux, open; the map follows the typing in place (no button is redrawn, '
      'the same canvas); « Recentrer » brings the view back; during a trial of the keys it shows the aircraft and its trail and a touch '
      'does nothing; on a phone it starts when unfolded; without tiles, a plain background; leaving the workshop removes the map',
      'N', tags=('missions',), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0444, lot P2, first brick (modules/missions/EDITOR.md § 2 and § 7 undecies; modules/maps/INTEGRATION.md § 7 and § 7 bis: '
      '`startTiles`, `authorLayers`; SOG-0449; V3_SPECIFICATION § 7.1 rule 22: nothing moves when the map arrives)')
def n93(c):
    T = lambda k: norm(row(c, k, EDTX_FILE))  # noqa: E731
    c.page.add_init_script(_EDMAP_HOOK)
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    reg_open(c, _TRIAL_TEXTS)
    # the list, then the registry: the page is drawn many times and the map library is never asked for (the condition of module.js's owner)
    loaded = "performance.getEntriesByType('resource').filter(e => /maplibre-gl|outlines\\.js/.test(e.name)).length"
    c.eq([c.js(loaded), c.js('typeof window.maplibregl'), c.count('.maplibregl-canvas')], [0, 'undefined', 0],
         'the list and the registry open without loading MapLibre nor the outlines: the map library waits for the workshop', what='before the workshop')
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"!!document.querySelector('{E} [data-steps]')", timeout=10000, what='X-001A in the workshop')
    box = c.js(f"(() => {{ const r = document.querySelector('{_EDMAP} .ms-atmapframe').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] }})()")
    c.until(f"document.querySelector('{_EDMAP}')?.dataset.map === 'tiles' && !!window.__edMap", timeout=15000, what='the map of the suite in the workshop')
    c.until(f"(({_EDMAP_IDS})() || []).length >= 6", timeout=10000, what='the elements of the mission drawn')
    c.eq([c.js(f"(() => {{ const r = document.querySelector('{_EDMAP} .ms-atmapframe').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)] }})()"),
          c.count(f'{_EDMAP} [data-atmapslot] canvas'), c.js(f"document.querySelector('{_EDMAP} [data-atsketch]').hidden"),
          c.js(f"document.querySelector('{_EDMAP} [data-do=edmapfit]').disabled"), norm(c.text(f'{_EDMAP} [data-do=edmapfit]'))],
         [box, 1, True, False, T('atMapFit')], 'the map takes the place of the sketch in the same frame (nothing moved); « Recentrer » is given with it', what='the frame')
    c.eq([c.js(_EDMAP_IDS, None), c.js(_EDMAP_IDS, [44.8, 1.2]), c.js(_EDMAP_IDS, [44.4, 1.6])],
         [['place:0', 'place:1', 'place:2', 'place:3', 'place:4', 'place:5', 'place:6', 'route'], ['place:3', 'place:4', 'route'], ['place:5', 'route']],
         'the departure, the arrival, the target, the zone, the two points, the object and the route; at PT1: the point, its zone and the route; at PT2: the '
         'point and the route', what='the elements')
    c.eq(c.js(f"[...document.querySelectorAll('{_EDMAP} [data-maplbl]')].map(x => x.textContent).sort()"), ['OBJ-1', 'PT1', 'PT2', 'TARGET', 'XTST', 'XTSU', 'ZONE-1'],
         'every place says its identifier on the map (written by the page, not by a font of the background)', what='the labels on the map')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N93_1280_map.png')
    # a place touched leads to its row, open; the same canvas, the same view
    view = c.js(_EDMAP_VIEW)
    c.js(f"document.querySelector('{_EDMAP} canvas').__kept = true")
    c.page.mouse.click(*c.js(_EDMAP_XY, [44.4, 1.6]))
    c.until(f"!!document.querySelector('{E} [data-edplaces] [data-k=edplace][data-i=\"5\"][data-f=lat]')", what='the row of PT2, open')
    c.ok(c.js(f"document.querySelector('{_EDMAP} canvas').__kept === true") and c.js(_EDMAP_VIEW) == view and c.js(f"document.querySelector('{_EDMAP}').dataset.map") == 'tiles',
         [c.js(_EDMAP_VIEW), view], 'the screen was redrawn: the same map is put back (same canvas, same view)')
    # on a wide module the map and the unfolding stay in view while the sheet scrolls to the row
    c.js(f"document.querySelector('{E} [data-edplaces] [data-k=edplace][data-i=\"5\"][data-f=lat]').scrollIntoView({{block: 'center'}})")
    c.settle()
    top = c.js(f"(() => {{ const r = document.querySelector('{_EDMAP} .ms-atmapframe').getBoundingClientRect(); const h = document.querySelector('header')?.getBoundingClientRect().bottom || 0; return [r.top >= h, r.bottom <= innerHeight] }})()")
    c.eq(top, [True, True], 'the sheet scrolled to the row of the place: the map stays whole in view, under the header of the page (the left part is sticky)', what='the map in view')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N93_1280_row.png')
    # the map follows the typing, in place
    c.js(f"document.querySelectorAll('{E} button').forEach(b => b.__kept = true)")
    c.page.fill(f'{E} [data-edplaces] [data-k=edplace][data-i="5"][data-f=lat]', '44.3')
    c.until(f"(({_EDMAP_IDS})([44.3, 1.6]) || []).includes('place:5')", timeout=8000, what='PT2 moved on the map')
    kept = c.js(f"[...document.querySelectorAll('{E} button')].map(b => !!b.__kept)")
    c.ok(len(kept) >= 10 and all(kept) and 'place:5' not in c.js(_EDMAP_IDS, [44.4, 1.6]), kept, 'PT2 follows its latitude on the map; no button was redrawn (SOG-0449)')
    # « Recentrer » (the page may have scrolled to the row: the map is brought back in view first)
    c.js(f"document.querySelector('{_EDMAP}').scrollIntoView({{block: 'center'}})")
    x, y = c.js(_EDMAP_XY, [44.3, 1.1])
    c.page.mouse.move(x, y)
    c.page.mouse.down()
    c.page.mouse.move(x + 120, y + 60, steps=6)
    c.page.mouse.up()
    c.until(f"(() => {{ const v = {_EDMAP_VIEW}; return Math.abs(v[0] - {view[0]}) > 0.002 || Math.abs(v[1] - {view[1]}) > 0.002 }})()", what='the view moved by the author')
    c.tap(f'{_EDMAP} [data-do=edmapfit]')
    c.eq(c.js(_EDMAP_VIEW), view, '« Recentrer » brings the view back to the frame of the mission', what='the view')
    # the trial of the keys: the aircraft and its trail; a touch does nothing
    c.tap(f'{E} [data-do="edplaceok"]')
    c.tap(f'{E} [data-atflow] [data-trbtn]')
    c.until(f"!!document.querySelector('{_TR}')", what='the trial pane')
    c.js(_TR_SET, 10)
    c.until(f"['plane', 'trail'].every(k => (({_EDMAP_IDS})() || []).includes(k))", timeout=8000, what='the aircraft and its trail on the map')
    c.page.mouse.click(*c.js(_EDMAP_XY, [44.0, 2.0]))
    c.wait(300)
    c.ok(c.count(_TR) == 1 and c.count(f'{E} [data-steps]') == 0, 'the trial left', 'during the trial a touch on a place does nothing: the trial stays')
    c.tap(f'{_TR} [data-do="edtrialoff"]')
    c.until(f"!document.querySelector('{_TR}')", what='the trial closed')
    # on a phone: folded, the map waits; unfolded, it is there
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.settle()
    if c.js(f"getComputedStyle(document.querySelector('{_EDMAP}')).display") == 'none':
        c.tap(f'{E} [data-do="edmap"]')
    c.until(f"(() => {{ const k = document.querySelector('{_EDMAP} canvas'); return !!k && k.getBoundingClientRect().width > 300 }})()", timeout=10000, what='the map unfolded on a phone')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.js(f"document.querySelector('{E} [data-atmap]').scrollIntoView({{block: 'start'}})")
    c.shot('N93_390_map.png')
    # leaving the workshop removes the map
    c.tap(f'{E} [data-do="edcancel"]')
    c.until(f"!document.querySelector('{E}')", what='the workshop left')
    c.eq([c.js('window.__edMapRemoved'), c.count('.maplibregl-canvas')], [1, 0], 'the map is removed with the workshop', what='the map removed')
    c.ok(c.js(loaded) >= 1, c.js(loaded), 'the map library was loaded by the workshop, and only then')
    # without tiles: MapLibre on a plain background, the same elements
    c.page.route(re.compile(r'^https://tiles\.openfreemap\.org/styles/'), lambda route: route.abort('failed'))
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    c.settle()
    c.tap(f'{R} [data-rowid="X-001A"] > summary') if c.count(f'{R} [data-rowid="X-001A"][open]') == 0 else None
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"document.querySelector('{_EDMAP}')?.dataset.map === 'plain'", timeout=20000, what='the plain background')
    c.until(f"(({_EDMAP_IDS})() || []).length >= 8", timeout=10000, what='the elements on the plain background')
    c.tap(f'{E} [data-do="edcancel"]')
    c.js(_REG_CLEAR)



# the pure part of the map's gestures: a place posed, a place moved, the radius of a zone (modules/missions/editor.js)
_GEST_JS = """async () => {
  const ED = await import('/modules/missions/editor.js');
  const doc = { mission: { id: 'X-001A', type: 'REG' }, title: 'x', origin: { name: 'Base Test (XTST)', lat: 45.0, lon: 1.0 },
    destination: { name: 'Base Test Sud (XTSU)', lat: 44.0, lon: 2.0 }, target: { id: 'TARGET', name: 'Cible', lat: 44.6, lon: 1.4 },
    zones: [{ id: 'ZONE-1', name: 'Ronde', centre: { lat: 44.8, lon: 1.2 }, radius_km: 5 },
      { id: 'ZONE-2', name: 'Contour', points: [{ lat: 44.5, lon: 1.5 }, { lat: 44.5, lon: 1.7 }, { lat: 44.4, lon: 1.7 }] }],
    turning_points: [{ id: 'PT1', name: 'Point un', lat: 44.8, lon: 1.2, note: 'kept' }] };
  const rows = ED.placesOf(doc), before = JSON.stringify([rows, doc]), at = id => rows.findIndex(r => r.id === id);
  const p = ED.newPlace(rows, 'pt', doc, { lat: 44.123456789, lon: 1.987654321 }), z = ED.newPlace(p.rows, 'zone', doc, { lat: 44.5, lon: 1.5, radius: 5 }),
    o = ED.newPlace(z.rows, 'object', doc, { lat: 91, lon: 1 }), b = ED.newPlace(rows, 'rdv', doc);
  const moved = ED.movePlace(rows, at('PT1'), { lat: 44.75, lon: 1.25 }), grown = ED.placeRadius(rows, at('ZONE-1'), 7.456);
  const same = x => x === rows;
  let threw = '';
  for (const h of [null, 'x', 7, [null, 'x']]) try { ED.newPlace(h, 'pt', h, h); ED.movePlace(h, 0, h); ED.placeRadius(h, 0, 5); ED.newPlace(rows, h, doc, h) } catch (e) { threw += String(e) }
  return { posed: [p.at, p.rows[p.at].id, p.rows[p.at].lat, p.rows[p.at].lon, p.rows.length], zone: [z.at, z.rows[z.at].id, z.rows[z.at].radius, z.rows.map(r => r.kind).join(' ')],
    object: [o.rows[o.at].id, o.rows[o.at].lat, o.rows[o.at].lon, o.rows[o.at].confirm], blank: [b.rows[b.at].id, b.rows[b.at].lat, b.rows[b.at].lon],
    full: [ED.newPlace(rows, 'target', doc, { lat: 1, lon: 1 }), ED.newPlace(rows, 'dep', doc), ED.newPlace(rows, '__proto__', doc)],
    moved: [moved[at('PT1')].lat, moved[at('PT1')].lon, moved !== rows, moved[at('PT1')].name],
    refused: [same(ED.movePlace(rows, 0, { lat: 44, lon: 1 })), same(ED.movePlace(rows, 1, { lat: 44, lon: 1 })), same(ED.movePlace(rows, at('PT1'), { lat: 91, lon: 1 })),
      same(ED.movePlace(rows, at('PT1'), { lat: '44', lon: '1' })), same(ED.movePlace(rows, 'x', { lat: 44, lon: 1 })), same(ED.movePlace(rows, 99, { lat: 44, lon: 1 }))],
    radius: [grown[at('ZONE-1')].radius, same(ED.placeRadius(rows, at('ZONE-1'), 0.01)), same(ED.placeRadius(rows, at('ZONE-1'), 501)), same(ED.placeRadius(rows, at('ZONE-1'), NaN)),
      same(ED.placeRadius(rows, at('ZONE-2'), 5)), same(ED.placeRadius(rows, at('PT1'), 5)), same(ED.placeRadius(rows, at('ZONE-1'), '5'))],
    written: [ED.withPlaces(doc, moved).turning_points[0], ED.withPlaces(doc, grown).zones[0].radius_km, ED.withPlaces(doc, p.rows).turning_points[1],
      ED.withPlaces(doc, z.rows).zones[2]], threw, untouched: JSON.stringify([rows, doc]) === before } }"""


@case('N94', 'Missions › the workshop, the gestures of the map (pure part, no screen): a place posed is a new row at the place of its kind, '
      'with a free identifier and the position of the touch (five decimals); a place moved takes the new position; the radius of a round '
      'zone is set in km; the departure and the arrival are not moved (a contour is moved as a block: N96); a position or a radius out of bounds is refused — never '
      'brought back into its bounds —, the same rows are returned; what the file then writes is the row; no hostile input throws',
      'N', tags=('missions', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0444, lot P2, second brick, the pure part (modules/missions/EDITOR.md § 2: « After a pose the tool goes back to Sélection », '
      '§ 3: « Identifiers are given by the workshop »): modules/missions/editor.js `newPlace`, `movePlace`, `placeRadius`; audit 182 '
      '(only what changed is written)')
def n94(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    r = c.js(_GEST_JS)
    c.eq(r['posed'], [6, 'PT2', '44.12346', '1.98765', 7], 'a point posed: the next free identifier, after the points, the position at five decimals', what='a point posed')
    c.eq(r['zone'], [5, 'ZONE-3', '5', 'dep arr target zone zone zone pt pt'], 'a zone posed joins the zones, round, with its radius', what='a zone posed')
    c.eq([r['object'], r['blank']], [['OBJ-1', '', '', True], ['RDV-1', '', '']],
         'a position out of bounds is not kept: the row is created « à placer »; without a position (the button of the Lieux), the same', what='to place')
    c.eq(r['full'], [None, None, None], 'one target only; the departure and unknown kinds are never posed', what='refused poses')
    c.eq(r['moved'], ['44.75', '1.25', True, 'Point un'], 'a place moved takes the position, in new rows; its other fields stay', what='a place moved')
    c.eq(r['refused'], [True] * 6, 'refused, the SAME rows returned: the departure, the arrival, a latitude of 91, texts instead of numbers, a rank that is not one',
         what='refused moves')
    c.eq(r['radius'], ['7.46', True, True, True, True, True, True], 'the radius of a round zone at two decimals; 0.01 km, 501 km, not a number, a contour, a point, a text: '
         'refused', what='the radius')
    c.eq(r['written'], [{'id': 'PT1', 'name': 'Point un', 'lat': 44.75, 'lon': 1.25, 'note': 'kept'}, 7.46, {'id': 'PT2', 'lat': 44.12346, 'lon': 1.98765},
                        {'id': 'ZONE-3', 'centre': {'lat': 44.5, 'lon': 1.5}, 'radius_km': 5}],
         'what the file writes: the moved point keeps its other keys, the radius, the posed point, the posed zone', what='written')
    c.ok(r['threw'] == '' and r['untouched'] is True, [r['threw'], r['untouched']], 'no hostile input throws; the rows and the document read are not touched')



_EDTOOLS = f'{_EDMAP} [data-atmaptools]'
_EDTOOL_STATE = f"[...document.querySelectorAll('{_EDTOOLS} button')].map(b => [b.dataset.tool || b.dataset.do, b.getAttribute('aria-pressed'), b.disabled])"
_EDPLACE_VAL = f"""([i, f]) => document.querySelector('{E} [data-edplaces] [data-k=edplace][data-i="' + i + '"][data-f=' + f + ']')?.value ?? null"""
_EDPLACE_IDS = f"[...document.querySelectorAll('{E} [data-edplaces] [data-place]')].map(x => x.dataset.kind)"
_EDSEL = f"document.querySelector('{_EDMAP} [data-mapsel]')?.textContent ?? null"


def _ed_drag(c, a, b):
    """Presses the mouse on the position `a` of the workshop's map and releases it on `b` ([lat, lon])."""
    x0, y0 = c.js(_EDMAP_XY, a)
    x1, y1 = c.js(_EDMAP_XY, b)
    c.page.mouse.move(x0, y0)
    c.page.mouse.down()
    c.page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, steps=4)
    c.page.mouse.move(x1, y1, steps=4)
    c.page.mouse.up()


@case('N95', 'Missions › the workshop, the tools of the map: Sélection, Point, Zone, Objet above the map, with « Annuler le geste » and '
      '« Recentrer »; in Sélection a place touched is chosen (it says its name on the map, its row opens) and a located place is dragged — '
      'its row takes the new position; a round zone chosen shows the handle of its radius; with a tool of pose, a touch on the bare map '
      'poses the place there (a free identifier) and THE TOOL GOES BACK TO SÉLECTION: a second touch creates nothing; the departure is '
      'not moved; « Annuler le geste » gives back the rows of before the last gesture, never a typing; a tool taken redraws no button; '
      'the file saved carries what was posed',
      'N', tags=('missions', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0444, lot P2, second brick (modules/missions/EDITOR.md § 2: « After a pose the tool goes back to Sélection: no creation by '
      'accident », § 3 and § 7 terdecies; modules/maps/INTEGRATION.md § 7 bis: `tapPosition`, `dragHandles`, `previewLayer`, `createUndo`; '
      'the pure part: N94; SOG-0449)')
def n95(c):
    path = 'missions/X_REG/X-001A/missionX-001A.yaml'
    T = lambda k, **v: norm(__import__('functools').reduce(lambda t, kv: t.replace('{' + kv[0] + '}', str(kv[1])), v.items(), row(c, k, EDTX_FILE)))  # noqa: E731
    near = lambda v, x: v is not None and abs(float(v) - x) < 0.02  # noqa: E731
    c.page.add_init_script(_EDMAP_HOOK)
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    reg_open(c, _TRIAL_TEXTS)
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"document.querySelector('{_EDMAP}')?.dataset.map === 'tiles' && !!window.__edMap", timeout=15000, what='the map of the suite in the workshop')
    c.until(f"(({_EDMAP_IDS})() || []).length >= 6", timeout=10000, what='the elements of the mission drawn')
    c.eq([c.js(_EDTOOL_STATE), norm(c.text(f'{_EDMAP} [data-maphint]'))],
         [[['select', 'true', False], ['point', 'false', False], ['zone', 'false', False], ['object', 'false', False], ['edmapundo', None, True], ['edmapfit', None, False]],
          T('atHint_select')], 'the tools above the map: Sélection in hand, nothing to undo; the line says what the tool does', what='the tools')
    # Sélection: a place touched is chosen — its name on the map, its row open
    c.page.mouse.click(*c.js(_EDMAP_XY, [44.4, 1.6]))
    c.until(f"{_EDSEL} === 'PT2 · Point deux'", what='PT2 chosen, its name on the map')
    c.eq([c.js(_EDPLACE_VAL, [5, 'lat']), norm(c.text(f'{_EDMAP} [data-maphint]'))], ['44.4', T('atHint_chosen', name='PT2 · Point deux')],
         'its row of the Lieux is open; the line says it can be dragged', what='the chosen place')
    # a located place is dragged: its row takes the new position
    _ed_drag(c, [44.4, 1.6], [44.3, 1.75])
    c.until(f"(({_EDMAP_IDS})([44.3, 1.75]) || []).includes('place:5')", timeout=8000, what='PT2 moved on the map')
    lat, lon = c.js(_EDPLACE_VAL, [5, 'lat']), c.js(_EDPLACE_VAL, [5, 'lon'])
    c.ok(near(lat, 44.3) and near(lon, 1.75) and c.js(_EDTOOL_STATE)[4] == ['edmapundo', None, False] and c.js(_EDSEL) == 'PT2 · Point deux', [lat, lon, c.js(_EDTOOL_STATE)[4]],
         'the row of PT2 took the position of the release (five decimals); the gesture can be undone; PT2 stays chosen')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N95_1280_moved.png')
    c.tap(f'{_EDTOOLS} [data-do="edmapundo"]')
    c.until(f"(({_EDMAP_IDS})([44.4, 1.6]) || []).includes('place:5')", timeout=8000, what='PT2 back')
    c.eq(c.js(_EDTOOL_STATE)[4], ['edmapundo', None, True], '« Annuler le geste » gave the place back; nothing more to undo', what='undone')
    # the departure is not moved: the same press drags the map
    view = c.js(_EDMAP_VIEW)
    _ed_drag(c, [45.0, 1.0], [44.9, 1.1])
    c.until(f"(() => {{ const v = {_EDMAP_VIEW}; return Math.abs(v[0] - {view[0]}) > 0.002 || Math.abs(v[1] - {view[1]}) > 0.002 }})()", what='the view moved')
    c.ok(c.js(_EDMAP_IDS, [45.0, 1.0]) is not None and 'place:0' in c.js(_EDMAP_IDS, [45.0, 1.0]) and c.js(_EDTOOL_STATE)[4][2] is True, c.js(_EDMAP_IDS, [45.0, 1.0]),
         'a press on the departure drags the map: the departure stays where it is, nothing to undo')
    c.tap(f'{_EDTOOLS} [data-do="edmapfit"]')
    # a tool of pose: taken in place (no button redrawn); a touch poses; the tool goes back to Sélection
    c.js(f"document.querySelectorAll('{E} button').forEach(b => b.__kept = true)")
    c.tap(f'{_EDTOOLS} [data-tool="point"]')
    kept = c.js(f"[...document.querySelectorAll('{E} button')].map(b => !!b.__kept)")
    c.ok(all(kept) and c.js(_EDTOOL_STATE)[:2] == [['select', 'false', False], ['point', 'true', False]] and norm(c.text(f'{_EDMAP} [data-maphint]')) == T('atHint_point')
         and c.js(_EDSEL) is None, [c.js(_EDTOOL_STATE)[:2], c.text(f'{_EDMAP} [data-maphint]')], '« Point » taken in hand in place: no button was redrawn (SOG-0449); the line says what a touch will do')
    kinds = c.js(_EDPLACE_IDS)
    c.page.mouse.click(*c.js(_EDMAP_XY, [44.2, 1.2]))
    c.until(f"{_EDSEL} === 'PT3'", what='PT3 posed and chosen')
    c.ok(near(c.js(_EDPLACE_VAL, [6, 'lat']), 44.2) and near(c.js(_EDPLACE_VAL, [6, 'lon']), 1.2) and c.js(_EDPLACE_VAL, [6, 'id']) == 'PT3'
         and c.js(_EDTOOL_STATE)[:2] == [['select', 'true', False], ['point', 'false', False]] and len(c.js(_EDPLACE_IDS)) == len(kinds) + 1,
         [c.js(_EDPLACE_VAL, [6, 'id']), c.js(_EDPLACE_VAL, [6, 'lat']), c.js(_EDTOOL_STATE)[:2]],
         'a touch on the bare map posed PT3 there (a free identifier), its row is open, and the tool went back to Sélection')
    c.page.mouse.click(*c.js(_EDMAP_XY, [44.1, 1.3]))
    c.until(f"{_EDSEL} === null", what='nothing chosen')
    c.eq(len(c.js(_EDPLACE_IDS)), len(kinds) + 1, 'a second touch on the bare map creates nothing: no creation by accident', what='the rows')
    # a zone: round, with a radius; chosen, it shows the handle of its radius, which sets it
    c.tap(f'{_EDTOOLS} [data-tool="zone"]')
    c.page.mouse.click(*c.js(_EDMAP_XY, [44.15, 1.45]))
    c.until(f"{_EDSEL} === 'ZONE-2'", what='ZONE-2 posed and chosen')
    km = float(c.js(_EDPLACE_VAL, [4, 'radius']))
    c.ok(1 <= km <= 100 and near(c.js(_EDPLACE_VAL, [4, 'lat']), 44.15) and 'radius:4' in c.js(_EDMAP_IDS, None) and norm(c.text(f'{_EDMAP} [data-maphint]')) == T('atHint_round', name='ZONE-2'),
         [km, c.js(_EDPLACE_VAL, [4, 'lat']), c.text(f'{_EDMAP} [data-maphint]'), c.js(_EDMAP_IDS, None)],
         'a round zone posed with a radius from the width of the view; chosen, it shows the handle of its radius and the line says so')
    east = 1.45 + km / (111.32 * 0.7176)
    _ed_drag(c, [44.15, east], [44.15, east + 0.25])
    c.until(f"parseFloat(({_EDPLACE_VAL})([4, 'radius']) || '0') > {km} + 5", timeout=8000, what='the radius grown by its handle')
    c.ok(near(c.js(_EDPLACE_VAL, [4, 'lat']), 44.15), c.js(_EDPLACE_VAL, [4, 'lat']), 'the handle of the radius sets the radius; the centre did not move')
    # an object to find
    c.tap(f'{_EDTOOLS} [data-tool="object"]')
    c.page.mouse.click(*c.js(_EDMAP_XY, [44.9, 1.7]))
    c.until(f"{_EDSEL} === 'OBJ-2'", what='OBJ-2 posed and chosen')
    c.ok(near(c.js(_EDPLACE_VAL, [9, 'lat']), 44.9) and c.js(_EDTOOL_STATE)[0] == ['select', 'true', False], c.js(_EDPLACE_VAL, [9, 'lat']), 'an object posed; back to Sélection')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N95_1280_posed.png')
    # « Annuler le geste » never undoes a typing: after one, nothing to give back
    c.ok(c.js(_EDTOOL_STATE)[4][2] is False, c.js(_EDTOOL_STATE)[4], 'the poses can be undone')
    c.page.fill(f'{E} [data-edplaces] [data-k=edplace][data-i="9"][data-f=name]', 'Balise')
    c.until(f"({_EDTOOL_STATE})[4][2] === true", what='nothing to undo after a typing')
    # saved: the file carries what was posed
    c.tap(f'{E} [data-do="edsave"]')
    c.wait(600)
    text = c.js(_TEXT_OF, path) or ''
    c.ok(all(k in text for k in ('PT3', 'ZONE-2', 'OBJ-2', 'Balise')) and text.count('ZONE-1') >= 1, text[:400], 'the file saved carries the point, the zone and the object posed on the map')
    c.eq([c.js(_EDSEL), c.js(_EDTOOL_STATE)[4][2], norm(c.text(f'{_EDMAP} [data-maphint]'))], [None, True, T('atHint_select')],
         'saved: the file is the new base — no place chosen on the map any more, nothing to undo', what='after the save')
    # on a phone the tools wrap above the map
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.settle()
    if c.js(f"getComputedStyle(document.querySelector('{_EDMAP}')).display") == 'none':
        c.tap(f'{E} [data-do="edmap"]')
    c.until(f"(() => {{ const k = document.querySelector('{_EDMAP} canvas'); return !!k && k.getBoundingClientRect().width > 300 }})()", timeout=10000, what='the map unfolded on a phone')
    c.ok(c.js(f"document.querySelector('{_EDTOOLS}').scrollWidth <= document.querySelector('{_EDTOOLS}').clientWidth + 1"), 'the tools overflow', 'on a phone the tools hold in the width (they wrap)')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.js(f"document.querySelector('{E} [data-atmap]').scrollIntoView({{block: 'start'}})")
    c.shot('N95_390_tools.png')
    c.tap(f'{E} [data-do="edcancel"]')
    c.js(_REG_CLEAR)



# the pure part of the contour of a zone: its vertices in the row, their gestures, round ↔ contour (modules/missions/editor.js)
_RING_JS = """async () => {
  const ED = await import('/modules/missions/editor.js');
  const doc = { mission: { id: 'X-001A', type: 'REG' }, title: 'x',
    zones: [{ id: 'ZONE-1', centre: { lat: 44.8, lon: 1.2 }, radius_km: 5 },
      { id: 'ZONE-2', name: 'Contour', polygon: [{ lat: 44.5, lon: 1.5, note: 'kept' }, { lat: 44.5, lon: 1.7 }, { lat: 44.4, lon: 1.7 }] },
      { id: 'ZONE-3', name: 'Illisible', points: [{ lat: 44.5, lon: 1.5 }, { lat: 'x', lon: 1.7 }, { lat: 44.4, lon: 1.7 }] },
      { id: 'ZONE-4', name: 'Cent un', vertices: Array.from({ length: 101 }, (_, n) => ({ lat: 44 + n / 1000, lon: 1 })) }] };
  const rows = ED.placesOf(doc), before = JSON.stringify([rows, doc]), same = x => x === rows, J = JSON.stringify;
  const moved = ED.moveVertex(rows, 1, 1, { lat: 44.55, lon: 1.75 }), ins = ED.insertVertex(rows, 1, 0, { lat: 44.52, lon: 1.6 }),
    contour = ED.toContour(rows, 0), round = ED.toRound(rows, 1), slid = ED.movePlace(rows, 1, { lat: 44.0, lon: 1.0 });
  let threw = '';
  for (const h of [null, 'x', 7, [null, 'x', { kind: 'zone', ring: 'a,b;c', poly: 3 }, { kind: 'zone', ring: {}, poly: 3 }]])
    try { ED.moveVertex(h, 2, 0, h); ED.insertVertex(h, 3, 0, { lat: 1, lon: 1 }); ED.removeVertex(h, 2, 0); ED.toContour(h, 2); ED.toRound(h, 3); ED.ringOf(h) } catch (e) { threw += String(e) }
  return { rings: rows.map(r => [r.id, r.poly, r.ring]), ringOf: [ED.ringOf(rows[1]), ED.ringOf(rows[0]), ED.ringOf({ ring: '91,0;0,0;1,1' }), ED.ringOf({ ring: '1,1,1;0,0;1,1' })],
    unchanged: J(ED.withPlaces(doc, rows)) === J(doc),
    moved: [moved[1].ring, ED.withPlaces(doc, moved).zones[1]],
    inserted: [ins[1].ring, ins[1].poly, ED.withPlaces(doc, ins).zones[1].polygon.map(v => J(v))],
    removed: [same(ED.removeVertex(rows, 1, 0)), ED.removeVertex(ins, 1, 1)[1].ring],
    contour: [contour[0].poly, contour[0].ring.split(';')[0], contour[0].radius, Object.keys(ED.withPlaces(doc, contour).zones[0]).join(' ')],
    round: [round[1].ring, round[1].poly, round[1].lat, round[1].lon, +round[1].radius > 5 && +round[1].radius < 12, ED.withPlaces(doc, round).zones[1]],
    slid: [slid[1].ring, ED.ringMiddle(ED.ringOf(slid[1])).map(v => +v.toFixed(4))],
    refused: [same(ED.moveVertex(rows, 1, 9, { lat: 44, lon: 1 })), same(ED.moveVertex(rows, 1, 0, { lat: 91, lon: 1 })), same(ED.moveVertex(rows, 1, 0, { lat: '44', lon: '1' })),
      same(ED.moveVertex(rows, 0, 0, { lat: 44, lon: 1 })), same(ED.moveVertex(rows, 2, 0, { lat: 44, lon: 1 })), same(ED.insertVertex(rows, 1, 5, { lat: 44, lon: 1 })),
      same(ED.toContour(rows, 1)), same(ED.toRound(rows, 0)), same(ED.movePlace(rows, 2, { lat: 44, lon: 1 })), same(ED.movePlace(rows, 3, { lat: 44, lon: 1 })),
      same(ED.movePlace(rows, 1, { lat: 89.99, lon: 1 }))],
    threw, untouched: JSON.stringify([rows, doc]) === before } }"""


@case('N96', 'Missions › the workshop, the contour of a zone (pure part, no screen): the row of a zone carries its vertices when they can be '
      'read (3 to 100, all located) — an unreadable contour is kept as the file writes it and is not touched; a vertex is moved, one is '
      'inserted, one is removed (never under three); a contour is moved as a block by its middle; a round zone becomes a contour of six '
      'vertices at its radius, a contour becomes round again (its middle, the mean distance of its vertices); the file writes the '
      'vertices under the key it used, a vertex left in place keeps its other keys; nothing changed, nothing rewritten; a gesture '
      'refused returns the same rows; no hostile input throws',
      'N', tags=('missions', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0444, lot P2, third brick, the pure part (modules/missions/EDITOR.md § 2: « a square handle moves a vertex, a small one '
      'between two vertices inserts one, a vertex touched offers Retirer ce sommet (three at least). 3 to 100 vertices (SOG-0440) »; audit '
      '182: only what changed is written): modules/missions/editor.js `ringOf`, `moveVertex`, `insertVertex`, `removeVertex`, `toContour`, '
      '`toRound`, `movePlace`, `withPlaces`')
def n96(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    r = c.js(_RING_JS)
    c.eq(r['rings'], [['ZONE-1', 0, ''], ['ZONE-2', 3, '44.5,1.5;44.5,1.7;44.4,1.7'], ['ZONE-3', 3, ''], ['ZONE-4', 101, '']],
         'a contour that can be read is in the row; one with a vertex that is not a position, or with 101 vertices, is not (kept as it is)', what='the rows')
    c.eq(r['ringOf'], [[[44.5, 1.5], [44.5, 1.7], [44.4, 1.7]], None, None, None], 'the vertices of a row; a latitude of 91 or a third number: no contour', what='ringOf')
    c.ok(r['unchanged'] is True, r['unchanged'], 'nothing changed: the document written back is the same (audit 182)')
    c.eq(r['moved'], ['44.5,1.5;44.55,1.75;44.4,1.7', {'id': 'ZONE-2', 'name': 'Contour', 'polygon': [{'lat': 44.5, 'lon': 1.5, 'note': 'kept'}, {'lat': 44.55, 'lon': 1.75},
                                                                                                    {'lat': 44.4, 'lon': 1.7}]}],
         'a vertex moved: written under the key of the file (« polygon »), the vertex left in place keeps its other keys', what='a vertex moved')
    c.eq(r['inserted'], ['44.5,1.5;44.52,1.6;44.5,1.7;44.4,1.7', 4, ['{"lat":44.5,"lon":1.5,"note":"kept"}', '{"lat":44.52,"lon":1.6}', '{"lat":44.5,"lon":1.7}',
                                                                    '{"lat":44.4,"lon":1.7}']], 'a vertex inserted after the first one', what='a vertex inserted')
    c.eq(r['removed'], [True, '44.5,1.5;44.5,1.7;44.4,1.7'], 'never under three vertices (the same rows); with four, one is removed', what='a vertex removed')
    c.eq(r['contour'], [6, '44.84497,1.2', '5', 'id centre radius_km points'], 'a round zone becomes a contour of six vertices at its radius (the first due north); its '
         'centre and its radius stay, for the way back; a new contour is written under « points »', what='round to contour')
    c.eq(r['round'], ['', 0, '44.46667', '1.63333', True, {'id': 'ZONE-2', 'name': 'Contour', 'centre': {'lat': 44.46667, 'lon': 1.63333}, 'radius_km': r['round'][5]['radius_km']}],
         'a contour becomes round: its vertices are removed from the file, its centre is its middle, its radius the mean distance of its vertices', what='contour to round')
    c.eq(r['slid'], ['44.03333,0.86667;44.03333,1.06667;43.93333,1.06667', [44, 1]], 'a contour moved as a block: its middle goes where the gesture ends', what='a contour moved')
    c.eq(r['refused'], [True] * 11, 'refused, the SAME rows: a vertex that does not exist, a latitude of 91, texts, a round zone, an unreadable contour, a contour that '
         'would leave the bounds…', what='refused gestures')
    c.ok(r['threw'] == '' and r['untouched'] is True, [r['threw'], r['untouched']], 'no hostile input throws; the rows and the document read are not touched')



_EDSHAPE = f"""(i) => {{ const f = document.querySelector('{E} [data-edplaces] [data-plform="' + i + '"]'); return f ? [f.querySelector('[data-plshape]')?.dataset.plshape || 'round',
  (f.querySelector('[data-plshape]')?.textContent || '').trim(), (f.querySelector('[data-do=edzoneshape]')?.textContent || '').trim(), !!f.querySelector('[data-f=radius]')] : null }}"""
_EDVERTS = "(i) => ((window.__edMap ? " + _EDMAP_IDS + " : () => [])() || []).filter(x => x.startsWith('vertex:' + i + ':')).length"


@case('N97', 'Missions › the workshop, the contour of a zone on the map: in the sheet of a round zone « Tracer son contour » makes of it a '
      'contour of six vertices; chosen, the contour shows its vertices and, between two of them, the point that adds one; a vertex is '
      'dragged; a vertex touched is chosen and « Retirer ce sommet » is offered; the contour is moved by its middle; « Annuler le geste » '
      'gives the contour back; the file saved carries the vertices; « La rendre ronde » brings the circle back; a row opened in the '
      'Lieux is the place chosen on the map; from the sheet of a drawer « Dessiner sur la carte » poses a zone that becomes its key',
      'N', tags=('missions', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0444, lot P2, third brick (modules/missions/EDITOR.md § 2: « its shape is chosen in its sheet, and a contour is drawn by its '
      'vertices… a vertex touched offers Retirer ce sommet (three at least) », § 5: « Dessiner sur la carte creates a zone of the mission… '
      'that this drawer cites », § 7 quindecies; the pure part: N96)')
def n97(c):
    path = 'missions/X_REG/X-001A/missionX-001A.yaml'
    T = lambda key, **v: norm(__import__('functools').reduce(lambda t, kv: t.replace('{' + kv[0] + '}', str(kv[1])), v.items(), row(c, key, EDTX_FILE)))  # noqa: E731
    hint = lambda: norm(c.text(f'{_EDMAP} [data-maphint]'))  # noqa: E731
    shape = lambda i: [norm(x) if isinstance(x, str) else x for x in c.js(_EDSHAPE, i)]  # noqa: E731
    c.page.add_init_script(_EDMAP_HOOK)
    c.page.set_viewport_size({'width': 1280, 'height': c.height})
    reg_open(c, _TRIAL_TEXTS)
    c.tap(f'{R} [data-rowid="X-001A"] > summary')
    c.tap(f'{R} [data-rowid="X-001A"] [data-do="edmodify"]')
    c.until(f"document.querySelector('{_EDMAP}')?.dataset.map === 'tiles' && !!window.__edMap", timeout=15000, what='the map of the suite in the workshop')
    c.until(f"(({_EDMAP_IDS})() || []).length >= 6", timeout=10000, what='the elements of the mission drawn')
    # a row opened in the Lieux is the place chosen on the map
    c.tap(f'{E} [data-do="edstep"][data-step="places"]')
    c.tap(f'{E} [data-edplaces] [data-do="edplace"][data-i="3"]')
    c.until(f"{_EDSEL} === 'ZONE-1 · Secteur nord'", what='ZONE-1 chosen on the map by its row')
    c.eq([shape(3), hint(), 'radius:3' in c.js(_EDMAP_IDS, None)], [['round', '', T('plToContour'), True], T('atHint_round', name='ZONE-1 · Secteur nord'), True],
         'the row of ZONE-1 open: a round zone, with its radius, the handle of its radius on the map, and « Tracer son contour »', what='a round zone')
    # round → contour: six vertices, and the points that add one; the view is framed on the zone
    view0 = c.js(_EDMAP_VIEW)
    c.tap(f'{E} [data-edplaces] [data-plform="3"] [data-do="edzoneshape"]')
    c.until(f"({_EDVERTS})(3) === 6", timeout=8000, what='the six vertices on the map')
    a0, a3 = c.js(_EDMAP_XY, [44.84497, 1.2]), c.js(_EDMAP_XY, [44.75503, 1.2])
    zoomed = c.js(_EDMAP_VIEW)
    c.ok(zoomed[2] > view0[2] + 2 and abs(a3[1] - a0[1]) > 120, [view0, zoomed, a0, a3],
         '« Tracer son contour » frames the view on the zone, with a margin: its vertices are far enough apart to be caught')
    ids = c.js(_EDMAP_IDS, None)
    c.eq([shape(3), hint(), sum(1 for x in ids if x.startswith('mid:3:')), 'radius:3' in ids, c.js(_EDTOOL_STATE)[4][2]],
         [['contour', T('plContour', n=6), T('plToRound'), False], T('atHint_contour', name='ZONE-1 · Secteur nord'), 6, False, False],
         'the zone is a contour of six vertices: its sheet says so (no radius field any more), the map shows the vertices and the six points between them; it can be undone',
         what='round to contour')
    # a vertex is dragged; touched, it is chosen and « Retirer ce sommet » is offered
    c.ok(c.js(f"document.querySelector('{_EDMAP} [data-vertexdel]').hidden") is True, 'shown', '« Retirer ce sommet » is not shown while no vertex is chosen')
    _ed_drag(c, [44.84497, 1.2], [44.86, 1.2])
    c.until(f"(({_EDMAP_IDS})([44.86, 1.2]) || []).includes('vertex:3:0')", timeout=8000, what='the first vertex moved')
    c.eq(c.js(_EDMAP_VIEW), zoomed, 'moving a vertex never reframes the view', what='the view after a move')
    c.eq([hint(), c.js(f"document.querySelector('{_EDMAP} [data-vertexdel]').hidden"), norm(c.text(f'{_EDMAP} [data-vertexdel]'))],
         [T('atHint_vertex', k=1, name='ZONE-1 · Secteur nord'), False, T('atVertexDel')], 'the vertex moved stays chosen: the line names it, « Retirer ce sommet » is offered',
         what='a vertex moved')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.shot('N97_1280_contour.png')
    # the point between two vertices adds one; « Retirer ce sommet » removes the chosen one
    mid = c.js(f"(() => {{ const f = window.__edMap.queryRenderedFeatures().find(x => x.properties.fid === 'mid:3:2'); return [f.geometry.coordinates[1], f.geometry.coordinates[0]] }})()")
    c.page.mouse.click(*c.js(_EDMAP_XY, mid))
    c.until(f"({_EDVERTS})(3) === 7", timeout=8000, what='a seventh vertex')
    c.eq([shape(3)[1], hint()], [T('plContour', n=7), T('atHint_vertex', k=4, name='ZONE-1 · Secteur nord')], 'a touch on the point between two vertices added one there, chosen',
         what='a vertex added')
    c.tap(f'{_EDMAP} [data-vertexdel]')
    c.until(f"({_EDVERTS})(3) === 6", timeout=8000, what='six vertices again')
    c.ok(c.js(f"document.querySelector('{_EDMAP} [data-vertexdel]').hidden") is True and hint() == T('atHint_contour', name='ZONE-1 · Secteur nord'), hint(),
         '« Retirer ce sommet » removed it; no vertex is chosen any more')
    # the contour is moved as a block by its middle; « Annuler le geste » gives it back
    where = c.js(f"(() => {{ const f = window.__edMap.queryRenderedFeatures().find(x => x.properties.fid === 'vertex:3:3'); return [f.geometry.coordinates[1], f.geometry.coordinates[0]] }})()")
    lbl = c.js("(() => { const f = window.__edMap.queryRenderedFeatures().find(x => x.properties.fid === 'place:3' && x.geometry.type === 'Point'); return [f.geometry.coordinates[1], f.geometry.coordinates[0]] })()")
    _ed_drag(c, lbl, [lbl[0] - 0.02, lbl[1] - 0.02])
    c.until(f"!(({_EDMAP_IDS})({where}) || []).includes('vertex:3:3')", timeout=8000, what='the contour moved away')
    c.ok(c.js(_EDVERTS, 3) == 6 and 'vertex:3:3' in c.js(_EDMAP_IDS, [where[0] - 0.02, where[1] - 0.02]), c.js(_EDMAP_IDS, [where[0] - 0.02, where[1] - 0.02]),
         'dragged by its middle, the contour moved as a block: every vertex followed')
    c.tap(f'{_EDTOOLS} [data-do="edmapundo"]')
    c.until(f"(({_EDMAP_IDS})({where}) || []).includes('vertex:3:3')", timeout=8000, what='the contour back')
    # saved: the file carries the vertices
    c.tap(f'{E} [data-do="edsave"]')
    c.wait(600)
    text = c.js(_TEXT_OF, path) or ''
    c.ok('points:' in text and '44.86' in text and 'radius_km: 5' in text, text[text.find('zones'):text.find('zones') + 400], 'the file saved carries the vertices of ZONE-1 under « points » (its radius stays, for the way back)')
    # contour → round (the note of the save is removed and the row brought back in view first)
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.ok(c.count(f'{E} [data-edplaces] [data-do="edplace"]') >= 7, c.count(f'{E} [data-edplaces] [data-do="edplace"]'),
         'after the save the group « Lieux », left unfolded, still lists the places (it used to be empty until folded and reopened)')
    c.js(f"document.querySelector('{E} [data-edplaces] [data-do=\"edplace\"][data-i=\"3\"]').scrollIntoView({{block: 'center'}})")
    c.tap(f'{E} [data-edplaces] [data-do="edplace"][data-i="3"]')
    c.until(f"{_EDSEL} === 'ZONE-1 · Secteur nord'", what='ZONE-1 chosen again')
    c.tap(f'{E} [data-edplaces] [data-plform="3"] [data-do="edzoneshape"]')
    c.until(f"({_EDVERTS})(3) === 0 && (({_EDMAP_IDS})() || []).includes('radius:3')", timeout=8000, what='the zone round again')
    c.eq(shape(3), ['round', '', T('plToContour'), True], '« La rendre ronde »: the circle is back, with its radius field', what='contour to round')
    # « Recentrer » comes back to the mission
    c.tap(f'{_EDTOOLS} [data-do="edmapfit"]')
    c.eq(c.js(_EDMAP_VIEW), view0, '« Recentrer » brings the view back from the zone to the frame of the mission', what='the view recentred')
    # from the sheet of a drawer: « Dessiner sur la carte » poses a zone that becomes its key
    c.tap(f'{E} [data-atflow] [data-sel="B"]')
    c.until(f"document.querySelector('{_DW}')?.dataset.drawer === 'B'", what='the sheet of drawer 1')
    c.eq(c.js(f"document.querySelector('{_DW} [data-f=zone]').value"), 'ZONE-1', 'drawer 1 cites ZONE-1', what='the key of drawer 1')
    c.tap(f'{_DW} [data-do="eddrdraw"][data-kind="zone"]')
    c.eq([c.js(_EDTOOL_STATE)[2][:2], hint()], [['zone', 'true'], T('atHint_drawFor', n=1)], '« Dessiner sur la carte »: the tool Zone in hand, the line says for which drawer',
         what='drawing for a drawer')
    c.page.mouse.click(*c.js(_EDMAP_XY, [44.2, 1.3]))
    c.until(f"document.querySelector('{_DW} [data-f=zone]')?.value === 'ZONE-2'", timeout=8000, what='the zone posed is the key of drawer 1')
    c.ok(c.js(f"document.querySelector('{_DW}').dataset.drawer") == 'B' and c.js(_EDTOOL_STATE)[0][:2] == ['select', 'true'] and c.js(_EDSEL) == 'ZONE-2', c.js(_EDSEL),
         'the zone posed on the map is the key of drawer 1; the sheet of the drawer stays; the tool went back to Sélection')
    # on a phone
    c.tap(f'{E} [data-atflow] [data-sel="start"]')
    c.tap(f'{E} [data-edplaces] [data-do="edplace"][data-i="3"]') if c.count(f'{E} [data-edplaces] [data-plform="3"]') == 0 else None
    c.tap(f'{E} [data-edplaces] [data-plform="3"] [data-do="edzoneshape"]')
    c.until(f"({_EDVERTS})(3) === 6", timeout=8000, what='a contour again')
    c.page.set_viewport_size({'width': 390, 'height': c.height})
    c.settle()
    if c.js(f"getComputedStyle(document.querySelector('{_EDMAP}')).display") == 'none':
        c.tap(f'{E} [data-do="edmap"]')
    c.until(f"(() => {{ const k = document.querySelector('{_EDMAP} canvas'); return !!k && k.getBoundingClientRect().width > 300 }})()", timeout=10000, what='the map unfolded on a phone')
    c.js("document.querySelectorAll('#fNotes .f-note').forEach(n => n.remove())")
    c.js(f"document.querySelector('{E} [data-atmap]').scrollIntoView({{block: 'start'}})")
    c.shot('N97_390_contour.png')
    c.tap(f'{E} [data-do="edcancel"]')
    c.js(_REG_CLEAR)



# the pure part of Tracé: the route of the departure as a list of identifiers (modules/missions/editor.js)
_ROUTE_JS = """async () => {
  const ED = await import('/modules/missions/editor.js'), J = JSON.stringify;
  const doc = { mission: { id: 'X-001A', type: 'REG' }, title: 'x', route_order: ['ORIGIN', { id: 'PT1', note: 'kept' }, 'TARGET', null, {}, 'DESTINATION'] };
  const before = J(doc), route = ED.routeOf(doc);
  let threw = '';
  for (const h of [null, 'x', 7, { route_order: 'x' }, { route_order: [null, {}, [], { id: {} }] }]) try { ED.routeOf(h); ED.withRoute(h, h); ED.withRoute(doc, h); ED.routeToken(h) } catch (e) { threw += String(e) }
  return { route, unchanged: J(ED.withRoute(doc, route)) === J(doc),
    changed: ED.withRoute(doc, ['ORIGIN', 'PT2', 'PT1', 'DESTINATION']).route_order, emptied: 'route_order' in ED.withRoute(doc, []),
    bounded: [ED.withRoute(doc, [{}, 5, 'A'.repeat(80), 'B']).route_order.map(x => x.length), ED.withRoute({}, Array.from({ length: 90 }, (_, n) => 'P' + n)).route_order.length,
      ED.routeOf({ route_order: Array.from({ length: 200 }, (_, n) => 'P' + n) }).length],
    none: [ED.routeOf({}), ED.routeOf(null), ED.routeOf({ route_order: 'x' })],
    tokens: [ED.routeToken({ kind: 'dep', id: '' }), ED.routeToken({ kind: 'arr' }), ED.routeToken({ kind: 'pt', id: 'PT1' }), ED.routeToken({ kind: 'zone', id: '' }), ED.routeToken(null)],
    threw, untouched: J(doc) === before } }"""


@case('N98', 'Missions › the workshop, Tracé (pure part, no screen): the route of the departure is the list of the identifiers of '
      '`route_order` — « ORIGIN », the places, « DESTINATION » —, sixty at most; written back unchanged, the document is the same; a route '
      'changed keeps, for an identifier the file already had, the entry of the file (a text, or its object with its other keys), a new '
      'one is a text; an empty route removes the key; a row of the Lieux gives its token (« ORIGIN » for the departure, « DESTINATION » '
      'for the arrival, else its identifier); identifiers are bounded texts; no hostile input throws',
      'N', tags=('missions', 'security'), designs=('standard',), screens=False, langs4=False,
      rule='SOG-0444, lot P2, push 3b, the pure part (modules/missions/EDITOR.md § 3: « A route is a list of chips, filled by touching the '
      'map in Tracé… never ids séparés par des virgules »; audit 182: only what changed is written): modules/missions/editor.js '
      '`routeOf`, `withRoute`, `routeToken`')
def n98(c):
    c.page.goto(c.base + '/frame/manifest.webmanifest')
    r = c.js(_ROUTE_JS)
    c.eq(r['route'], ['ORIGIN', 'PT1', 'TARGET', 'DESTINATION'], 'the identifiers of the route, an entry that has none is skipped', what='the route')
    c.ok(r['unchanged'] is True, r['unchanged'], 'the same route written back: the document is the same (audit 182)')
    c.eq(r['changed'], ['ORIGIN', 'PT2', {'id': 'PT1', 'note': 'kept'}, 'DESTINATION'], 'a route changed: PT1 keeps the object of the file, the new place is a text', what='a route changed')
    c.ok(r['emptied'] is False, r['emptied'], 'an empty route removes the key')
    c.eq(r['bounded'], [[40, 1], 60, 60], 'identifiers are texts of forty signs at most (an object, a number are not taken); sixty places at most, written and read', what='the bounds')
    c.eq(r['none'], [[], [], []], 'no route, no document, a route that is not a list: an empty route', what='no route')
    c.eq(r['tokens'], ['ORIGIN', 'DESTINATION', 'PT1', '', ''], 'the token of a row: the departure, the arrival, an identifier; a place without an identifier has none', what='the tokens')
    c.ok(r['threw'] == '' and r['untouched'] is True, [r['threw'], r['untouched']], 'no hostile input throws; the document read is not touched')
