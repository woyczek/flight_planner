"""Known failures the suite carries instead of hiding (PLAN.md section J).

A case listed here that fails is reported `FAIL (known: <note>)` and does not change the exit code.  The ergonomics
session removes the line when the cause is fixed; a listed case that passes is reported `PASS (known failure fixed:
remove it from cases/known_failures.py)`.  Any failure that is not in this table is a regression.
"""

KNOWN = {
    # SOG-0224 (13 Nov, decision (a) of the ergonomist): Fuel (modules/fuel/module.js, Features SOG) loses its proposals when its screen is left, and altsFromAddress nulls S.alts before routeTake so
    # altsClear() publishes nothing and route_alts.json keeps the old proposals; the case is the end-to-end one on two screens; remove this line when Fuel is fixed
    'D202': 'Fuel loses the proposals on leaving its screen and never clears route_alts.json after #fuel?ralt= (altsFromAddress: S.alts = null before routeTake): Features SOG, SOG-0224',
}
