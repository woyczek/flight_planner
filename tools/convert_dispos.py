"""Conversion des disponibilités en grille (ancien format) vers le format par plages (docs/DISPOS_ET_REORGANISATION.md § 1.3).

Ancien format : data/disponibilites/<TRI>.json, grille 7 jours × 24 heures (UTC) de codes de l'ODV, par semaine (weeks,
clé : lundi ISO) ou une seule grille (grid) rattachée à la semaine de sa saisie (updated_at).
Nouveau format : un fichier par pilote et par semaine ISO, data/disponibilites/<TRI>/<AAAA>-W<nn>.json :
    { "schema": 2, "va": "DEFA", "pilote": "RBR", "semaine": "2026-W41", "updated_at": "…", "by": "conversion",
      "dispos": { "2026-10-06": [ { "debut": "19:00", "fin": "22:00", "categorie": "defense_perso" } ] },
      "appareils": { "possedes": [], "maitrises": [] }, "simulateurs": [] }
Heures consécutives du même code → une plage ; journée entière → debut / fin null. Code → catégorie : champ « odv » des
catégories de data/config/disponibilites.json (sinon la table par défaut ci-dessous, la même que shared/dispos.js).

Préférences de thèmes : un pilote sans fiche utilisateur (data/utilisateurs/<TRI>.json) ou sans préférences, dont la
grille porte des codes C / T / N, en reçoit par défaut (C → défense COMBAT, ISR, COMMAND, AAR ; T → AIRLIFT, AIRBORNE,
AAR ; N → MARITIME et SAR ; réunion des thèmes) : sans elles, « défense personnalisée » ouvrirait tout le domaine.

Les anciens fichiers ne sont ni modifiés ni supprimés (lus tant qu'ils ne sont pas convertis). L'index
data/disponibilites/_index.json est refait.

Usage (à la racine de la suite) :
    python tools/convert_dispos.py            # aperçu : ce qui serait écrit
    python tools/convert_dispos.py --write    # écrit les fichiers par semaine, les préférences et l'index
    python tools/convert_dispos.py --data <dossier des données> [--pilote RBR] [--no-prefs] [--force]
Une semaine déjà saisie au nouveau format (by ≠ « conversion ») est gardée, sauf --force.
"""
import argparse, datetime, json, os, re, sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

# code de l'ODV → catégorie (défaut, si data/config/disponibilites.json est absent)
DEFAULT_CODES = {'O': 'tout', 'SC': 'secu', 'C': 'defense_perso', 'T': 'defense_perso', 'N': 'defense_perso',
                 'S': 'exercice_vol', 'AM': 'exercice_ctrl', 'G': 'vol_hors', 'DC': 'dcs', 'AT': 'ctrl_hors',
                 'IN': 'indispo', 'V': 'conges', 'Q': 'recup', 'IR': 'irl'}
DEFAULT_IMPORT = {'C': {'defense': ['COMBAT', 'ISR', 'COMMAND', 'AAR']}, 'T': {'defense': ['AIRLIFT', 'AIRBORNE', 'AAR']},
                  'N': {'defense': ['MARITIME'], 'secu': ['SAR']}}
NOW = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def load_json(path):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def write_json(path, value, indent=1):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(value, f, ensure_ascii=False, indent=indent)
        f.write('\n')


def iso_week(monday):
    y, w, _ = monday.isocalendar()
    return f'{y}-W{w:02d}'


def monday_of(day):
    return day - datetime.timedelta(days=day.weekday())


def week_grids(doc):
    """Semaines d'une déclaration : { lundi (date) : grille } (weeks, sinon la grille seule à la semaine de sa saisie)."""
    weeks = doc.get('weeks') or {}
    if weeks:
        return {datetime.date.fromisoformat(k): v for k, v in weeks.items()}
    grid = doc.get('grid') or []
    if not any(any(c for c in row if c) for row in grid):
        return {}
    at = doc.get('updated_at') or NOW
    day = datetime.datetime.fromisoformat(at.replace('Z', '+00:00')).date()
    return {monday_of(day): grid}


def ranges(row, codes):
    """Heures consécutives du même code → plages [(debut, fin, categorie)] ; journée entière → (None, None, cat)."""
    out, h = [], 0
    row = [(c if c is not True else 'O') if c else '' for c in (list(row) + [''] * 24)[:24]]
    while h < 24:
        code = row[h]
        if not code:
            h += 1
            continue
        k = h
        while k < 24 and row[k] == code:
            k += 1
        cat = codes.get(code)
        if cat:
            out.append((None, None, cat) if h == 0 and k == 24 else (f'{h:02d}:00', f'{k:02d}:00', cat))
        h = k
    return out


def main():
    ap = argparse.ArgumentParser(description='Conversion des disponibilités en grille vers le format par plages.')
    ap.add_argument('--data', default=os.path.join(ROOT, 'data'), help='dossier des données (défaut : data/ de la suite)')
    ap.add_argument('--write', action='store_true', help='écrire les fichiers (sinon : aperçu)')
    ap.add_argument('--pilote', default='', help='un seul pilote (trigramme)')
    ap.add_argument('--no-prefs', action='store_true', help='ne pas créer de préférences de thèmes')
    ap.add_argument('--force', action='store_true', help='remplacer aussi les semaines déjà saisies au nouveau format')
    a = ap.parse_args()
    d = os.path.join(a.data, 'disponibilites')
    if not os.path.isdir(d):
        print(f'Pas de dossier {d}')
        return 1
    cfg = load_json(os.path.join(a.data, 'config', 'disponibilites.json')) or {}
    codes = dict(DEFAULT_CODES)
    for c in cfg.get('categories') or []:
        for code in c.get('odv') or []:
            codes[code] = c['id']
    imp = cfg.get('import') or DEFAULT_IMPORT
    va = cfg.get('va') or 'DEFA'
    written, prefs_made = 0, 0
    for name in sorted(os.listdir(d)):
        m = re.match(r'^([A-Z0-9]{2,5})\.json$', name, re.I)
        if not m:
            continue
        tri = m.group(1).upper()
        if a.pilote and tri != a.pilote.upper():
            continue
        doc = load_json(os.path.join(d, name)) or {}
        ac = doc.get('aircraft') or {}
        sims = doc.get('sims') or []
        used = set()
        weeks = week_grids(doc)
        print(f'{tri} : {len(weeks)} semaine(s)' + (f', {len(ac.get("mastered") or [])} type(s) maîtrisé(s)' if ac else ''))
        for monday, grid in sorted(weeks.items()):
            wid = iso_week(monday)
            dispos = {}
            for j in range(7):
                row = (grid[j] if j < len(grid) else []) or []
                used.update(c for c in row if isinstance(c, str) and c)
                rs = ranges(row, codes)
                if rs:
                    dispos[(monday + datetime.timedelta(days=j)).isoformat()] = [{'debut': s, 'fin': e, 'categorie': c} for s, e, c in rs]
            unknown = sorted({c for row in grid for c in (row or []) if isinstance(c, str) and c and c not in codes})
            out = {'schema': 2, 'va': va, 'pilote': tri, 'semaine': wid, 'updated_at': doc.get('updated_at') or NOW, 'by': 'conversion',
                   'dispos': dispos, 'appareils': {'possedes': ac.get('owned') or [], 'maitrises': ac.get('mastered') or []},
                   'simulateurs': sims}
            n = sum(len(v) for v in dispos.values())
            print(f'  {wid} (lundi {monday.isoformat()}) : {n} plage(s)' + (f' — codes inconnus ignorés : {", ".join(unknown)}' if unknown else ''))
            for day, lst in dispos.items():
                print('    ' + day + ' : ' + ', '.join(f'{x["debut"] or "journée"}{"–" + x["fin"] if x["fin"] else ""} {x["categorie"]}' for x in lst))
            target = os.path.join(d, tri, f'{wid}.json')
            prev = load_json(target)
            if prev and prev.get('by') != 'conversion' and not a.force:
                print(f'    déjà saisie au nouveau format ({prev.get("by")}, {prev.get("updated_at")}) : gardée (--force pour remplacer)')
                continue
            if a.write:
                write_json(target, out)
                written += 1
        # préférences de thèmes par défaut (codes C / T / N), pour un pilote sans préférences
        if not a.no_prefs:
            pref = {}
            for code in sorted(used):
                for dom, lst in (imp.get(code) or {}).items():
                    pref[dom] = sorted(set(pref.get(dom, [])) | set(lst))
            if pref:
                up = os.path.join(a.data, 'utilisateurs', f'{tri}.json')
                user = load_json(up)
                if not (user or {}).get('preferences', {}).get('themes'):
                    themes = {dom: {'mode': 'blanche', 'liste': lst} for dom, lst in pref.items()}
                    print(f'  préférences de thèmes (codes {", ".join(sorted(c for c in used if c in imp))}) : ' + '; '.join(f'{dom} liste blanche {", ".join(lst)}' for dom, lst in pref.items()))
                    if a.write:
                        user = user or {'schema': 1, 'va': va, 'trigramme': tri, 'nom': '', 'role': 'utilisateur', 'actif': True, 'mot_de_passe': None}
                        user.setdefault('preferences', {})['themes'] = themes
                        user['updated_at'], user['by'] = NOW, 'conversion'
                        write_json(up, user)
                        prefs_made += 1
    # index : pilotes → semaines (et ancien fichier)
    if a.write:
        pilots = {}
        for name in sorted(os.listdir(d)):
            p = os.path.join(d, name)
            m = re.match(r'^([A-Z0-9]{2,5})\.json$', name, re.I)
            if m and os.path.isfile(p):
                pilots.setdefault(m.group(1).upper(), {})['legacy'] = True
            elif re.match(r'^[A-Z0-9]{2,5}$', name, re.I) and os.path.isdir(p):
                weeks = sorted(n[:-5] for n in os.listdir(p) if re.match(r'^\d{4}-W\d{2}\.json$', n))
                if weeks:
                    pilots.setdefault(name.upper(), {})['weeks'] = weeks
        write_json(os.path.join(d, '_index.json'), {'schema': 2, 'updated_at': NOW, 'pilots': pilots})
        # index des utilisateurs (fiches de préférences créées) : trigramme → rôle, actif, nom
        ud = os.path.join(a.data, 'utilisateurs')
        if os.path.isdir(ud):
            users = {}
            for name in sorted(os.listdir(ud)):
                m = re.match(r'^([A-Z0-9]{2,5})\.json$', name)
                u = load_json(os.path.join(ud, name)) if m else None
                if u:
                    users[m.group(1)] = {'role': u.get('role') or 'utilisateur', 'actif': u.get('actif') is not False, 'nom': u.get('nom') or ''}
            write_json(os.path.join(ud, '_index.json'), {'schema': 1, 'va': va, 'updated_at': NOW, 'utilisateurs': users})
        print(f'\n{written} fichier(s) de semaine écrit(s), {prefs_made} fiche(s) de préférences, index refait.')
    else:
        print('\nAperçu seulement : relancer avec --write pour écrire.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
