"""Known failures the suite carries instead of hiding (PLAN.md section J).

A case listed here that fails is reported `FAIL (known: <note>)` and does not change the exit code.  The ergonomics
session removes the line when the cause is fixed; a listed case that passes is reported `PASS (known failure fixed:
remove it from cases/known_failures.py)`.  Any failure that is not in this table is a regression.
"""

KNOWN = {
    # meta.files of the modules (30 Oct 2026, V3 Frame): each owner adds the lines its module lacks; this line goes with the last
    'I26': 'meta.files gaps: Maps (metar, weather_store, wind, light.js: BUGS SOG adds them), Report (geo.js), Atmosphere (weather_store); '
           'Fuel fixed in 6379d2b18',
}
