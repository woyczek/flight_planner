"""Répare data/cr/mission_ledger_defaults.js (SOG-0219 (3)) : le fichier venu de la V2 (shared/mission_ledger_defaults.js du
23/09/2026, migré tel quel en 3.0.0) porte, après son littéral, un bloc de code qui corrige une heure (« 1:50 » → « 19:50 ») dans le
registre HEMS embarqué ; la garde des fichiers de données (tools/data_guard.py, audit de sécurité C1) refuse tout code après le littéral,
et le lanceur le dit à chaque page V2 de compte rendu qui le demande (« Fichier de données refusé … texte après le littéral »).

L'outil applique la correction dans le littéral lui-même (le texte base 64 décodé, corrigé, réencodé), retire le code, garde les
commentaires de tête, vérifie le résultat avec data_guard, et n'écrit qu'avec --write (sinon il dit ce qu'il ferait). Le fichier
appartient au dépôt des données de l'utilisateur : l'outil ne le touche que sur sa demande, et garde l'original à côté (.avant).

Usage : python tools/repair_ledger_defaults.py [<data>/cr/mission_ledger_defaults.js] [--write]
"""
import base64
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import data_guard  # noqa: E402

KEY = re.compile(r'\s*([A-Za-z_$][\w$]*)\s*:\s*"([A-Za-z0-9+/=]*)"\s*,?')
FIXES = {'ledgerName': [(';"1:50";', ';"19:50";')]}  # ce que le bloc de code de la V2 corrigeait


def repaired(text):
    """(nouveau texte, ce qui a changé) ; ValueError si le fichier n'a pas la forme attendue."""
    head = ''
    for line in text.replace('\r\n', '\n').split('\n'):  # les commentaires de tête, jusqu'au littéral
        if line.startswith('window.'):
            break
        if line.startswith('//'):
            head += line + '\n'
    m = re.search(r'window\.MissionLedgerDefaultsB64\s*=\s*\{', text)
    if not m:
        raise ValueError('pas de « window.MissionLedgerDefaultsB64 = { … } »')
    i, keys = m.end(), []
    while True:
        k = KEY.match(text, i)
        if not k:
            break
        keys.append([k.group(1), k.group(2)])
        i = k.end()
    if not re.match(r'\s*\}\s*;', text[i:]):
        raise ValueError('littéral mal fermé')
    done = []
    for kv in keys:
        for a, b in FIXES.get(kv[0], []):
            raw = base64.b64decode(kv[1]).decode('utf-8')
            if a in raw:
                kv[1] = base64.b64encode(raw.replace(a, b).encode('utf-8')).decode('ascii')
                done.append(f'{kv[0]} : {a} → {b}')
    out = head + 'window.MissionLedgerDefaultsB64={\n' + ''.join(f'{k}:"{v}",\n' for k, v in keys) + '};\n'
    data_guard.check(out)  # le résultat doit passer la garde (Refused sinon)
    return out, done


def main(argv):
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')  # console Windows : les « → » et accents dits tels quels
    args = [a for a in argv if not a.startswith('--')]
    path = args[0] if args else os.path.join('data', 'cr', 'mission_ledger_defaults.js')
    text = open(path, encoding='utf-8').read()
    try:
        data_guard.check(text)
        print(f'{path} : déjà accepté par la garde, rien à faire.')
        return 0
    except data_guard.Refused as e:
        print(f'{path} : refusé par la garde ({e}).')
    out, done = repaired(text)
    print('correction reportée dans le littéral : ' + ('; '.join(done) if done else 'aucune à reporter') + ' ; code après le littéral retiré.')
    if '--write' not in argv:
        print('rien d\'écrit : relancer avec --write pour réparer (l\'original est gardé en .avant).')
        return 0
    os.replace(path, path + '.avant')
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(out)
    print(f'écrit : {path} (original : {path}.avant).')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
