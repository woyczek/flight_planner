"""Change la version de cache (?v=…) des scripts et feuilles de style partagés dans toutes les
pages HTML du dépôt, pour que les navigateurs rechargent les fichiers modifiés.

Usage (à la racine du dépôt) :
    python tools/bump_versions.py            → version du jour, lettre suivante (20260924a, b…)
    python tools/bump_versions.py 20261001a  → version imposée

Concerne les références shared/…js|css?v=… des pages HTML, et les chargements internes de
shared/repository_nav.js (profil pilote, données locales, accès aux dossiers, contrôle des mises à jour, designs). Les fichiers sans ?v= (données
régénérées par script, ex. AircraftDB/aircraft_db.js) ne sont pas concernés.
"""
import datetime as dt, glob, io, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
REF = re.compile(r'((?:\.\./)?shared/[\w/.-]+\.(?:js|css))\?v=(\w+)')

pages = [p for p in glob.glob(os.path.join(ROOT, '**', '*.html'), recursive=True)  # apps/…, docs/ (hors data/ : dépôt de données)
         if not os.path.relpath(p, ROOT).replace(os.sep, '/').startswith(('data/', 'examples/'))]
nav = os.path.join(ROOT, 'shared', 'repository_nav.js')
if len(sys.argv) > 1:
    version = sys.argv[1]
else:
    # Toujours supérieure à toutes les versions existantes (jamais une ancienne version,
    # peut-être encore en cache) : date du jour + 'a', ou lettre suivante de la plus récente.
    today = dt.date.today().strftime('%Y%m%d')
    used = [m.group(2) for p in pages for m in REF.finditer(io.open(p, encoding='utf-8').read())]
    used += re.findall(r'\.js\?v=(\d{8}\w*)', io.open(nav, encoding='utf-8').read())
    latest = max((v for v in used if re.fullmatch(r'\d{8}[a-z]*', v)), key=lambda v: (v[:8], len(v), v), default='')
    if not latest or today > latest[:8]:
        version = today + 'a'
    else:
        suffix = latest[8:] or '`'
        version = latest[:8] + (suffix[:-1] + chr(ord(suffix[-1]) + 1) if suffix[-1] != 'z' else suffix + 'a')

# prompt de génération de missions : régénéré depuis docs/ (tools/build_mission_prompt.py)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_mission_prompt
build_mission_prompt.build(verbose=False)

changed = 0
for p in pages:
    s = io.open(p, encoding='utf-8', newline='').read()
    t = REF.sub(lambda m: f'{m.group(1)}?v={version}', s)
    # scripts propres à l'application SIA XML (chargés sans « shared/ ») : versionnés aussi
    t = re.sub(r'((?:mission_prompt|mission_store|sia_i18n|aero_symbols|vertical_profile)\.js)\?v=\w+', lambda m: f'{m.group(1)}?v={version}', t)
    # repository_tree (arborescence, thèmes, designs, familles de couleurs) : versionné aussi, sinon le navigateur
    # garde une ancienne copie après une mise à jour
    t = re.sub(r'((?:\.\./|\./)*repository_tree)(?:\?v=\w+)?"', lambda m: f'{m.group(1)}?v={version}"', t)
    if t != s:
        io.open(p, 'w', encoding='utf-8', newline='').write(t); changed += 1
s = io.open(nav, encoding='utf-8', newline='').read()
t = re.sub(r'((?:pilot_profile|browser_store|file_access|block_icons|side_nav|suite_update|icons/repository_icons)\.js|designs\.css)\?v=\w+', lambda m: f'{m.group(1)}?v={version}', s)
if t != s:
    io.open(nav, 'w', encoding='utf-8', newline='').write(t)
# textures, décors et icônes des designs à matières (shared/textures, shared/deco, shared/icons/skeuo) : adresses versionnées dans la feuille des designs, sinon
# un navigateur garde les anciennes images après une mise à jour (les scripts reprennent la version de leur ?v=)
for css in [os.path.join(ROOT, 'shared', 'designs_skeuo.css'), os.path.join(ROOT, 'shared', 'block_icons.css')]:
    s = io.open(css, encoding='utf-8', newline='').read()
    t = re.sub(r'((?:textures|deco/\w+|icons/skeuo/\w+)/[\w-]+\.webp)(?:\?v=\w+)?', lambda m: f'{m.group(1)}?v={version}', s)
    if t != s:
        io.open(css, 'w', encoding='utf-8', newline='').write(t)
print(f'Version {version} : {changed} page(s) mise(s) à jour.')
