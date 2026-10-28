"""Construit « apps/aide/docs_bundle.js » : tous les documents Markdown de docs/ (manuels et traductions, guides,
documentation technique) dans un seul script, pour que la page Aide s'ouvre aussi depuis le disque (file://, sans le
lanceur : le navigateur y interdit la lecture des fichiers par programme, pas le chargement d'un script).
Servie par le lanceur, l'Aide lit toujours les fichiers eux-mêmes ; le paquet ne sert qu'en fichier local ou si le
lanceur ne répond plus.

Exclus : les journaux et synthèses du relais cloud (docs/technique/V3_JOURNAL_*, V3_DECISIONS_RELAIS_*), journaux de
travail pour la session ergonomie, pas de l'aide (400 Ko, et chaque commit de journal rendait le paquet périmé).

Appelé par tools/bump_versions.py (avant le calcul des versions) ; à la main : python tools/build_docs_bundle.py
"""
import io, json, os, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DOCS = os.path.join(ROOT, 'docs')
OUT = os.path.join(ROOT, 'apps', 'aide', 'docs_bundle.js')
# Préfixes (relatifs à docs/) des documents laissés hors du paquet.
EXCLUDE = ('technique/V3_JOURNAL_', 'technique/V3_DECISIONS_RELAIS_')


def build(verbose=True):
    """Écrit apps/aide/docs_bundle.js (tous les docs/**/*.md) seulement si son contenu change ; verbose : bilan affiché."""
    docs = {}
    for d, _, files in os.walk(DOCS):
        for f in files:
            if f.endswith('.md'):
                p = os.path.join(d, f)
                rel = os.path.relpath(p, DOCS).replace(os.sep, '/')
                if rel.startswith(EXCLUDE):
                    continue
                docs[rel] = io.open(p, encoding='utf-8').read().replace('\r\n', '\n')
    text = ('// GÉNÉRÉ par tools/build_docs_bundle.py depuis docs/**/*.md : ne pas éditer à la main.\n'
            '// Documents de l\'Aide pour l\'ouverture en fichier local (apps/aide/aide.js).\n'
            'window.DOC_BUNDLE = ' + json.dumps(dict(sorted(docs.items())), ensure_ascii=False, separators=(',', ':')) + ';\n')
    old = io.open(OUT, encoding='utf-8', newline='').read() if os.path.exists(OUT) else None
    if old != text:
        io.open(OUT, 'w', encoding='utf-8', newline='\n').write(text)
        if verbose:
            print(f'{len(docs)} documents, {len(text) // 1024} Ko -> apps/aide/docs_bundle.js')
    elif verbose:
        print('apps/aide/docs_bundle.js inchangé')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    build()
