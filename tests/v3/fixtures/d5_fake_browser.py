"""Faux navigateur des cas K42 à K50 (tests/v3/cases/aerodb.py) : un script Python à la place de msedge / chrome, pour que les essais du verbe
base/build (tools/regen/base.py) ne lancent jamais un vrai navigateur. Lancé comme lui : [interpréteur, ce script, options…, adresse fichier] ;
l'adresse reçue est celle de start.html (dans le profil temporaire), jamais celle qui porte le jeton : comme le navigateur, il lit le script de ce
fichier pour trouver l'adresse vers laquelle aller (location.replace), dont le FRAGMENT porte les paramètres. Il fait ensuite ce que fait la page de
construction : écrit des lignes « SOGB {json} » sur stderr (au format de la console de Chrome) et remet chaque zone par POST /__setup/regen/job/put
sur l'adresse du lanceur d'essai, puis attend d'être arrêté.

Dossier de l'essai : variable SOG_FAKE_DIR. Il y trace : events.log, argv.txt (sa ligne de commande), start.txt (start.html existait-il au départ),
pids.txt (lui et son enfant), profiles.txt (le dossier du profil temporaire), urls.txt (l'adresse trouvée), token.txt (le jeton reçu).
Comportement par zone dans behaviour.json { zone: mode } : ok (défaut), slow (0,6 s avant la remise), error (une ligne d'échec de CETTE zone, les
autres continuent), fatal (échec de toute l'instance), invalid (remise d'une autre zone), badshape (fichier manquant), exit (l'instance sort),
hang (ne remet rien, garde un enfant qui bat), nothing (ne remet rien, sort après un instant), silent (ne dit jamais « started »).
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request

KINDS = {'airspaces': [], 'aerodromes': [], 'navaids': [], 'points': [], 'vrp': [], 'airways': [], 'obstacles': [], 'aeroindex': {'fields': [], 'rows': []},
         'mora': [], 'obstaclemax': {}, 'cities': [], 'meta': {}}


def outputs(zone, cycle, as_zone=None):
    files = {}
    for kind, data in KINDS.items():
        files[f'{kind}.json'] = json.dumps({'schema': 2, 'zone': as_zone or zone, 'cycle': cycle, 'kind': kind, 'parserVersion': 19,
                                            'data': data if kind != 'airspaces' else [{'type': 'FIR', 'name': f'{zone.upper()} FIR'}],
                                            'updated_at': '2026-10-30T00:00:00.000Z'})
    files['manifest.json'] = json.dumps({'cycle': cycle, 'prefixes': ['EI'], 'kb': {}, 'cells': {}})
    files['cities_major.json'] = json.dumps({'schema': 2, 'kind': 'cities_major', 'minPopulation': 100000, 'data': [], 'updated_at': '2026-10-30T00:00:00.000Z'})
    return files


def main(argv):
    base = os.environ['SOG_FAKE_DIR']

    def log(name, text):
        with open(os.path.join(base, name), 'a', encoding='utf-8') as f:
            f.write(text + '\n')
    log('argv.txt', json.dumps(argv))
    profile = next((a.split('=', 1)[1] for a in argv if a.startswith('--user-data-dir=')), '')
    start = os.path.join(profile, 'start.html')
    log('start.txt', str(os.path.isfile(start)))
    if not os.path.isfile(start):
        return
    url = json.loads(re.search(r'location\.replace\((".*")\)', open(start, encoding='utf-8').read()).group(1))
    frag = dict(urllib.parse.parse_qsl(url.split('#', 1)[1])) if '#' in url else {}
    one = frag.get('zone', '')
    batch = [one] if one else [z for z in frag.get('zones', '').split(',') if z]
    try:
        modes = json.load(open(os.path.join(base, 'behaviour.json'), encoding='utf-8'))
    except (OSError, ValueError):
        modes = {}

    def say(zone=None, **o):
        print('[1:2:1030/000000.000:INFO:CONSOLE:2] "SOGB ' + json.dumps({'zone': zone or one or '*', **o}) + '", source: http://127.0.0.1/ (2)', file=sys.stderr, flush=True)
    log('profiles.txt', f'{batch[0]} {profile}')
    log('urls.txt', f'{batch[0]} {url}')
    log('token.txt', frag.get('t', ''))
    log('pids.txt', f'{batch[0]} {os.getpid()}')
    log('events.log', f'start {" ".join(batch)} {time.time():.3f}')
    if modes.get(batch[0]) == 'silent':
        time.sleep(600)
    say(started=True)
    if modes.get(batch[0]) == 'exit':
        return
    child = subprocess.Popen([sys.executable, '-c', 'import time,sys\nwhile True:\n open(sys.argv[1],"w").write(str(time.time())); time.sleep(0.1)',
                              os.path.join(base, f'heartbeat_{batch[0]}.txt')])
    log('pids.txt', f'{batch[0]} {child.pid}')
    say(sources=2)
    say(n=1, m=2)
    origin = url.split('/frame/', 1)[0]
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    for zone in batch:
        mode = modes.get(zone, 'ok')
        if mode == 'exit':
            return
        if mode == 'hang':
            time.sleep(600)
        if mode == 'nothing':
            time.sleep(1.0)
            return
        if mode == 'fatal':
            say('*', error='boom everywhere')
            time.sleep(600)
        if mode == 'error':
            say(zone, error='boom')
            continue
        if mode == 'slow':
            time.sleep(0.6)
        files = outputs(zone, frag['cycle'], as_zone='xx' if mode == 'invalid' else None)
        if mode == 'badshape':
            files.pop('mora.json')
        req = urllib.request.Request(origin + '/__setup/regen/job/put', method='POST', headers={'Content-Type': 'application/json', 'X-SOG-Setup': '1'},
                                     data=json.dumps({'job': frag['job'], 'token': frag['t'], 'zone': zone, 'files': files}).encode('utf-8'))
        try:
            opener.open(req, timeout=20).read()
            log('events.log', f'posted {zone} {time.time():.3f}')
        except Exception as e:  # noqa: BLE001
            say(zone, error=f'put refused: {e}')
    time.sleep(600)


if __name__ == '__main__':
    main(sys.argv[1:])
