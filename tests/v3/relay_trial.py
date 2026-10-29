"""Essai du mode relais du lanceur (R1a ; noreg I13) : un lanceur --relay sur un port libre et un dépôt des données de
essai, requêtes du « proxy inverse » (127.0.0.1, Host public, X-Forwarded-*) ; tools/.relay.json du dépôt rendu tel quel.
Usage : python tests/v3/relay_trial.py <racine du dépôt>"""
import http.client
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.parse

HOST = 'sog.relay.test'
ORIGIN = 'https://' + HOST


def free_port():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    p = s.getsockname()[1]
    s.close()
    return p


def req(port, method, path, host, body=None, headers=None):
    c = http.client.HTTPConnection('127.0.0.1', port, timeout=20)
    h = {'Host': host, **(headers or {})}
    data = body.encode() if isinstance(body, str) else (json.dumps(body).encode() if body is not None else None)
    if data is not None and 'Content-Type' not in h:
        h['Content-Type'] = 'application/json'
    c.request(method, path, body=data, headers=h)
    r = c.getresponse()
    out = r.read()
    hdrs = dict(r.getheaders())
    c.close()
    return r.status, hdrs, out


def run(check, ROOT):
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    import launch
    bad = ['//evil.example', '/\t/evil.example', '/%09/evil.example'.replace('%09', chr(9)), '/\\evil.example', '/__setup/x',
           '/ /x', 'https://evil.example', '/x' + chr(10) + 'y', '/x' + chr(127)]
    check('the return after pairing stays on this server (tab, //, backslash, controls, /__)',
          all(launch.safe_next(x) == '/frame/' for x in bad) and launch.safe_next('/frame/index.html#maps') == '/frame/index.html#maps',
          [x for x in bad if launch.safe_next(x) != '/frame/'])
    port, rport = free_port(), free_port()
    data = tempfile.mkdtemp(prefix='sog-relay-data-')
    relay_file = os.path.join(ROOT, 'tools', '.relay.json')
    kept = open(relay_file, 'rb').read() if os.path.exists(relay_file) else None
    for args in (['init', '-q', '-b', 'main'], ['config', 'user.name', 'essai'], ['config', 'user.email', 'essai@example.invalid']):
        subprocess.run(['git', '-C', data, *args], capture_output=True)
    open(os.path.join(data, 'data_tree.js'), 'w').write('window.DATA_TREE = {}' + chr(10))
    subprocess.run(['git', '-C', data, 'add', '-A'], capture_output=True)
    subprocess.run(['git', '-C', data, 'commit', '-qm', 'init'], capture_output=True)
    p = subprocess.Popen([sys.executable, os.path.join(ROOT, 'tools', 'launch.py'), '--port', str(port), '--no-browser', '--data', data,
                          '--relay', HOST, '--relay-port', str(rport)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=ROOT)
    try:
        for _ in range(60):
            try:
                if req(port, 'GET', '/__setup/status', f'127.0.0.1:{port}', headers={'X-SOG-Setup': '1'})[0] == 200:
                    break
            except OSError:
                pass
            time.sleep(0.5)
        local = f'127.0.0.1:{port}'
        both = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'launch.py'), '--port', str(free_port()), '--no-browser',
                               '--data', data, '--relay', HOST, '--lan'], capture_output=True, text=True, cwd=ROOT, timeout=60)
        check('--relay with --lan: refused at start', both.returncode == 2 and '--relay' in both.stderr, (both.returncode, both.stderr[-120:]))
        same = free_port()
        same = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'launch.py'), '--port', str(same), '--no-browser', '--data', data,
                               '--relay', HOST, '--relay-port', str(same)], capture_output=True, text=True, cwd=ROOT, timeout=60)
        check('--relay-port equal to the interface\'s port: refused at start', same.returncode == 2, (same.returncode, same.stdout[-160:]))
        prox = {'X-Forwarded-Proto': 'https', 'X-Forwarded-For': '203.0.113.7'}
        api = {**prox, 'X-SOG-Setup': '1', 'Sec-Fetch-Site': 'same-origin'}
        st, h, b = req(rport, 'GET', '/frame/', HOST, headers={**prox, 'Accept': 'text/html'})
        check('unpaired page: pairing page 401', st == 401 and b'/__relay/pair' in b, st)
        csp = h.get('Content-Security-Policy', '')
        check('pairing page: never framed, no script, form to itself only',
              h.get('X-Frame-Options') == 'DENY' and "frame-ancestors 'none'" in csp and "default-src 'none'" in csp
              and "form-action 'self'" in csp and 'script-src' not in csp and h.get('Cache-Control') == 'no-store',
              (h.get('X-Frame-Options'), csp, h.get('Cache-Control')))
        check('the workstation cannot open the local network in relay mode',
              req(port, 'POST', '/__setup/lan', local, {'open': True}, headers={'X-SOG-Setup': '1'})[0] == 409)
        check('unpaired API: 401', req(rport, 'GET', '/__setup/status', HOST, headers=api)[0] == 401)
        check('no https from the proxy: 403', req(rport, 'GET', '/__setup/status', HOST, headers={**api, 'X-Forwarded-Proto': 'http'})[0] == 403)
        check('a proxy request on the workstation\'s port is refused (public host or another)',
              [req(port, 'GET', '/frame/', h, headers=prox)[0] for h in (HOST, 'evil.example')] == [403, 403])
        # port du relais : tout y est relais, même sans en-tête de mandataire et avec l'hôte du poste
        check('on the relay port without any proxy header: relay (https required), never the workstation',
              [req(rport, m, p, f'127.0.0.1:{port}', headers={'X-SOG-Setup': '1'})[0]
               for m, p in (('GET', '/__setup/secrets'), ('GET', '/__setup/relay'), ('GET', '/__relay/whoami'))] == [403] * 3)
        check('on the relay port with the workstation\'s host, unpaired: 401, never the workstation',
              [req(rport, 'GET', p, f'127.0.0.1:{port}', headers={'X-SOG-Setup': '1', 'X-Forwarded-Proto': 'https'})[0]
               for p in ('/__setup/secrets', '/__setup/relay', '/__setup/status')] == [401] * 3)
        # proxy qui réécrit Host en 127.0.0.1:port : jamais pris pour le poste (échec fermé)
        check('a proxy that rewrites Host is refused, never taken for the workstation',
              [req(port, m, p, local, headers={**api, 'Sec-Fetch-Site': 'same-origin', **xh})[0]
               for m, p in (('GET', '/__setup/secrets'), ('GET', '/__setup/relay'), ('POST', '/__relay/pair'))
               for xh in ({'X-Forwarded-For': '203.0.113.7'}, {'Forwarded': 'for=203.0.113.7'}, {'X-Real-IP': '203.0.113.7'})] == [403] * 9)
        st, h, b = req(rport, 'GET', '/__relay/whoami', HOST, headers=prox)
        check('the start check: a request on the public host comes back as the relay', st == 200 and json.loads(b).get('relay') is True, (st, b[:80]))
        check('the workstation itself is not a relay request', req(port, 'GET', '/__relay/whoami', local)[0] == 404)
        st, h, b = req(rport, 'POST', '/__relay/pair', HOST, 'code=00000000&next=/frame/',
                       {**prox, 'Sec-Fetch-Site': 'cross-site', 'Origin': 'https://evil.example', 'Content-Type': 'application/x-www-form-urlencoded'})
        check('pairing from another site refused (login CSRF)', st == 403, st)
        st, h, b = req(rport, 'POST', '/__relay/pair', HOST, 'code=00000000&next=/frame/',
                       {**prox, 'Content-Type': 'application/x-www-form-urlencoded'})
        check('pairing without an origin refused', st == 403, st)
        st, h, b = req(port, 'POST', '/__setup/relay/devices', local, {'trigram': 'abc'}, headers={'X-SOG-Setup': '1'})
        code = json.loads(b).get('code', '')
        check('the workstation issues an 8-digit code for a trigram', st == 200 and len(code) == 8 and code.isdigit(), b[:120])
        check('the relay cannot issue codes', req(rport, 'POST', '/__setup/relay/devices', HOST, {'trigram': 'ABC'}, headers=api)[0] == 401)
        for _ in range(5):
            req(rport, 'POST', '/__relay/pair', HOST, 'code=00000000&next=/frame/', {**prox, 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': ORIGIN})
        st, h, b = req(rport, 'POST', '/__relay/pair', HOST, f'code={code}&next=/frame/', {**prox, 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': ORIGIN})
        check('five wrong codes from an address: wait', st == 429, st)
        # une adresse inventée par le client en tête de X-Forwarded-For : le proxy ajoute la vraie à la fin, seule lue
        st, h, b = req(rport, 'POST', '/__relay/pair', HOST, f'code={code}&next=/frame/',
                       {**prox, 'X-Forwarded-For': '198.51.100.50, 203.0.113.7', 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': ORIGIN})
        check('a forged X-Forwarded-For head does not lift the wait (last address only)', st == 429, st)
        st, h, b = req(rport, 'POST', '/__relay/pair', HOST, f'code={code}&next=/frame/',
                       {**prox, 'X-Forwarded-For': '203.0.113.8', 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': ORIGIN})
        cookie = h.get('Set-Cookie', '')
        check('the right code from another address: 303 and a Secure HttpOnly SameSite=Lax cookie',
              st == 303 and 'HttpOnly' in cookie and 'Secure' in cookie and 'SameSite=Lax' in cookie, (st, cookie[:40]))
        tok = cookie.split(';')[0]
        st, h, b = req(rport, 'POST', '/__relay/pair', HOST, f'code={code}&next=/frame/',
                       {**prox, 'X-Forwarded-For': '203.0.113.9', 'Content-Type': 'application/x-www-form-urlencoded', 'Origin': ORIGIN})
        check('a code works once', st == 401, st)
        auth = {**api, 'Cookie': tok}
        check('paired: status 200', req(rport, 'GET', '/__setup/status', HOST, headers=auth)[0] == 200)
        check('paired: a page is served', req(rport, 'GET', '/frame/', HOST, headers={**prox, 'Cookie': tok, 'Accept': 'text/html'})[0] == 200)
        check('paired: workstation routes refused', [req(rport, 'GET', p, HOST, headers=auth)[0] for p in ('/__setup/workstation', '/__setup/relay',
                                                                                                              '/__setup/secrets', '/__setup/sim/position')] == [403] * 4)
        st, h, b = req(rport, 'POST', '/__setup/net', HOST, {'url': 'https://example.com/x'}, headers=auth)
        check('paired: net outside the whitelist refused', st == 403, st)
        check('paired: PUT refused', req(rport, 'PUT', '/__setup/lnmperf', HOST, {}, headers=auth)[0] == 405)
        # l'auteur d'un lot vient du jeton, jamais de la page
        head = json.loads(req(rport, 'GET', '/__setup/changes', HOST, headers=auth)[2] or b'{}').get('head', '')
        st, h, b = req(rport, 'POST', '/__setup/batch', HOST, {'parent': head, 'author': 'XYZ', 'message': 'essai',
                                                              'changes': [{'path': 'pilot/ABC/relay.json', 'text': '{}' + chr(10)}]}, headers=auth)
        who = subprocess.run(['git', '-C', data, 'log', '-1', '--format=%an'], capture_output=True, text=True).stdout.strip()
        check('a batch through the relay is signed with the device trigram, never the page author', st == 200 and who == 'ABC', (st, b[:120], who))
        st, h, b = req(port, 'GET', '/__setup/relay', local, headers={'X-SOG-Setup': '1'})
        lst = json.loads(b)
        check('the workstation lists the device, never a hash', lst['on'] and lst['devices'][0]['trigram'] == 'ABC' and 'hash' not in json.dumps(lst), b[:200])
        req(port, 'POST', '/__setup/relay/devices/revoke', local, {'trigram': 'ABC'}, headers={'X-SOG-Setup': '1'})
        check('revoked: 401 again', req(rport, 'GET', '/__setup/status', HOST, headers=auth)[0] == 401)
    finally:
        p.terminate()
        try:
            p.wait(10)
        except subprocess.TimeoutExpired:
            p.kill()
        shutil.rmtree(data, ignore_errors=True)
        if kept is None:
            if os.path.exists(relay_file):
                os.remove(relay_file)
        else:
            open(relay_file, 'wb').write(kept)


if __name__ == '__main__':
    bad = []

    def check(name, ok, info=''):
        print(('ok  ' if ok else 'KO  ') + name + ('' if ok else f'  :: {info}'))
        if not ok:
            bad.append(name)
    run(check, sys.argv[1])
    print(len(bad), 'KO')
