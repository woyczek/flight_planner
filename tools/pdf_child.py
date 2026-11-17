"""Le sous-processus de lecture de PDF (tools/pdf_guard.py) : lancé `python -I`, dossier courant temporaire vide, environnement nettoyé, délai et mémoire bornés par son parent. SEUL endroit où pypdf est importé.

Deux formes, toutes deux écrivant UN fichier JSON :
  · UN PDF : chemin du PDF, fichier de sortie, première page, dernière page (exclue), nombre de signes par page au plus, dossiers de paquets (JSON) → { pages: le total, texts: [un texte par page lue], fonts: le nombre
    d'avertissements « fontTools absent » de pypdf } ;
  · PLUSIEURS PDF (SOG-0427, `--many`) : --many, fichier de sortie, signes par page au plus, pages au plus par PDF, signes au plus pour tout le paquet, dossiers de paquets (JSON), puis les chemins → { items: [{ ok: true, pages,
    texts, fonts } | { ok: false }] } dans l'ORDRE des chemins : un PDF illisible (ou qui ferait passer le paquet au-delà de ses signes) est dit { ok: false }, les autres sont lus.
Il n'ouvre ni réseau ni autre fichier que les PDF et son fichier de sortie. Ses erreurs ne sont pas dites : le parent voit un code de sortie et dit « PDF illisible »."""
import json
import logging
import sys


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


def _setup(dirs):
    """Les dossiers de paquets du parent, puis pypdf, dont le journal est réglé ICI, une fois (SOG-0427) : rien n'en sort (le parent ne lit pas notre sortie d'erreur) et les avertissements « fontTools is required to fully parse the
    encoding of a CFF Type1 font » sont COMPTÉS : le parent dit, en UNE ligne par travail, dans combien de documents des polices n'ont pas été décodées entièrement. → (PdfReader, compteur)."""
    # -I a deja ajoute le site global : le retirer avant de restaurer l'ordre
    # explicite du parent, sinon une ancienne copie masque toujours --user.
    dirs = [d for d in dirs if isinstance(d, str)]
    sys.path[:] = [p for p in sys.path if p not in dirs] + dirs
    from pypdf import PdfReader
    counter = _FontWarnings()
    log = logging.getLogger('pypdf')
    log.setLevel(logging.WARNING)
    log.propagate = False
    log.addHandler(counter)
    return PdfReader, counter


def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--many':
        return many()
    path, out, first, last, max_chars, dirs = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), json.loads(sys.argv[6])
    PdfReader, counter = _setup(dirs)
    reader = PdfReader(path)
    total = len(reader.pages)
    texts = [(reader.pages[i].extract_text() or '')[:max_chars] for i in range(first, min(last, total))]
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'pages': total, 'texts': texts, 'fonts': min(counter.n, 1_000_000)}, f, ensure_ascii=False, allow_nan=False)


def many():
    """La forme à plusieurs PDF (voir l'en-tête) : un PDF illisible n'emporte pas les autres."""
    out, max_chars, max_pages, max_pack, dirs, paths = sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), json.loads(sys.argv[6]), sys.argv[7:]
    PdfReader, counter = _setup(dirs)
    items, used = [], 0
    for path in paths:
        before = counter.n
        try:
            reader = PdfReader(path)
            total = len(reader.pages)
            texts = [(reader.pages[i].extract_text() or '')[:max_chars] for i in range(0, min(max_pages, total))]
            size = sum(len(t) for t in texts)
            if used + size > max_pack:
                items.append({'ok': False})
                continue
            used += size
            items.append({'ok': True, 'pages': total, 'texts': texts, 'fonts': min(counter.n - before, 1_000_000)})
        except Exception:      # un PDF illisible (abîmé, chiffré, trop profond…) : dit, les autres sont lus
            items.append({'ok': False})
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'items': items}, f, ensure_ascii=False, allow_nan=False)


if __name__ == '__main__':
    main()
