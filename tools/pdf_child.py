"""Le sous-processus de lecture de PDF (tools/pdf_guard.py) : lancé `python -I`, dossier courant temporaire vide, environnement nettoyé, délai et mémoire bornés par son parent. SEUL endroit où pypdf est importé.

Arguments : chemin du PDF, fichier de sortie, première page, dernière page (exclue), nombre de signes par page au plus, dossiers de paquets (JSON). Écrit UN fichier JSON : { pages: le total, texts: [un texte par page lue] }.
Il n'ouvre ni réseau ni autre fichier que le PDF et son fichier de sortie. Ses erreurs ne sont pas dites : le parent voit un code de sortie et dit « PDF illisible »."""
import json
import logging
import sys


def main():
    path, out, first, last, max_chars, dirs = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), json.loads(sys.argv[6])
    sys.path.extend(d for d in dirs if isinstance(d, str))
    from pypdf import PdfReader
    logging.getLogger('pypdf').setLevel(logging.ERROR)
    reader = PdfReader(path)
    total = len(reader.pages)
    texts = [(reader.pages[i].extract_text() or '')[:max_chars] for i in range(first, min(last, total))]
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'pages': total, 'texts': texts}, f, ensure_ascii=False, allow_nan=False)


if __name__ == '__main__':
    main()
