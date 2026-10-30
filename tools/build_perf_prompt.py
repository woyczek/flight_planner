"""Construit « modules/aircraft/perf_prompt.js » à partir de docs/technique/PROMPT_PROFIL_PERFORMANCES.md.

Le bouton « Demander à ChatGPT » des fiches de performances (module Carburant) lit le prompt dans ce fichier
JavaScript, chargé par <script> (fonctionne aussi hors serveur web). Sur la ligne V3, la copie du planificateur V2
(apps/planner/perf_prompt.js) n'est plus construite : la V2 est maintenue sur la branche v2-maintenance, son prompt reste
tel qu'il est ici. Le document reste la source unique : un bloc
```text <langue> par langue (fr, en, de, es), un bloc ```text <langue>-missing (champs manquants des fiches cochées :
window.PERF_PROMPT_MISSING) et un bloc ```json (le schéma, mis à la place de {{SCHEMA}} et
donné aussi à la page : window.PERF_PROMPT_SCHEMA, clés admises dans la réponse). Relancer
cet outil après avoir modifié le document (tools/bump_versions.py le fait aussi).

Usage (à la racine du dépôt) :  python tools/build_perf_prompt.py
"""
import io, json, os, re, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(ROOT, 'docs', 'technique', 'PROMPT_PROFIL_PERFORMANCES.md')
# fichiers écrits : la copie du module Appareils (Maintenance) seule (V2 : branche v2-maintenance, apps/planner/perf_prompt.js reste telle quelle ici)
OUTS = [os.path.join(ROOT, 'modules', 'aircraft', 'perf_prompt.js')]
LANGS = ('fr', 'en', 'de', 'es')


def build(verbose=True):
    """Écrit perf_prompt.js depuis les blocs du document, seulement s'il change ; verbose : bilan affiché."""
    text = io.open(SRC, encoding='utf-8').read().replace('\r\n', '\n')
    schema = re.search(r'```json\n(.*?)\n```', text, re.S)
    if not schema:
        sys.exit('Bloc ```json (schéma) introuvable dans ' + SRC)
    json.loads(schema.group(1))  # le schéma doit rester un JSON valide
    prompts = {}
    for lang in LANGS:
        m = re.search(r'```text ' + lang + r'\n(.*?)\n```', text, re.S)
        if not m:
            sys.exit(f'Bloc ```text {lang} introuvable dans {SRC}')
        prompts[lang] = m.group(1).replace('{{SCHEMA}}', schema.group(1))
    # « Renseigner les champs manquants » des fiches cochées : un bloc ```text <langue>-missing ; {{REGLES}} = règles 1 à 4
    # (sources, valeurs, unités, cartographie) du prompt complet de la même langue
    missing = {}
    for lang in LANGS:
        m = re.search(r'```text ' + lang + r'-missing\n(.*?)\n```', text, re.S)
        if not m:
            sys.exit(f'Bloc ```text {lang}-missing introuvable dans {SRC}')
        rules = '\n'.join(re.findall(r'(?m)^[1-4]\. .*$', prompts[lang]))
        missing[lang] = m.group(1).replace('{{REGLES}}', rules)
    js = ('// Prompt « Demander le profil à ChatGPT » (Carburant), GÉNÉRÉ par tools/build_perf_prompt.py depuis\n'
          '// docs/technique/PROMPT_PROFIL_PERFORMANCES.md : ne pas éditer à la main.\n'
          'window.PERF_PROMPT = ' + json.dumps(prompts, ensure_ascii=False, indent=0) + ';\n'
          '// « Renseigner les champs manquants » des fiches cochées\n'
          'window.PERF_PROMPT_MISSING = ' + json.dumps(missing, ensure_ascii=False, indent=0) + ';\n'
          '// schéma de la réponse (clés admises, relues par la page)\n'
          'window.PERF_PROMPT_SCHEMA = ' + json.dumps(json.loads(schema.group(1)), ensure_ascii=False) + ';\n')
    for out in OUTS:
        if not os.path.isdir(os.path.dirname(out)):
            continue
        old = io.open(out, encoding='utf-8').read() if os.path.exists(out) else ''
        rel = os.path.relpath(out, ROOT)
        if js != old:
            io.open(out, 'w', encoding='utf-8', newline='\n').write(js)
            if verbose:
                print(f'{rel} régénéré ({", ".join(f"{k} {len(v)}" for k, v in prompts.items())} caractères).')
        elif verbose:
            print(f'{rel} à jour.')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    build()
