"""Known failures the suite carries instead of hiding (PLAN.md section J).

A case listed here that fails is reported `FAIL (known: <note>)` and does not change the exit code.  The ergonomics
session removes the line when the cause is fixed; a listed case that passes is reported `PASS (known failure fixed:
remove it from cases/known_failures.py)`.  Any failure that is not in this table is a regression.
"""

KNOWN = {
    'K239': 'SOG-0161: ESSB → LEMO on the real base (when it holds the Spanish variant) is found in 14 s and 65 % controlled, by N872 / UM728 / J18 / G54 …, without T424 nor N857: the intermediate points on the great circle and the speed are to do',
}
