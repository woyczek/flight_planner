"""Crée les deux pages d'une nouvelle famille du Mission Report Core (saisie de CR + reporting)
et les déclare dans repository_tree (thème, dossier, pages hors menu). Les pages de
l'application sont dans le dossier « apps/cr/ ».

Usage (à la racine du dépôt) :
    python tools/new_family_pages.py famille.json

famille.json :
    {"family": "TANKER", "folder": "TANKER", "prefix": "tanker", "file": "tanker",
     "cr_title": "TANKER — Compte rendu de mission", "rep_title": "TANKER — Reporting missions",
     "color": "#0f766e", "favicon": "favicon-flight.svg"}

- family : identifiant (celui de MissionCore.registerFamily dans shared/mission_core/families/<file>.js)
- folder / prefix : pages apps/cr/<folder>/<prefix>_cr.html et apps/cr/<folder>/<prefix>_reporting.html
- file : nom du module de la famille (shared/mission_core/families/<file>.js, à écrire avant)
- color / favicon : thème du dossier (theme facultatif : réutiliser un thème existant)

Les pages sont copiées depuis celles de HEMS (mêmes scripts, mêmes versions de cache).
Reste à ajouter la famille à l'index MissionVocab.families (shared/mission_core/vocab.js :
en-tête famille / sous-type et page « Nouveau compte rendu »).
"""
import io, json, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
APP = 'apps/cr'  # dossier de l'application CR (pages ; registres : data/cr)
cfg = json.load(io.open(sys.argv[1], encoding='utf-8'))
fam, folder, prefix, file = cfg['family'], cfg['folder'], cfg['prefix'], cfg.get('file', cfg['prefix'])


def from_template(name, title):
    """Page de HEMS (name) adaptée à la nouvelle famille : titre, en-tête, module et identifiant de la famille."""
    s = io.open(os.path.join(ROOT, APP, 'HEMS', name), encoding='utf-8').read()
    s = re.sub(r'<title>.*?</title>', f'<title>{title}</title>', s)
    s = re.sub(r'(<header class="mc-header"><h1>).*?(</h1>)', lambda m: m.group(1) + title + m.group(2), s)
    s = s.replace('families/hems.js', f'families/{file}.js').replace("family: 'HEMS'", f"family: '{fam}'")
    return s


os.makedirs(os.path.join(ROOT, APP, folder), exist_ok=True)
for name, suffix, title in (('hems_medevac_cr.html', 'cr', cfg['cr_title']), ('hems_medevac_reporting.html', 'reporting', cfg['rep_title'])):
    io.open(os.path.join(ROOT, APP, folder, f'{prefix}_{suffix}.html'), 'w', encoding='utf-8', newline='\n').write(from_template(name, title))

p = os.path.join(ROOT, 'config', 'repository_tree')
s = io.open(p, encoding='utf-8', newline='').read()
crlf = '\r\n' in s; s = s.replace('\r\n', '\n')
theme = cfg.get('theme', prefix.lower())
if 'theme' not in cfg and f'\n    {theme}:{{' not in s:
    anchor = '    flight:{bar:"#101317"'
    s = s.replace(anchor, f'    {theme}:{{bar:"{cfg["color"]}",barText:"#ffffff",page:"#f5f6f8",accent:"{cfg["color"]}",favicon:"assets/{cfg["favicon"]}"}},\n' + anchor, 1)
if f'"{APP}/{folder}":{{' not in s:
    anchor = '    "apps/landing":{theme:"landing"'
    s = s.replace(anchor, f'    "{APP}/{folder}":{{theme:"{theme}",favicon:"assets/{cfg["favicon"]}"}},\n' + anchor, 1)
if f'{APP}/{folder}/{prefix}_cr.html' not in s:
    anchor = f'    {{path:"{APP}/MissionCore/demo_cr.html"'
    s = s.replace(anchor, f'    {{path:"{APP}/{folder}/{prefix}_cr.html",menu:false,label:"{cfg["cr_title"]}"}},\n'
                          f'    {{path:"{APP}/{folder}/{prefix}_reporting.html",menu:false,label:"{cfg["rep_title"]}"}},\n' + anchor, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if crlf else s)
print(f'Pages {APP}/{folder}/{prefix}_cr.html et _reporting.html créées ; repository_tree mis à jour.')
print(f"À faire : ajouter ['{fam}', '<libellé>', '{folder}/{prefix}'] à la liste des familles de shared/mission_core/vocab.js.")
