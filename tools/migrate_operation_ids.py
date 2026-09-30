"""Migration des identifiants d'une opération (ou d'une mission) dans les missions rangées : toutes les références suivent.

Cas type : une opération reçue sous « BFM-001 » (missions BFM-001A, BFM-001B, BFM-001C, organisation BFM-001Z) passe en
« A-001 » (lettre de la famille COMBAT). Changer un seul mission.id casse les relations : operation.id / missions /
organisation, exercise.participants[].mission, messages de l'exercice, noms des cartes (generalBFM-001A.png), textes
(« selon la chronologie de BFM-001Z »). Ce script remplace l'ancien identifiant partout, d'un coup.

Usage (à la racine de l'application) :
    python tools/migrate_operation_ids.py BFM-001 A-001 [--type COMBAT] [--dry-run]
    python tools/migrate_operation_ids.py BFM-001C A-001C          → une seule mission (sans lettre d'équipe en plus)

Ancien identifiant = base d'opération (« BFM-001 ») : l'opération et chacune de ses missions (« BFM-001A » → « A-001A »,
la lettre d'équipe suit) ; identifiant complet : cette mission seulement. Dans data/missions/ :
- textes des .yaml / .md / .txt (hors recu/ : trace des textes reçus, gardée telle quelle) : l'ancien identifiant comme
  jeton (« BFM-001A », « generalBFM-001A.png » ; pas « BFM-0012 ») → le nouveau ;
- mission.former_id = ancien identifiant (s'il n'y en a pas déjà un) ; --type : mission.type des missions de l'opération
  (hors mission d'organisation, rôle organisation) ;
- fichiers et dossiers dont le nom contient l'ancien identifiant : renommés, rangés dans <lettre>_<FAMILLE>/<id>/ ;
  destination déjà occupée → l'ancien va dans _remplaces/<date>/ (rien n'est supprimé).
Trace : data/missions/RENUMEROTATION.md. Bibliothèque standard uniquement ; même règle que SiaMission.migrateIds (générateur).
"""
import datetime as dt, os, re, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from family_letters import FAMILY_LETTERS

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
MISSIONS = os.path.join(ROOT, 'data', 'missions')
TODAY = dt.date.today().isoformat()
TEXT = ('.yaml', '.yml', '.md', '.txt')


def jeton(old, base):
    """Ancien identifiant comme jeton (lettre d'équipe capturée si old est une base d'opération)."""
    team = '([A-Z]?)' if base else '()'
    return re.compile(rf'(?<![A-Z0-9-]){re.escape(old)}{team}(?![A-Z0-9])')


def famille(new_id, type_):
    lettre = new_id[0]
    if type_:
        return type_
    return next((f for f, l in FAMILY_LETTERS.items() if l == lettre and f != 'MEDEVAC'), 'MISSION')


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dry = '--dry-run' in sys.argv
    type_ = sys.argv[sys.argv.index('--type') + 1].upper() if '--type' in sys.argv else ''
    if '--type' in sys.argv:
        args.remove(type_) if type_ in args else None
    old, new = args[0].upper(), args[1].upper()
    base = not re.search(r'\d[A-Z]$', old)            # « BFM-001 » : opération ; « BFM-001C » : une mission
    rx = jeton(old, base)
    sub = lambda s: rx.sub(lambda m: new + m.group(1), s)
    log, changes = [], 0
    # 1. textes
    for dp, dn, fn in os.walk(MISSIONS):
        dn[:] = [d for d in dn if d not in ('recu', '_remplaces')]
        for f in fn:
            if not f.lower().endswith(TEXT) or f in ('RENUMEROTATION.md',):
                continue
            p = os.path.join(dp, f)
            s = open(p, encoding='utf-8', newline='').read()
            if not rx.search(s) and not (type_ and f.startswith('mission') and new in s):
                continue
            # ancien identifiant gardé tel quel : former_id (trace de migration)
            t = ''.join(ligne if re.match(r'\s*former_id:', ligne) else sub(ligne) for ligne in s.splitlines(True))
            mid = re.search(r'(?m)^  id: *(\S+)', t)
            if f.startswith('mission') and f.endswith(('.yaml', '.yml')) and mid:
                ancien = None
                # ancien identifiant de cette mission : celui qui, migré, donne son identifiant actuel
                for m in rx.finditer(s):
                    if new + m.group(1) == mid.group(1).strip("'\""):
                        ancien = old + m.group(1)
                        break
                if ancien and not re.search(r'(?m)^  former_id:', t):
                    t = re.sub(r'(?m)^(  id: *\S+)$', rf'\1\n  former_id: {ancien}', t, count=1)
                if type_ and not re.search(r'(?m)^  role: *organisation', t):
                    t = re.sub(r'(?m)^(  type: *)\S+$', rf'\g<1>{type_}', t, count=1)
            if t != s:
                changes += 1
                log.append(f'   {os.path.relpath(p, MISSIONS)} : {len(rx.findall(s))} référence(s)')
                if not dry:
                    open(p, 'w', encoding='utf-8', newline='').write(t)
    # 2. noms de fichiers et dossiers (du plus profond au moins profond)
    for dp, dn, fn in os.walk(MISSIONS, topdown=False):
        if '_remplaces' in dp.split(os.sep) or os.sep + 'recu' in dp:
            continue
        for name in fn + dn:
            if not rx.search(name):
                continue
            src = os.path.join(dp, name)
            dst = os.path.join(dp, sub(name))
            if os.path.exists(dst):
                keep = os.path.join(MISSIONS, '_remplaces', TODAY, os.path.relpath(src, MISSIONS))
                log.append(f'   {os.path.relpath(src, MISSIONS)} : destination occupée → _remplaces/{TODAY}/')
                if not dry:
                    os.makedirs(os.path.dirname(keep), exist_ok=True)
                    shutil.move(src, keep)
                continue
            log.append(f'   {os.path.relpath(src, MISSIONS)} → {os.path.relpath(dst, MISSIONS)}')
            if not dry:
                os.rename(src, dst)
    # 3. dossiers de mission hors de leur famille : <lettre>_<FAMILLE>/<id>/
    fam_dir = next((d for d in os.listdir(MISSIONS) if d.startswith(new[0] + '_')), f'{new[0]}_{famille(new, type_)}')
    for d in os.listdir(MISSIONS):
        p = os.path.join(MISSIONS, d)
        if d == fam_dir or not os.path.isdir(p) or d.startswith('_'):
            continue
        for sd in os.listdir(p):
            if sd.startswith(new) and os.path.isdir(os.path.join(p, sd)):
                dst = os.path.join(MISSIONS, fam_dir, sd)
                log.append(f'   {d}/{sd} → {fam_dir}/{sd}')
                if not dry:
                    os.makedirs(os.path.dirname(dst), exist_ok=True)
                    shutil.move(os.path.join(p, sd), dst) if not os.path.exists(dst) else shutil.move(os.path.join(p, sd), os.path.join(MISSIONS, '_remplaces', TODAY, d, sd))
    print(f'{"[essai] " if dry else ""}{old} → {new} : {changes} fichier(s) texte modifié(s).')
    print('\n'.join(log) or '   rien à faire')
    if log and not dry:
        with open(os.path.join(MISSIONS, 'RENUMEROTATION.md'), 'a', encoding='utf-8') as h:
            h.write(f'\n## {dt.datetime.now():%Y-%m-%d %H:%M} — migration {old} → {new} (tools/migrate_operation_ids.py)\n\n' + '\n'.join(log) + '\n')


if __name__ == '__main__':
    main()
