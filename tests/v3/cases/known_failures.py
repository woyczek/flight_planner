"""Known failures the suite carries instead of hiding (PLAN.md section J).

A case listed here that fails is reported `FAIL (known: <note>)` and does not change the exit code.  The ergonomics
session removes the line when the cause is fixed; a listed case that passes is reported `PASS (known failure fixed:
remove it from cases/known_failures.py)`.  Any failure that is not in this table is a regression.
"""

KNOWN = {
    'F4': 'journal 24 Oct: .fu-when row overflows the page at 390 (402 px)',
    'F5': 'journal 24 Oct: tab "Devis" and step 4 "Devis" in the same view',
}
