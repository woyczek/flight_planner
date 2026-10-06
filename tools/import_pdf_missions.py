"""Import de missions depuis des fichiers livrés en vrac (Téléchargements) : dossiers PDF et ZIP de cartes.

Pour une mission sans YAML (seulement son dossier PDF produit par le générateur de mission), le YAML et le résumé
Markdown sont RECONSTRUITS depuis le texte du PDF : titre, type, sous-type, aéronef / indicatif, résumé, description,
risques, équipes, rendez-vous (avec coordonnées). Les points tournants et la cible n'y figurent pas en coordonnées :
ils sont à compléter (mission.reconstructed_from_pdf: true, note dans le YAML).

Usage (depuis la racine de l'application ; pypdf requis) :
    python tools/import_pdf_missions.py plan.json            → exécute le plan
    python tools/import_pdf_missions.py plan.json --dry-run  → montre ce qui serait fait

plan.json : { "downloads": "…/Downloads", "missions": "data/missions", "items": [
    { "folder": "SAR_serie_4", "id": "41", "series": 4, "pdf": "S4-M41_….pdf", "zip": "IROISE_….zip", "zip_prefix": "" },
    { "folder": "AIRLIFT_serie_1_precomplete", "id": "13", "zip": "Mission_13_….zip", "pdf": "13_dossier_mission.pdf", "yaml": "keep" } ] }
Chaque mission est rangée dans <missions>/<folder>/<id>/ (sous-dossier par mission : noms génériques comme
carte_assemblage.png sans collision). « yaml: keep » : le YAML existe déjà (seuls PDF et cartes sont ajoutés).
Un fichier existant remplacé est déplacé dans <missions>/_remplaces/<date>/ (rien n'est supprimé).
"""
import datetime as dt, json, os, re, shutil, sys, zipfile

sys.stdout.reconfigure(encoding='utf-8')
DRY = '--dry-run' in sys.argv


def pdf_text(path):
    import pypdf
    r = pypdf.PdfReader(path)
    pages = [p.extract_text() or '' for p in r.pages]
    text = '\n'.join(pages)
    text = re.sub(r'^© (?:DEFA|SO Group) Virtual.*$', '', text, flags=re.M)          # pieds de page
    text = re.sub(r'^Carte d.assemblage\s*$|^Carte générale\s*$', '', text, flags=re.M)
    return text


def between(text, start, ends):
    m = re.search(rf'^{start}\s*$', text, re.M)
    if not m:
        return ''
    rest = text[m.end():]
    cut = min([x.start() for e in ends for x in [re.search(rf'^{e}\s*$', rest, re.M)] if x] or [len(rest)])
    return rest[:cut].strip()


def paragraphs(block):
    """Lignes coupées du PDF → paragraphes (une ligne qui finit par . ! ? » ou : termine un paragraphe)."""
    out, cur = [], []
    for line in block.split('\n'):
        line = line.strip()
        if not line:
            continue
        cur.append(line)
        if re.search(r'[.!?»:)]\s*$', line) and len(line) < 95:
            out.append(' '.join(cur)); cur = []
    if cur:
        out.append(' '.join(cur))
    return [re.sub(r'\s+', ' ', p) for p in out]


def parse_pdf(path):
    t = pdf_text(path)
    head = t.split('Information Valeur')[0] if 'Information Valeur' in t else t.split('\n', 2)[0]
    m = re.match(r'\s*Mission\s+(\S+)\s*-\s*(.+)', ' '.join(head.split()), re.S)
    old_id, title = (m.group(1), m.group(2).strip()) if m else ('', ' '.join(head.split()))
    title = re.sub(r'\s+-\s+', ' — ', title, count=1)
    info = {k: v.strip() for k, v in re.findall(r'^(Type de mission|Sous-type|Équipes impliquées|Aéronefs impliqués|Types / callsigns) (.+)$', t, re.M)}
    concerned = re.search(r'^Aéronef concerné : (.+)$', t, re.M)
    rdv_line = re.search(r'^Rendez-vous / coordination : (.+)$', t, re.M)
    summary = paragraphs(between(t, 'Summary', ['Description détaillée']))
    detailed = paragraphs(between(t, 'Description détaillée', ['Risques et points d.attention', 'Équipes engagées', 'Rendez-vous']))
    risks_block = between(t, 'Risques et points d.attention', ['Équipes engagées', 'Rendez-vous'])
    risks = [re.sub(r'\s+', ' ', r).strip(' -') for r in re.split(r'\n?•', risks_block) if r.strip()]
    teams_block = between(t, 'Équipes engagées', ['Rendez-vous', 'Scénario de simulation.*'])
    teams = []
    for line in teams_block.split('\n')[1:]:
        line = line.strip()
        if line and not line.startswith('Nom /'):
            parts = line.split(' ', 1)
            teams.append({'name': parts[0], 'rest': parts[1] if len(parts) > 1 else ''})
    rdvs = [{'id': a, 'name': b.strip(), 'lat': float(c), 'lon': float(d), 'participants': e.strip()}
            for a, b, c, d, e in re.findall(r'^(RDV-\d+) (.+?) (-?\d+\.\d+), (-?\d+\.\d+) ?(.*)$', t, re.M)]
    aircraft = []
    for chunk in (info.get('Types / callsigns') or (concerned.group(1) if concerned else '')).split(', '):
        m2 = re.match(r'(\S+)\s+(.*?)\s+-\s+(\S+)$', chunk.strip())
        if m2:
            aircraft.append({'type': m2.group(1), 'variant': m2.group(2), 'callsign': m2.group(3)})
    return {'old_id': old_id, 'title': title, 'type': info.get('Type de mission', ''), 'subtype': info.get('Sous-type', ''),
            'teams_count': info.get('Équipes impliquées', ''), 'aircraft': aircraft,
            'concerned': concerned.group(1).strip() if concerned else '', 'rdv_line': rdv_line.group(1).strip() if rdv_line else '',
            'summary': summary, 'detailed': detailed, 'risks': risks, 'teams': teams, 'rdvs': rdvs}


def q(s):
    return '"' + str(s).replace('\\', '\\\\').replace('"', '\\"') + '"'


def lit(pars, indent='  '):
    return '|-\n' + '\n\n'.join(indent + p for p in pars) if pars else '""'


def build_yaml(p, mid, series, maps, operation=None, pdf_name=''):
    ac = '\n'.join(f"  - type: {p2['type']}\n    variant: {q(p2['variant'])}\n    callsign: {p2['callsign']}" for p2 in p['aircraft']) or '  []'
    rdv = '\n'.join(f"  - id: {r['id']}\n    name: {q(r['name'])}\n    lat: {r['lat']:.6f}\n    lon: {r['lon']:.6f}\n    participants: {q(r['participants'])}" for r in p['rdvs'])
    teams = '\n'.join(f"  - name: {q(x['name'])}\n    description: {q(x['rest'])}" for x in p['teams'])
    target = p['rdvs'][0] if p['rdvs'] else None
    mp = '\n'.join(f"  - id: {os.path.splitext(f)[0]}\n    filename: {f}\n    type: {kind}" for f, kind in maps)
    num = int(re.sub(r'\D', '', mid) or 0)
    op = (f"operation:\n  id: '{operation['id']}'\n  name: {q(operation['name'])}\n  missions: [{', '.join(repr(x) for x in operation['missions'])}]\n") if operation else ''
    return f"""schema: helo-xp-mission
schema_version: '1.0'

mission:
  series: {series}
  number: {num}
  id: '{mid}'
  type: {p['type'] or 'null'}
  subtype: {p['subtype'] or 'null'}
  reconstructed_from_pdf: true
{op}
title: {q(p['title'])}

summary: {lit(p['summary'])}

detailed_description: {lit(p['detailed'])}

target:
  id: TARGET
  name: {q(target['name'] if target else 'à compléter')}
  lat: {f"{target['lat']:.6f}" if target else 'null'}
  lon: {f"{target['lon']:.6f}" if target else 'null'}

turning_points: []

aircraft:
{ac}

rendezvous:
{rdv or '  []'}

teams:
{teams or '  []'}

maps:
{mp or '  []'}

notes:
  - "Reconstruit depuis le dossier PDF {pdf_name} (import du {dt.date.today().isoformat()}) : points tournants et coordonnées de la cible à compléter (la cible reprend le premier rendez-vous)."
"""


def build_md(p, mid):
    lines = [f"# Mission {mid} — {p['title']}", '', '## Introduction', '']
    if p['concerned']:
        lines.append(f"**Aéronef concerné :** {p['concerned'].replace(' - ', ' — ')}  ")
    if p['rdv_line']:
        lines.append(f"**Rendez-vous / coordination :** {p['rdv_line'].replace(' - ', ' — ')}")
    lines += ['', '## Summary', '', *sum(([x, ''] for x in p['summary']), []), '## Description détaillée', '', *sum(([x, ''] for x in p['detailed']), [])]
    if p['risks']:
        lines += ['## Risques et points d’attention', '', *[f'- {r}' for r in p['risks']], '']
    if p['teams']:
        lines += ['## Équipes engagées', '', '| Nom / callsign | Détails |', '|---|---|', *[f"| {x['name']} | {x['rest']} |" for x in p['teams']], '']
    if p['rdvs']:
        lines += ['## Rendez-vous', '', '| ID | Nom | Position | Participants |', '|---|---|---|---|', *[f"| {r['id']} | {r['name']} | {r['lat']:.5f}, {r['lon']:.5f} | {r['participants']} |" for r in p['rdvs']], '']
    lines += ['> Scénario de simulation — ne pas utiliser pour une mission réelle.', '']
    return '\n'.join(lines)


def map_kind(name):
    n = name.lower()
    for k, v in (('assemblage', 'assemblage'), ('profil_vertical', 'profil_vertical'), ('detail_rdv', 'detail_rdv'), ('detail_cible', 'detail'), ('general', 'general'), ('cible', 'target'), ('zone', 'zone')):
        if k in n:
            return v
    return 'map'


def put(dst, data, moved, missions_root):
    if os.path.exists(dst):
        if open(dst, 'rb').read() == data:
            return 'identique'
        keep = os.path.join(missions_root, '_remplaces', dt.date.today().isoformat(), os.path.relpath(dst, missions_root))
        moved.append(os.path.relpath(dst, missions_root))
        if not DRY:
            os.makedirs(os.path.dirname(keep), exist_ok=True)
            shutil.move(dst, keep)
    if not DRY:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'wb').write(data)
    return 'écrit'


def main():
    plan = json.load(open(sys.argv[1], encoding='utf-8'))
    dl, root = plan['downloads'], plan['missions']
    moved, report = [], []
    for it in plan['items']:
        mdir = os.path.join(root, it['folder'], it['id'])
        maps = []
        if it.get('zip'):
            with zipfile.ZipFile(os.path.join(dl, it['zip'])) as z:
                pre = it.get('zip_prefix', '')
                for n in z.namelist():
                    if n.endswith('/') or not n.startswith(pre) or not re.search(r'\.(png|jpe?g|svg)$', n, re.I):
                        continue
                    leaf = n.split('/')[-1]
                    maps.append((leaf, map_kind(leaf)))
                    report.append(f"{it['folder']}/{it['id']}/{leaf} : {put(os.path.join(mdir, leaf), z.read(n), moved, root)}")
        if it.get('pdf'):
            data = open(os.path.join(dl, it['pdf']), 'rb').read()
            pdf_name = 'mission' + it['id'] + '.pdf'
            report.append(f"{it['folder']}/{it['id']}/{pdf_name} : {put(os.path.join(mdir, pdf_name), data, moved, root)}")
        if it.get('yaml') != 'keep' and it.get('pdf'):
            p = parse_pdf(os.path.join(dl, it['pdf']))
            yml = build_yaml(p, it['id'], it['series'], maps, it.get('operation'), it['pdf'])
            md = build_md(p, it['id'])
            for name, text in ((f"mission{it['id']}.yaml", yml), (f"summary{it['id']}.md", md)):
                report.append(f"{it['folder']}/{it['id']}/{name} : {put(os.path.join(mdir, name), text.encode('utf-8'), moved, root)} (reconstruit : {p['title'][:50]})")
        elif it.get('yaml') == 'keep':
            # YAML existant (niveau série) : rangé avec ses cartes dans le sous-dossier de la mission
            for name in (f"mission{it['id']}.yaml", f"summary{it['id']}.md"):
                src = os.path.join(root, it['folder'], name)
                if os.path.exists(src):
                    report.append(f"{it['folder']}/{it['id']}/{name} : déplacé dans le sous-dossier")
                    if not DRY:
                        os.makedirs(mdir, exist_ok=True)
                        shutil.move(src, os.path.join(mdir, name))
    print(('(simulation) ' if DRY else '') + f'{len(report)} opérations :')
    for r in report:
        print('  ' + r)
    if moved:
        print(f'Remplacés (gardés dans _remplaces/{dt.date.today().isoformat()}/) : ' + ', '.join(moved))


if __name__ == '__main__':
    main()
