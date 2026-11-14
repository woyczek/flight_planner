"""Le jeu « pdf » du lanceur : l'état des bibliothèques de lecture de PDF (pypdf, pdfplumber, Pillow), facultatives (Q-0053), SANS jamais les importer — chargé par regen_jobs.load_verbs().

  · `pdf/status` {} (lecture seule) : { ok, packages: [{ name, version, minimum, maximum, state: 'ok' | 'missing' | 'old' | 'new' }], ready: { text, vectors }, command, python } ; les versions sont lues dans un sous-processus
    isolé (tools/pdf_guard.py) ; `command` est ce que l'utilisateur lance (le lanceur n'installe rien). La lecture elle-même (pdf_guard.read_text) sert les lecteurs de PDF déposés : aucun verbe ne la livre à la page.
Bibliothèque standard."""
import os
import sys

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)


def check_status(a):
    return {} if a == {} else None


def status(job, args, ctx):
    import pdf_guard
    return {'ok': True, **pdf_guard.status()}


VERBS = {('pdf', 'status'): (status, check_status)}
