"""Construit « apps/cpco/mission_prompt.js » à partir de docs/technique/PROMPT_GENERATEUR_MISSIONS.md (bloc ```text).

Le bouton « ChatGPT → » du générateur de mission lit le prompt dans ce fichier JavaScript, chargé par
<script> comme les autres (fonctionne aussi hors serveur web, sans lecture réseau du dossier docs/).
Le document reste la source unique : relancer cet outil après l'avoir modifié (tools/bump_versions.py le
fait aussi à chaque changement de version).

Usage (à la racine du dépôt) :  python tools/build_mission_prompt.py
"""
import io, json, os, re, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'docs', 'technique', 'PROMPT_GENERATEUR_MISSIONS.md')
OUT = os.path.join(ROOT, 'apps', 'cpco', 'mission_prompt.js')


def build(verbose=True):
    """Écrit mission_prompt.js depuis le bloc ```text du document, seulement s'il change ; verbose : bilan affiché."""
    text = io.open(SRC, encoding='utf-8').read().replace('\r\n', '\n')
    m = re.search(r'```text\n(.*?)\n```', text, re.S)
    if not m:
        sys.exit('Bloc ```text introuvable dans ' + SRC)
    js = ('// Prompt de génération de missions (ChatGPT…), GÉNÉRÉ par tools/build_mission_prompt.py depuis\n'
          '// docs/technique/PROMPT_GENERATEUR_MISSIONS.md : ne pas éditer à la main.\n'
          'window.MISSION_PROMPT = ' + json.dumps(m.group(1), ensure_ascii=False) + ';\n')
    old = io.open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
    if js != old:
        io.open(OUT, 'w', encoding='utf-8', newline='\n').write(js)
        if verbose:
            print(f'mission_prompt.js régénéré ({len(m.group(1))} caractères).')
    elif verbose:
        print('mission_prompt.js à jour.')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    build()
