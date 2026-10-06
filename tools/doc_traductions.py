"""Suivi des traductions de la documentation : ce qui a changé dans les documents français depuis leur dernière
traduction (docs/en, docs/de, docs/es).

Les documents traduits (index et manuels) suivent le français ligne à ligne. docs/traductions.json garde, pour chacun,
l'empreinte git du texte français au moment de la dernière traduction ; ce script compare cette empreinte au français
d'aujourd'hui et montre les lignes changées (numéros de ligne du français : les mêmes, ou presque, dans les
traductions).

    python tools/doc_traductions.py            état de chaque document, lignes changées depuis la dernière traduction
    python tools/doc_traductions.py --valider  traductions faites : empreintes du français actuel enregistrées

Le français relu doit être commité (l'ancienne version est relue dans git par son empreinte).
"""
import difflib, io, json, os, subprocess, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DOCS = os.path.join(ROOT, 'docs')
REF = os.path.join(DOCS, 'traductions.json')
LANGS = ('en', 'de', 'es')
SOURCES = ('README.md', 'MANUEL_UTILISATEUR.md', 'MANUEL_ADMINISTRATEUR.md')


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, encoding='utf-8').stdout


def lines(path):
    return io.open(path, encoding='utf-8').read().replace('\r\n', '\n').split('\n')


def empreinte(name):
    return git('hash-object', f'docs/{name}').strip()


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ref = json.load(io.open(REF, encoding='utf-8')) if os.path.exists(REF) else {}
    if '--valider' in sys.argv:
        ref = {n: empreinte(n) for n in SOURCES}
        io.open(REF, 'w', encoding='utf-8', newline='\n').write(json.dumps(ref, indent=2, ensure_ascii=False) + '\n')
        print('Empreintes du français enregistrées dans docs/traductions.json :', ', '.join(SOURCES))
        return
    todo = 0
    for name in SOURCES:
        fr = lines(os.path.join(DOCS, name))
        counts = ', '.join(f'{l} {len(lines(os.path.join(DOCS, l, name)))}' for l in LANGS if os.path.exists(os.path.join(DOCS, l, name)))
        old = ref.get(name)
        if old == empreinte(name):
            print(f'= {name} : traductions à jour (lignes : fr {len(fr)}, {counts})')
            continue
        todo += 1
        before = git('cat-file', '-p', old).replace('\r\n', '\n').split('\n') if old else []
        if old and not before[0:1]:
            print(f'! {name} : ancienne version introuvable dans git ({old[:8]}) — tout relire')
            continue
        print(f'* {name} : à retraduire (lignes : fr {len(fr)}, {counts})')
        for g in difflib.SequenceMatcher(None, before, fr, autojunk=False).get_grouped_opcodes(0):
            a0, a1, b0, b1 = g[0][1], g[-1][2], g[0][3], g[-1][4]
            print(f'  @@ fr lignes {b0 + 1}-{b1} (avant : {a0 + 1}-{a1})')
            for tag, i1, i2, j1, j2 in g:
                for x in before[i1:i2] if tag != 'equal' else []:
                    print(f'  - {x}')
                for x in fr[j1:j2] if tag != 'equal' else []:
                    print(f'  + {x}')
    if todo:
        print(f'\n{todo} document(s) à retraduire ; une fois fait : python tools/doc_traductions.py --valider')


if __name__ == '__main__':
    main()
