"""Le sous-processus de lecture de PDF (tools/pdf_guard.py) : lancé `python -I`, dossier courant temporaire vide, environnement nettoyé, délai et mémoire bornés par son parent. SEUL endroit où pypdf est importé.

Arguments : chemin du PDF, fichier de sortie, première page, dernière page (exclue), nombre de signes par page au plus, dossiers de paquets (JSON). Écrit UN fichier JSON : { pages: le total, texts: [un texte par page lue], fonts: le nombre d'avertissements « fontTools absent » de pypdf }.
Il n'ouvre ni réseau ni autre fichier que le PDF et son fichier de sortie. Ses erreurs ne sont pas dites : le parent voit un code de sortie et dit « PDF illisible »."""
import json
import logging
import sys


def main():
    path, out, first, last, max_chars, dirs = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), json.loads(sys.argv[6])
    # -I a deja ajoute le site global : le retirer avant de restaurer l'ordre
    # explicite du parent, sinon une ancienne copie masque toujours --user.
    dirs = [d for d in dirs if isinstance(d, str)]
    sys.path[:] = [p for p in sys.path if p not in dirs] + dirs
    from pypdf import PdfReader
    # le journal de pypdf est réglé ICI, une fois (SOG-0427) : rien n'en sort (le parent ne lit pas notre sortie d'erreur), et les avertissements « fontTools is required to
    # fully parse the encoding of a CFF Type1 font » sont COMPTÉS : le parent dit, en UNE ligne par travail, dans combien de documents des polices n'ont pas été décodées entièrement
    counter = _FontWarnings()
    log = logging.getLogger('pypdf')
    log.setLevel(logging.WARNING)
    log.propagate = False
    log.addHandler(counter)
    reader = PdfReader(path)
    total = len(reader.pages)
    texts = [(reader.pages[i].extract_text() or '')[:max_chars] for i in range(first, min(last, total))]
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'pages': total, 'texts': texts, 'fonts': min(counter.n, 1_000_000)}, f, ensure_ascii=False, allow_nan=False)


class _FontWarnings(logging.Handler):
    """Compte les avertissements de pypdf qui disent qu'une police n'a pas pu être décodée entièrement (fontTools absent) ; n'écrit rien."""

    def __init__(self):
        super().__init__(logging.WARNING)
        self.n = 0

    def emit(self, record):
        try:
            if 'fontTools' in record.getMessage():
                self.n += 1
        except Exception:
            pass


if __name__ == '__main__':
    main()
