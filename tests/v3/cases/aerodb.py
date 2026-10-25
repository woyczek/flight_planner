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
