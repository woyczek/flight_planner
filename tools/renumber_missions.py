"""Renumérotation des missions : lettre de FAMILLE + numéro d'opération sur 3 chiffres par famille (+ lettre d'équipe).

Format : « M-016 » (une équipe) ou « M-016A », « M-016B »… (opération à plusieurs équipes). La lettre désigne la famille
(tools/family_letters.py : M HEMS / MEDEVAC, S SAR, T AIRLIFT…) ; le numéro est compté par famille ; mission.series =
numéro de la série dans la famille (1, 2, 3…). Rangement : data/missions/<lettre>_<FAMILLE>/<identifiant>/ (un sous-dossier par mission : YAML,
résumé, cartes, PDF ; les noms génériques comme carte_assemblage.png n'entrent plus en collision).

Usage (depuis la racine de l'application) :
    python tools/renumber_missions.py [--order dossier1,dossier2,…] [--dry-run]
Séries à renuméroter : dossiers de data/missions contenant des missionNN.yaml (au niveau de la série ou dans un
sous-dossier NN/) ; les séries déjà au nouveau format (dossier « M_MEDEVAC », « S_SAR »…) sont gardées et comptées. Ordre : --order
(noms de dossiers), sinon date du plus ancien YAML puis numéro de série. Réécrit : mission.series / number / id
(+ former_id : ancien identifiant), operation.id / missions, noms de cartes (filename), titres « # Mission … », mentions
« Mission NN » / « soutien NN » ; renomme les fichiers (mission11.yaml → missionM-016.yaml, general11.png → generalM-016.png).
Un fichier en double (même nom dans le sous-dossier de la mission et au niveau de la série) : celui du sous-dossier est
gardé, l'autre va dans data/missions/_remplaces/<date>/. Trace : data/missions/RENUMEROTATION.md.
Bibliothèque standard uniquement.
"""
import datetime as dt, os, re, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from family_letters import FAMILY_LETTERS

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
MISSIONS = os.path.join(ROOT, 'data', 'missions')
DRY = '--dry-run' in sys.argv
ORDER = sys.argv[sys.argv.index('--order') + 1].split(',') if '--order' in sys.argv else []
NEW_DIR = re.compile(r'^[A-Z]_[A-Z0-9-]+$')
NEW_ID = re.compile(r'^([A-Z])-?(\d{3})([A-Z]?)$')
OLD_YAML = re.compile(r'^mission(\d+[A-Z]?)\.ya?ml$', re.I)
TODAY = dt.date.today().isoformat()


def read(p):
    """Texte du fichier (UTF-8, caractères illisibles remplacés)."""
    return open(p, encoding='utf-8', errors='replace').read()


def token(old):
    """Ancien identifiant comme jeton de nom de fichier / de texte (11 ≠ 11A ≠ 111)."""
    return re.compile(rf'(?<![0-9]){re.escape(old)}(?![0-9A-Z])')   # précédé d'une lettre possible : mission11, general11


def scan():
    """Séries à renuméroter : { dir, missions: [{ old, yaml, sub }], family, series, t0 } ; missions déjà au nouveau format :
    { lettre: { 'nums': [...], 'series': [...] } }."""
    series, done = [], {}
    for d in sorted(os.listdir(MISSIONS)):
        path = os.path.join(MISSIONS, d)
        if not os.path.isdir(path) or d.startswith(('_', '.')):
            continue
        if NEW_DIR.match(d):
            for sub in os.listdir(path):
                m = NEW_ID.match(sub)
                if not m:
                    continue
                info = done.setdefault(m.group(1), {'nums': [], 'series': []})
                info['nums'].append(int(m.group(2)))
                y = next((os.path.join(path, sub, n) for n in os.listdir(os.path.join(path, sub)) if n.lower().endswith(('.yaml', '.yml'))), None)
                sm = re.search(r'^\s+series:\s*[\'"]?(\d+)', read(y), re.M) if y else None
                if sm:
                    info['series'].append(int(sm.group(1)))
            continue
        found = []
        for name in os.listdir(path):
            full = os.path.join(path, name)
            if os.path.isfile(full) and OLD_YAML.match(name):
                found.append({'old': OLD_YAML.match(name).group(1).upper(), 'yaml': full, 'sub': None})
            elif os.path.isdir(full):
                for n2 in os.listdir(full):
                    if OLD_YAML.match(n2):
                        found.append({'old': OLD_YAML.match(n2).group(1).upper(), 'yaml': os.path.join(full, n2), 'sub': full})
        if not found:
            continue
        text = read(found[0]['yaml'])
        fam = (re.search(r'^\s+type:\s*([A-Z][A-Z0-9_-]*)', text, re.M) or [None, d.split('_')[0]])[1]
        ser = (re.search(r'^\s+series:\s*[\'"]?(\w+)', text, re.M) or [None, '0'])[1]
        t0 = min(os.path.getmtime(f['yaml']) for f in found)
        series.append({'dir': d, 'path': path, 'missions': found, 'family': fam, 'series': ser, 't0': t0})
    key = (lambda s: (ORDER.index(s['dir']) if s['dir'] in ORDER else len(ORDER), s['t0'], s['series'], s['family']))
    return sorted(series, key=key), done


def plan():
    """Séries à renuméroter avec leurs nouveaux identifiants, à la suite des numéros et séries déjà au nouveau format :
    chaque série reçoit letter, rank, newdir, mapping (ancien → nouvel identifiant) et op_map (opération → base)."""
    series, done = scan()
    num = {L: max(v['nums'] or [0]) for L, v in done.items()}
    rank = {L: max(v['series'] or [0]) for L, v in done.items()}
    out = []
    for s in series:
        letter = FAMILY_LETTERS.get(s['family'].upper())
        if not letter:
            raise SystemExit(f"Famille sans lettre : {s['family']} ({s['dir']}) — compléter tools/family_letters.py.")
        rank[letter] = rank.get(letter, 0) + 1
        ops = {}
        for m in s['missions']:
            ops.setdefault(int(re.match(r'\d+', m['old']).group()), []).append(m)
        mapping, op_map = {}, {}
        for opn in sorted(ops):
            num[letter] = num.get(letter, 0) + 1
            op_map[str(opn)] = f'{letter}-{num[letter]:03d}'
            for m in sorted(ops[opn], key=lambda x: x['old']):
                team = re.sub(r'^\d+', '', m['old'])
                m['new'] = f'{letter}-{num[letter]:03d}{team}'
                m['num'] = num[letter]
                mapping[m['old']] = m['new']
        out.append({**s, 'letter': letter, 'rank': rank[letter], 'newdir': f"{letter}_{s['family']}", 'mapping': mapping, 'op_map': op_map})
    return out


def rewrite(text, s, m=None):
    """Identifiants de la série remplacés dans un texte (YAML ou Markdown)."""
    mp, ops = s['mapping'], s['op_map']
    if m:
        text = re.sub(r'^(\s+series:\s*).*$', rf"\g<1>{s.get('rank', 1)}", text, count=1, flags=re.M)
        text = re.sub(r'^(\s+number:\s*).*$', rf"\g<1>{m['num']}", text, count=1, flags=re.M)
        text = re.sub(r"^(\s+)id:\s*['\"]?" + re.escape(m['old']) + r"['\"]?\s*$", rf"\g<1>id: '{m['new']}'\n\g<1>former_id: '{m['old']}'", text, count=1, flags=re.M)
    # operation.id et operation.missions
    text = re.sub(r"^(operation:\s*\n\s+id:\s*)['\"]?(\d+)['\"]?", lambda x: f"{x.group(1)}'{ops.get(x.group(2), x.group(2))}'", text, flags=re.M)
    def ids_list(x):
        """Liste « missions: [...] » réécrite avec les nouveaux identifiants."""
        vals = [v.strip().strip('\'"') for v in x.group(2).split(',') if v.strip()]
        return x.group(1) + ', '.join("'" + mp.get(v.upper(), v) + "'" for v in vals) + ']'
    text = re.sub(r"^(\s+missions:\s*\[)([^\]]*)\]", ids_list, text, flags=re.M)
    # renvois vers une autre mission de la série (ravitailleur ↔ ravitaillé…)
    text = re.sub(r"^(\s+(?:support_for|support_mission_id|linked_mission|parent_mission):\s*)['\"]?(\d+[A-Z]?)['\"]?\s*$", lambda x: f"{x.group(1)}'{mp.get(x.group(2).upper(), x.group(2))}'", text, flags=re.M)
    # noms de fichiers (cartes, pdf) et mentions « Mission NN », « soutien NN »
    for old in sorted(mp, key=len, reverse=True):
        new = mp[old]
        text = re.sub(rf'(?<=[a-z_])({re.escape(old)})(?=[-.])', new, text)                    # general11.png, detail_rdv11-1
        text = re.sub(rf'\b(Mission|mission|missions?|soutien)(\s+){re.escape(old)}(?![0-9A-Z])', rf'\g<1>\g<2>{new}', text)
    return text


def move(src, dst, log):
    """Déplace src vers dst ; si dst existe, src (doublon) va dans _remplaces/<date>/ (noté dans log). Rien en simulation."""
    if os.path.abspath(src) == os.path.abspath(dst):
        return
    if os.path.exists(dst):
        keep = os.path.join(MISSIONS, '_remplaces', TODAY, os.path.relpath(src, MISSIONS))
        log.append(f'   doublon gardé à part : {os.path.relpath(src, MISSIONS)} → _remplaces/{TODAY}/')
        if not DRY:
            os.makedirs(os.path.dirname(keep), exist_ok=True)
            shutil.move(src, keep)
        return
    if not DRY:
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.move(src, dst)


def run():
    """Renumérote les séries : fichiers rangés par mission, contenus réécrits, anciens dossiers vides retirés, table
    ajoutée à RENUMEROTATION.md (simulation : journal seulement)."""
    series = plan()
    if not series:
        print('Rien à renuméroter.')
        return
    log, table = [], []
    for s in series:
        log.append(f"{s['dir']} → {s['newdir']}/ ({s['family']}, ancienne série {s['series']} → série {s['rank']} de la famille)")
        newroot = os.path.join(MISSIONS, s['newdir'])
        # 1. sous-dossiers de mission existants (fichiers plus récents : prioritaires)
        for m in s['missions']:
            dst_dir = os.path.join(newroot, m['new'])
            table.append((m['new'], m['old'], s['dir'], s['family'], re.search(r'^title:\s*"?(.*?)"?\s*$', read(m['yaml']), re.M).group(1) if re.search(r'^title:', read(m['yaml']), re.M) else ''))
            log.append(f"   {m['old']} → {m['new']}")
            if m['sub']:
                for name in sorted(os.listdir(m['sub'])):
                    move(os.path.join(m['sub'], name), os.path.join(dst_dir, token(m['old']).sub(m['new'], name)), log)
        # 2. fichiers au niveau de la série : rattachés à une mission par leur jeton, sinon gardés à la racine de la série
        for name in sorted(os.listdir(s['path'])):
            full = os.path.join(s['path'], name)
            if not os.path.isfile(full):
                continue
            owner = next((m for m in sorted(s['missions'], key=lambda x: -len(x['old'])) if token(m['old']).search(name)), None)
            dst = os.path.join(newroot, owner['new'], token(owner['old']).sub(owner['new'], name)) if owner else os.path.join(newroot, name)
            move(full, dst, log)
        # 3. contenus réécrits (YAML et Markdown de chaque mission, textes de la série)
        if not DRY:
            for dirpath, _dirs, names in os.walk(newroot):
                for name in names:
                    if not re.search(r'\.(ya?ml|md|txt)$', name, re.I):
                        continue
                    p = os.path.join(dirpath, name)
                    own = next((m for m in s['missions'] if os.path.basename(dirpath) == m['new']), None)
                    t = read(p)
                    t2 = rewrite(t, s, own if name.lower().startswith('mission') and name.lower().endswith(('.yaml', '.yml')) else None)
                    if t2 != t:
                        open(p, 'w', encoding='utf-8', newline='').write(t2)
            # anciens dossiers devenus vides
            for dirpath, _dirs, _names in sorted(os.walk(s['path']), key=lambda x: -len(x[0])):
                if not os.listdir(dirpath):
                    os.rmdir(dirpath)
    print(('(simulation) ' if DRY else '') + '\n'.join(log))
    if not DRY:
        path = os.path.join(MISSIONS, 'RENUMEROTATION.md')
        head = '' if os.path.exists(path) else ('# Renumérotation des missions\n\nFormat : lettre de famille + tiret + numéro d’opération sur 3 chiffres, compté par '
                                                 'famille (+ lettre d’équipe). Ancien identifiant gardé dans mission.former_id.\n')
        with open(path, 'a', encoding='utf-8') as f:
            f.write(head + f'\n## {TODAY}\n\n| Nouveau | Ancien | Ancien dossier | Famille | Titre |\n|---|---|---|---|---|\n'
                    + ''.join(f'| {a} | {b} | {c} | {d} | {e} |\n' for a, b, c, d, e in table))
        print(f'Table : {os.path.relpath(path, ROOT)}')


if __name__ == '__main__':
    run()
