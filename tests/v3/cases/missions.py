"""Area N — Missions (modules/missions/SPEC.md): the V2 missions read as they are (frame/lib/mission.js), the list of the airline's missions,
choose or draw, and the flight handed to Fuel.  Cases: N1.  Invented missions only (names, positions, callsigns): no AIP content and no real
mission of the user's data."""
from lib import Fail, case


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
