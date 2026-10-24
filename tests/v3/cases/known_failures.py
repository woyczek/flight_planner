"""Known failures the suite carries instead of hiding (PLAN.md section J).

A case listed here that fails is reported `FAIL (known: <note>)` and does not change the exit code.  The ergonomics
session removes the line when the cause is fixed; a listed case that passes is reported `PASS (known failure fixed:
remove it from cases/known_failures.py)`.  Any failure that is not in this table is a regression.
"""

KNOWN = {
}
