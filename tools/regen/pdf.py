"""Le jeu « pdf » du lanceur : l'état des bibliothèques en option (lecture des PDF : pypdf, pdfplumber, Pillow, pdfminer.six ; OCR des constructeurs de poste : pypdfium2, rapidocr-onnxruntime), facultatives (Q-0053, SOG-0376), SANS jamais les importer — chargé par regen_jobs.load_verbs().

  · `pdf/status` {} (lecture seule) : { ok, packages: [{ name, version, minimum, maximum, state: 'ok' | 'missing' | 'old' | 'new' }], groups: [{ id: 'pdf' | 'ocr', packages: [nom], ready }], ready: { text, vectors, ocr }, script, python, error? } ;
    les versions sont lues dans un sous-processus isolé (tools/pdf_guard.py) et les bornes dans le SEUL fichier tools/requirements-optional.txt ; `script` est le NOM du script que l'utilisateur lance (installer_bibliotheques.cmd sous Windows,
    .sh ailleurs : le lanceur n'installe rien et ne lance jamais pip) ; `error: 'bounds'` quand le fichier des bornes est refusé (rien n'est alors lu). La lecture elle-même (pdf_guard.read_text) sert les lecteurs de PDF déposés : aucun verbe ne la livre à la page.
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
