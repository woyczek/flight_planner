"""Faux navigateur des cas K42 à K51 (tests/v3/cases/aerodb.py) : un script Python à la place de msedge / chrome, pour que les essais du verbe
base/build (tools/regen/base.py) ne lancent jamais un vrai navigateur. Lancé comme lui : [interpréteur, ce script, options…, adresse] ; l'adresse
reçue est `<lanceur>/frame/aerodb/build/headless.html#job=<id>`, sans rien d'autre. Comme la page de construction, il fait UN POST
/__setup/regen/job/claim { job } (qui lui rend l'offre du verbe et le jeton), écrit des lignes « SOGB {json} » sur stderr (au format de la console de
Chrome) et remet chaque zone par POST /__setup/regen/job/put, puis attend d'être arrêté.

Dossier de l'essai : variable SOG_FAKE_DIR. Il y trace : events.log, argv.txt (sa ligne de commande), claim.json (la réponse du claim, jeton compris : un
fichier d'essai), pids.txt (lui et son enfant), profiles.txt (le dossier du profil temporaire), urls.txt (l'adresse reçue), token.txt (le jeton reçu).
Comportement par zone dans behaviour.json { zone: mode } : ok (défaut), slow (0,6 s avant la remise), error (une ligne d'échec de CETTE zone, les
autres continuent), fatal (échec de toute l'instance), invalid (remise d'une autre zone), badshape (fichier manquant), exit (l'instance sort),
hang (ne remet rien, garde un enfant qui bat), nothing (ne remet rien, sort après un instant), silent (ne dit jamais « started »), twice (réclame deux
fois : le second claim est refusé).
"""
import json
import os
import subprocess
import sys
import time
import urllib.error
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
    url = argv[-1]
    origin = url.split('/frame/', 1)[0]
    job = dict(urllib.parse.parse_qsl(url.split('#', 1)[1])).get('job', '') if '#' in url else ''
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def post(path, body):
        req = urllib.request.Request(origin + path, method='POST', headers={'Content-Type': 'application/json', 'X-SOG-Setup': '1'}, data=json.dumps(body).encode('utf-8'))
        try:
            return json.loads(opener.open(req, timeout=20).read() or b'{}'), 200
        except urllib.error.HTTPError as e:
            return {}, e.code
    try:
        modes = json.load(open(os.path.join(base, 'behaviour.json'), encoding='utf-8'))
    except (OSError, ValueError):
        modes = {}

    def say(zone='*', **o):
        print('[1:2:1030/000000.000:INFO:CONSOLE:2] "SOGB ' + json.dumps({'zone': zone, **o}) + '", source: http://127.0.0.1/ (2)', file=sys.stderr, flush=True)
    log('profiles.txt', f'x {profile}')
    log('urls.txt', f'x {url}')
    log('events.log', f'start {time.time():.3f}')
    claim, status = post('/__setup/regen/job/claim', {'job': job})
    if status != 200:
        say(error=f'claim refused: HTTP {status}')
        time.sleep(600)
    log('claim.json', json.dumps(claim))
    log('token.txt', claim.get('token', ''))
    zones, cycle, token = claim['zones'], claim['cycle'], claim['token']
    if modes.get(zones[0]) == 'twice':
        log('events.log', f'second claim {post("/__setup/regen/job/claim", {"job": job})[1]}')
    log('pids.txt', f'{zones[0]} {os.getpid()}')
    if modes.get(zones[0]) == 'silent':
        time.sleep(600)
    say(started=True)
    if modes.get(zones[0]) == 'exit':
        return
    child = subprocess.Popen([sys.executable, '-c', 'import time,sys\nwhile True:\n open(sys.argv[1],"w").write(str(time.time())); time.sleep(0.1)',
                              os.path.join(base, f'heartbeat_{zones[0]}.txt')])
    log('pids.txt', f'{zones[0]} {child.pid}')
    say(sources=2)
    say(n=1, m=2)
    for zone in zones:
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
        files = outputs(zone, cycle, as_zone='xx' if mode == 'invalid' else None)
        if mode == 'badshape':
            files.pop('mora.json')
        out, status = post('/__setup/regen/job/put', {'job': job, 'token': token, 'zone': zone, 'files': files})
        if status == 200:
            log('events.log', f'posted {zone} {time.time():.3f}')
        else:
            say(zone, error=f'put refused: HTTP {status}')
    time.sleep(600)


if __name__ == '__main__':
    main(sys.argv[1:])
