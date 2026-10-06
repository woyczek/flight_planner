"""État des assets des designs à matières : ce que le code attend, ce qui est là, ce qui manque (docs/technique/ASSETS_A_FOURNIR.md
pour les consignes de génération et d'intégration).

Usage (à la racine du dépôt) :
    python tools/assets_status.py              tableau par famille et liste des manquants
    python tools/assets_status.py --new        en plus : images déposées depuis le dernier relevé (dossier de dépôt)
    python tools/assets_status.py --mark       note le relevé (les images déposées jusqu'ici sont « vues »)
    --drop <dossier>                           dossier de dépôt des images (défaut : shared/deco du dossier Synology s'il
                                               existe — E:/SynologyDrive ou ~/SynologyDrive, le même partage —,
                                               sinon shared/deco du dépôt)

Une famille est « complète » pour un design quand tous ses fichiers sont là ; les familles facultatives sont signalées.
Les attentes sont décrites dans SPEC (noms de fichiers sous shared/deco/<design>/), plus deux contrôles dans le code
(appareil de page d'Aqua, panneaux du ton sombre du Carnet de vol).
"""
import argparse, glob, io, json, os, re, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
DECO = os.path.join(ROOT, 'shared', 'deco')
SEEN = os.path.join(ROOT, 'tools', '.assets_seen.json')
# dossier de dépôt : le partage Synology (synchronisé sur E: et dans le profil, même contenu)
SYNOLOGY = next((d for d in (r'E:\SynologyDrive\XP11\Documentation\shared\deco',
                             os.path.join(os.path.expanduser('~'), 'SynologyDrive', 'XP11', 'Documentation', 'shared', 'deco'))
                 if os.path.isdir(d)), r'E:\SynologyDrive\XP11\Documentation\shared\deco')
THEMES = ['aircraft', 'airfield', 'time', 'radio', 'nav', 'gear', 'awards', 'families', 'ops']
PANELS = [f'panel-{t}-{o}.webp' for t in THEMES for o in 'wt']
SHEET = [f'sheet-{p}.webp' for p in ('tl', 'tr', 'bl', 'br', 'top', 'bot', 'left', 'right', 'paper')]
DESIGNS = ['cabinet', 'flightlog', 'field', 'aqua']
TABS = ['tabs/rail.webp', 'tabs/tab.webp', 'tabs/tab-on.webp']
NAMES = {'cabinet': 'Cabinet', 'flightlog': 'Carnet de vol', 'field': 'Durci', 'aqua': 'Aqua'}

# famille → (facultative ?, {design: [fichiers attendus, relatifs à shared/deco/<design>/]} ; None : sans objet)
SPEC = {
    'Panneaux, ton sombre (ou unique)': (False, {
        'cabinet': ['1930/' + f for f in PANELS], 'field': PANELS,
        'flightlog': ['panels/' + f for f in PANELS], 'aqua': ['panels/' + f for f in PANELS]}),
    'Panneaux, ton clair': (False, {
        'cabinet': ['1930/clair/' + f for f in PANELS], 'flightlog': ['clair/' + f for f in PANELS], 'field': None,
        'aqua': ['clair/' + f for f in PANELS]}),
    'Feuille de registre': (False, {d: SHEET for d in DESIGNS}),
    'Carnets du Studio (aperçus des cartes)': (False, {
        'cabinet': None, 'flightlog': ['notebook-closed.webp', 'notebook-open.webp'],
        'field': ['notebook-closed.webp', 'notebook-open.webp'], 'aqua': ['notebook-closed.webp', 'notebook-open.webp']}),
    'Frise de pied de page': (False, {
        'cabinet': ['footer.webp'], 'flightlog': ['footer.webp'], 'field': ['footer.webp'], 'aqua': ['footer.webp']}),
    'Objets de coin de bloc (ordre, étiquette, dossier)': (True, {
        'cabinet': ['order.webp', 'tag-secret.webp', 'dossier.webp'], 'flightlog': None, 'field': None,
        'aqua': ['order.webp', 'tag-secret.webp', 'dossier.webp']}),
    'Dossier de mission (Mes missions)': (False, {
        'cabinet': ['mission-cover.webp', 'mission-seal-fitted.webp', 'mission-open.webp', 'mission-page.webp', 'page-corner.webp'],
        'flightlog': ['mission-closed.webp', 'mission-sealed.webp', 'mission-open.webp', 'mission-page.webp', 'page-corner.webp', 'order-header.webp'],
        'field': ['mission-closed.webp', 'mission-sealed.webp', 'mission-seal-fitted.webp', 'mission-open.webp', 'mission-page.webp', 'page-corner.webp', 'order-header.webp'],
        'aqua': ['mission-cover.webp', 'mission-seal-fitted.webp', 'mission-open.webp', 'mission-page.webp', 'page-corner.webp', 'order-header.webp']}),
    'Signet du dossier de mission': (True, {
        'cabinet': ['bookmark-body.webp', 'bookmark-tail.webp'], 'flightlog': ['bookmark-body.webp', 'bookmark-tail.webp'],
        'field': ['bookmark-body.webp', 'bookmark-tail.webp'], 'aqua': ['bookmark-body.webp', 'bookmark-tail.webp']}),
    'En-têtes d’ordre par famille (Mes missions)': (True, {
        'cabinet': ['order-header-mn.webp', 'order-header-emg.webp', 'order-header-fam.webp', 'order-header-dfam.webp',
                    'order-header-prefmar.webp', 'order-header-ban.webp', 'order-header-escadrille.webp', 'order-header-embarquee.webp'],
        'flightlog': ['order-header-snpc.webp', 'order-header-marignane.webp', 'order-header-cev.webp', 'order-header-tam.webp',
                      'order-header-helico.webp', 'order-header-sna.webp', 'order-header-alat.webp', 'order-header-aeronavale.webp'],
        'field': ['order-header-ema.webp', 'order-header-bspp.webp', 'order-header-ssa.webp', 'order-header-hia.webp',
                  'order-header-dcssa.webp', 'order-header-emzd.webp', 'order-header-dmd.webp', 'order-header-cpco.webp'],
        'aqua': ['order-header-sdis.webp', 'order-header-samu.webp', 'order-header-hopital.webp', 'order-header-ars.webp',
                 'order-header-prefet.webp', 'order-header-interieur.webp', 'order-header-coz.webp', 'order-header-cpco.webp']}),
    'Tampons d’émetteur par famille (Mes missions, signature)': (True, {
        'cabinet': ['order-stamp-emg.webp'], 'field': ['order-stamp-ema.webp'], 'aqua': None,
        'flightlog': ['order-stamp-snpc.webp', 'order-stamp-marignane.webp', 'order-stamp-cev.webp', 'order-stamp-tam.webp',
                      'order-stamp-helico.webp', 'order-stamp-sna.webp', 'order-stamp-alat.webp', 'order-stamp-aeronavale.webp']}),
    'Pli scellé de l’exercice (Mes missions)': (True, {
        'cabinet': ['pli-sealed.webp'], 'flightlog': ['pli-sealed.webp'], 'field': ['pli-sealed.webp'], 'aqua': ['pli-sealed.webp']}),
    # onglets en tête de page (repository_nav.js, REPOSITORY_TREE.tabs) : rail, poussoir relâché, poussoir enfoncé et
    # éclairé (page courante) ; sans texte (libellés en 4 langues posés par la page) ; docs/technique/ASSETS_A_FOURNIR.md § 6
    'Onglets de page (Paramètres, générateur ⇄ studio)': (True, {d: TABS + (['tabs/led.webp'] if d == 'field' else []) for d in DESIGNS}),
    'Liseré du bloc à onglets (laiton : Cabinet ; acier : Carnet de vol, Durci, Aqua)': (True, {d: ['tabs/lisere.webp'] for d in DESIGNS}),
}


def code_checks():
    """Attentes portées par le code : appareil de page d'Aqua (SETS.aqua.device)."""
    deco = io.open(os.path.join(ROOT, 'shared', 'design_deco.js'), encoding='utf-8').read()
    m = re.search(r'\n    aqua: \{(.*?)\n    \}', deco[deco.index('const SETS'):], re.S) if 'const SETS' in deco else None
    has_device = bool(m and 'device' in m.group(1))
    return {'Appareil de page (deux objets)': {
        'cabinet': True, 'flightlog': True, 'field': True, 'aqua': has_device}}


def status():
    rows, missing = [], {}
    for fam, (optional, per) in SPEC.items():
        cells = {}
        for d in DESIGNS:
            want = per.get(d)
            if want is None:
                cells[d] = '—'
                continue
            miss = [f for f in want if not os.path.isfile(os.path.join(DECO, d, f))]
            cells[d] = 'complet' if not miss else f'{len(want) - len(miss)}/{len(want)}'
            if miss:
                missing.setdefault(d, []).append((fam + (' (facultatif)' if optional else ''), miss))
        rows.append((fam, cells))
    for fam, per in code_checks().items():
        cells = {d: 'complet' if ok else 'à faire' for d, ok in per.items()}
        for d, ok in per.items():
            if not ok:
                missing.setdefault(d, []).append((fam, ['deux objets transparents (appareil + compagnon)']))
        rows.append((fam, cells))
    return rows, missing


def compress(files):
    """panel-<thème>-<o>.webp regroupés par thème : « aircraft (w), radio (w, t) »."""
    out, panels = [], {}
    for f in files:
        m = re.match(r'(?:(.*)/)?panel-(\w+)-([wt])\.webp$', f)
        if m:
            panels.setdefault((m.group(1) or '', m.group(2)), []).append(m.group(3))
        else:
            out.append(f)
    if panels:
        base = next(iter(panels))[0]
        out.insert(0, (f'{base}/' if base else '') + 'panneaux : ' + ', '.join(f'{t} ({", ".join(o)})' for (_, t), o in panels.items()))
    return out


def new_drops(drop):
    seen = {}
    try:
        seen = json.load(io.open(SEEN, encoding='utf-8'))
    except (OSError, ValueError):
        pass
    since = seen.get('at', 0)
    files = [p for p in glob.glob(os.path.join(drop, '**', '*.png'), recursive=True) if os.path.getmtime(p) > since]
    return since, sorted(files, key=os.path.getmtime)


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser()
    ap.add_argument('--new', action='store_true')
    ap.add_argument('--mark', action='store_true')
    ap.add_argument('--drop', default=SYNOLOGY if os.path.isdir(SYNOLOGY) else DECO)
    a = ap.parse_args()
    rows, missing = status()
    w = max(len(f) for f, _ in rows)
    print('Famille'.ljust(w), *[NAMES[d].ljust(13) for d in DESIGNS])
    for fam, cells in rows:
        print(fam.ljust(w), *[cells[d].ljust(13) for d in DESIGNS])
    print()
    print('Manquants :')
    for d in DESIGNS:
        if d not in missing:
            continue
        print(f'  {NAMES[d]}')
        for fam, files in missing[d]:
            print(f'    - {fam} : ' + ' ; '.join(compress(files)))
    if a.new or a.mark:
        since, files = new_drops(a.drop)
        print()
        print(f'Images déposées depuis le dernier relevé ({a.drop}) : {len(files)}')
        for p in files:
            print('   ', os.path.relpath(p, a.drop))
    if a.mark:
        import time
        io.open(SEEN, 'w', encoding='utf-8').write(json.dumps({'at': time.time()}))
        print('Relevé noté.')


if __name__ == '__main__':
    main()
