"""Captures des tutoriels (frame/help/SPEC.md § 6) : img/<tutoriel>-<pas>.<langue>.png, à 375 × 812 px.

Joue chaque tutoriel dans un Chrome sans fenêtre (protocole DevTools, bibliothèque standard), profil neuf par langue ;
avant chaque langue, le vol et les comptes rendus d'essai (pilot/, cr/) sont retirés du dossier de test — seulement si
sa compagnie est la compagnie fictive (site https://example.invalid), sinon refus. Pillow, s'il est là, réduit les PNG à
256 couleurs.

Données d'essai seulement, jamais le dépôt réel : lancer d'abord le lanceur sur un dossier de test qui contient
  · sia/base/index.json, sia/base/cities_major.json et sia/base/fr/ (base aéronautique publiée) ;
  · AircraftDB/aircraft_db.js et aircraft_perf.js (types publiés) ;
  · airline/settings.json d'une compagnie fictive (site https://example.invalid) ;
et rien d'autre (ni comptes rendus, ni journal, ni flotte) :
  python tools/launch.py --port 8799 --no-browser --data <dossier de test>
Identité d'essai : trigramme TST, aucun identifiant réseau. La météo est lue en direct (données publiques).

« Rejoindre la compagnie » (--only join) se joue sans lanceur, contre le faux GitHub de frame/store/test/fake_github.py
(dépôt en mémoire, vidé avant chaque langue ; le jeton d'essai n'est jamais un vrai jeton) :
  python frame/store/test/fake_github.py 8781

Usage : python frame/help/tutorial/capture.py --data <dossier de test> [--url http://127.0.0.1:8799] [--lang en,fr]
        [--chrome <chrome.exe>]
        python frame/help/tutorial/capture.py --only join --fake http://127.0.0.1:8781 [--lang en,fr]
"""
import base64
import json
import re
import os
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
LANGS = ('fr', 'en', 'de', 'es')
W, H = 375, 812
CHROME = [r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
          '/usr/bin/google-chrome', '/usr/bin/chromium']


class WS:
    """Client WebSocket minimal (texte, masqué) pour une cible du protocole DevTools."""

    def __init__(self, url):
        host, rest = url[len('ws://'):].split('/', 1)
        h, p = host.split(':')
        self.s = socket.create_connection((h, int(p)))
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall((f'GET /{rest} HTTP/1.1\r\nHost: {host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                        f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
        buf = b''
        while b'\r\n\r\n' not in buf:
            buf += self.s.recv(4096)
        self.buf, self.n = buf.split(b'\r\n\r\n', 1)[1], 0

    def _read(self, n):
        while len(self.buf) < n:
            chunk = self.s.recv(1 << 20)
            if not chunk:
                raise EOFError('DevTools fermé')
            self.buf += chunk
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def _recv(self):
        msg = b''
        while True:
            b0, b1 = self._read(2)
            n = b1 & 0x7f
            if n == 126:
                n = struct.unpack('>H', self._read(2))[0]
            elif n == 127:
                n = struct.unpack('>Q', self._read(8))[0]
            msg += self._read(n)
            if b0 & 0x80:
                return json.loads(msg)

    def call(self, method, **params):
        """Commande DevTools ; rend son résultat (les événements reçus entre-temps sont ignorés)."""
        self.n += 1
        data = json.dumps({'id': self.n, 'method': method, 'params': params}).encode()
        n = len(data)
        hdr = bytes([0x81, 0x80 | n]) if n < 126 else bytes([0x81, 0x80 | 126]) + struct.pack('>H', n) if n < 65536 else bytes(
            [0x81, 0x80 | 127]) + struct.pack('>Q', n)
        mask = os.urandom(4)
        self.s.sendall(hdr + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))
        while True:
            m = self._recv()
            if m.get('id') == self.n:
                if 'error' in m:
                    raise RuntimeError(m['error'])
                return m.get('result', {})


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


class Browser:
    """Chrome sans fenêtre, profil jetable, une page à 375 × 812 (téléphone, tactile)."""

    def __init__(self, chrome):
        self.port, self.prof = free_port(), tempfile.mkdtemp(prefix='sog-tut-')
        self.proc = subprocess.Popen([chrome, '--headless=new', f'--remote-debugging-port={self.port}', f'--user-data-dir={self.prof}',
                                      f'--window-size={W},{H}', '--hide-scrollbars', '--no-first-run', 'about:blank'],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{self.port}/json/list'))
                break
            except OSError:
                time.sleep(0.2)
        self.ws = WS(next(t for t in tabs if t['type'] == 'page')['webSocketDebuggerUrl'])
        self.ws.call('Emulation.setDeviceMetricsOverride', width=W, height=H, deviceScaleFactor=1, mobile=True)
        self.ws.call('Emulation.setTouchEmulationEnabled', enabled=True)

    def js(self, code):
        """Exécute du JavaScript (corps de fonction async, aides W, $, $$, until, set, fire, btn) ; rend sa valeur."""
        r = self.ws.call('Runtime.evaluate', expression=f'(async () => {{ {PRELUDE}\n{code} }})()', awaitPromise=True, returnByValue=True)
        if 'exceptionDetails' in r:
            raise RuntimeError(r['exceptionDetails'].get('exception', {}).get('description') or r['exceptionDetails'])
        return r.get('result', {}).get('value')

    def go(self, url):
        self.ws.call('Page.navigate', url=url)
        time.sleep(2.5)

    def shot(self, path):
        data = base64.b64decode(self.ws.call('Page.captureScreenshot', format='png')['data'])
        with open(path, 'wb') as f:
            f.write(data)
        try:
            from PIL import Image  # facultatif : 256 couleurs, trois fois plus léger
            Image.open(path).convert('RGB').quantize(256, dither=Image.Dither.NONE).save(path, optimize=True)
        except ImportError:
            pass
        print(' ', os.path.relpath(path, HERE), os.path.getsize(path) // 1024, 'Ko')

    def close(self):
        try:
            self.ws.call('Browser.close')
        except (OSError, EOFError, RuntimeError):
            pass
        self.proc.wait(timeout=10)
        shutil.rmtree(self.prof, ignore_errors=True)


# aides injectées dans chaque appel
PRELUDE = r"""
const W = ms => new Promise(r => setTimeout(r, ms)), $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const until = async (f, ms = 15000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = f(); if (v) return v; await W(150); } throw new Error('attente : ' + f); };
const fire = e => { e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
const set = (e, v) => { e.focus?.(); e.value = v; fire(e); e.blur?.(); };
const btn = (txt, r = document) => r && $$('button', r).find(b => b.innerText.trim() === txt);
const shut = () => { $('[data-welcome] [data-x]')?.click(); $$('#fNotes .f-note').forEach(n => n.remove()); };
"""
# libellés de l'écran utilisés pour trouver un bouton (lignes [fr, en, de, es] des modules)
L = {
    'edit': ['Modifier', 'Edit', 'Bearbeiten', 'Editar'],
    'done': ['Terminer', 'Done', 'Fertig', 'Terminar'],
    'use': ['Utiliser', 'Use', 'Übernehmen', 'Usar'],
}


def prepare_flight(b, lang, out):
    """Préparer un vol : les cinq pas de Carburant (Vol, Route avec la carte en mode Modifier, Météo, Devis, Départ)."""
    lb = {k: json.dumps(v[LANGS.index(lang)]) for k, v in L.items()}
    b.js("location.hash = '#fuel'; const m = await until(() => $('[data-module=fuel] [data-k=dep]')); await W(800); shut();")
    b.js("""const m = $('[data-module=fuel]');
      set($('[data-k=dep]', m), 'LFBO'); set($('[data-k=arr]', m), 'LFRN'); set($('[data-k=altn]', m), 'LFRS'); set($('[data-k=fl]', m), '280');
      $('[data-acsel] button', m).click(); await W(300); const s = $('[data-k=acsearch]', m); s.value = 'TBM9'; fire(s);
      const r = await until(() => $('[data-acres] > *', m)); ($('button', r) || r).click(); await W(1500); shut(); scrollTo(0, 0);""")
    b.shot(out('prepare-flight', 1))
    b.js("""const m = $('[data-module=fuel]'); $('.fu-steps [data-step="1"]', m).click(); await W(400);
      set($('[data-k=rtext]', m), 'LFBO TOU UN460 NTS LFRN'); await W(1500); $('[data-do=showmap]', m).click();
      const e = await until(() => btn(%s, $('[data-module=maps]'))); await W(5000); e.click(); await W(1500); shut(); scrollTo(0, 0);""" % lb['edit'])
    b.shot(out('prepare-flight', 2))
    b.js("""btn(%s, $('[data-module=maps]'))?.click(); await W(300); location.hash = '#fuel';
      await until(() => $('[data-module=fuel] .fu-steps')); await W(800); const m = $('[data-module=fuel]');
      $('.fu-steps [data-step="2"]', m).click(); await W(300); $('[data-do=wx]', m).click(); await W(6000);
      const c = $('[data-k=wxreal]', m); if (!c.checked) c.click(); await W(2500); $('[data-isahint] button', m)?.click(); await W(800); shut(); scrollTo(0, 0);""" % lb['done'])
    b.shot(out('prepare-flight', 3))
    b.js("""const m = $('[data-module=fuel]'); $('.fu-steps [data-step="3"]', m).click(); await until(() => $('[data-dec] button', m)); await W(800);
      const d = $('details[data-fold=da]', m); if (d) d.open = false; shut(); scrollTo(0, 0);""")
    b.shot(out('prepare-flight', 4))
    b.js("""const m = $('[data-module=fuel]'); $('[data-dec] button', m).click(); await W(1200);
      $('.fu-steps [data-step="4"]', m).click(); await W(1000); shut(); scrollTo(0, 0);""")
    b.shot(out('prepare-flight', 5))
    b.js("$('[data-module=fuel] [data-do=start]').click(); await W(3000);")


def write_report(b, lang, out):
    """Écrire un compte rendu : le vol démarré, la mission, le résultat, l'enregistrement, puis Mes vols."""
    lb = {k: json.dumps(v[LANGS.index(lang)]) for k, v in L.items()}
    b.js("location.hash = '#report'; await until(() => btn(%s, $('[data-module=report]'))); await W(800); shut(); scrollTo(0, 0);" % lb['use'])
    b.shot(out('write-report', 1))
    b.js("""const m = $('[data-module=report]'); btn(%s, m).click(); await W(1200);
      const p = k => $(`[data-path="${k}"]`, m);
      set(p('aircraft.0.callsign'), 'TST101'); set(p('timeline.engineStart'), '13:20'); set(p('timeline.takeoff'), '13:30');
      set(p('timeline.landing'), '15:12'); set(p('timeline.shutdown'), '15:18'); await W(300);
      $('[data-step="1"]', m).click(); await W(500); const f = $('[data-family]', m); f.value = 'AIRLIFT'; fire(f); await W(1200); shut(); scrollTo(0, 0);""" % lb['use'])
    b.shot(out('write-report', 2))
    b.js("""const m = $('[data-module=report]'); $('[data-step="2"]', m).click(); await W(600);
      const o = $('[data-path="results.outcome"]', m); o.selectedIndex = 1; fire(o);
      set($('[data-path="fuel.start"]', m), '412'); set($('[data-path="fuel.landing"]', m), '95'); await W(800); shut(); scrollTo(0, 0);""")
    b.shot(out('write-report', 3))
    b.js("""const m = $('[data-module=report]'); const d = $('[data-do=copyfields]', m)?.closest('details'); if (d) d.open = true; await W(400);
      (d || $('[data-do=save]', m)).scrollIntoView({ block: 'end' }); scrollBy(0, 40); await W(400); shut();""")
    b.shot(out('write-report', 4))
    b.js("""$('[data-module=report] [data-do=save]').click(); await W(1500); location.hash = '#flightlog';
      await until(() => $('[data-module=flightlog]')); await W(2500); shut(); await W(300); scrollTo(0, 0);""")
    b.shot(out('write-report', 5))


def join_airline(b, lang, out, fake):
    """Rejoindre la compagnie : l'assistant de la configuration reçue (lien), un écran par pas, sur le faux GitHub."""
    b.go(f'{fake}/frame/index.html#settings')
    b.js(f"localStorage.setItem('sogFrame:lang', '{lang}'); location.reload();")
    time.sleep(3)
    link = b.js(f"""await until(() => window.SogConfig);
      const c = SogConfig.build({{ airline: {{ name: 'Test Airline', site: 'https://example.invalid', pages: {{}} }},
        data: {{ host: 'github.com', provider: 'github', repo: 'test-airline/data', branch: 'main', api: '{fake}/api' }}, trigram: 'TST' }});
      delete c.howto; return location.origin + location.pathname + '#settings?config=' + await SogConfig.pack(c);""")
    b.go(link)
    b.js("location.reload();")
    time.sleep(3)
    nxt = "$('[data-jact=next]').click(); await W(900); scrollTo(0, 0);"
    b.js("await until(() => $('[data-card=join]')); shut(); scrollTo(0, 0);")
    b.shot(out('join-airline', 1))
    b.js(nxt + "$('[data-jacc=no]').click(); await W(900); set($('[data-f=jUser]'), 'tst-pilot'); shut(); scrollTo(0, 0);")
    b.shot(out('join-airline', 2))
    b.js(nxt + "$('[data-jdone=\"3\"]').click(); await W(400); scrollTo(0, 0);")
    b.shot(out('join-airline', 3))
    b.js(nxt + "$('[data-jdone=\"4\"]').click(); await W(400); scrollTo(0, 0);")
    b.shot(out('join-airline', 4))
    b.js(nxt + "set($('[data-f=jToken]'), 'test-token-not-real'); $('[data-jact=test]').click(); await W(2000); shut(); scrollTo(0, 0);")
    b.shot(out('join-airline', 5))
    b.js(nxt + "shut(); scrollTo(0, 0);")
    b.shot(out('join-airline', 6))
    b.js(nxt + "$('[data-jact=finish]').click(); await until(() => !$('[data-jact=finish]'), 20000); await W(800); shut(); scrollTo(0, 0);")
    b.shot(out('join-airline', 7))


def main(args):
    opt = dict(zip(args[::2], args[1::2]))
    url = opt.get('--url', 'http://127.0.0.1:8799').rstrip('/')
    langs = opt.get('--lang', 'en,fr').split(',')
    chrome = opt.get('--chrome') or next((c for c in CHROME if os.path.isfile(c)), None)
    if not chrome:
        sys.exit('Chrome ou Edge introuvable : --chrome <chemin>')
    if opt.get('--only') == 'join':
        fake = opt.get('--fake', 'http://127.0.0.1:8781').rstrip('/')
        if not re.match(r'^http://(127\.0\.0\.1|localhost):\d+$', fake):
            sys.exit('--fake : adresse locale du faux GitHub attendue')
        os.makedirs(os.path.join(HERE, 'img'), exist_ok=True)
        for lang in langs:
            print(lang)
            urllib.request.urlopen(urllib.request.Request(f'{fake}/__test/reset', data=b'{}', method='POST'))  # dépôt vide
            b = Browser(chrome)
            try:
                join_airline(b, lang, lambda tut, n: os.path.join(HERE, 'img', f'{tut}-{n}.{lang}.png'), fake)
            finally:
                b.close()
        return
    data = opt.get('--data')
    try:
        site = json.load(open(os.path.join(data, 'airline', 'settings.json'), encoding='utf-8')).get('site') if data else None
    except (OSError, ValueError):
        site = None
    if site != 'https://example.invalid':
        sys.exit('--data : dossier de test attendu (airline/settings.json au site https://example.invalid)')
    os.makedirs(os.path.join(HERE, 'img'), exist_ok=True)
    for lang in langs:
        print(lang)
        for d in ('pilot', 'cr'):  # vol et comptes rendus de la passe précédente
            shutil.rmtree(os.path.join(data, d), ignore_errors=True)
        b = Browser(chrome)
        try:
            # langue de l'appli, identité d'essai (trigramme TST, aucun identifiant réseau)
            b.go(f'{url}/frame/index.html#settings')
            b.js(f"localStorage.setItem('sogFrame:lang', '{lang}'); location.reload();")
            time.sleep(3)
            b.js("""const k = await until(() => $('[data-card=identity]')); set($('[data-f=trigram]', k), 'TST');
              $('[data-act=identity]', k).click(); await W(800);""")

            def out(tut, n):
                return os.path.join(HERE, 'img', f'{tut}-{n}.{lang}.png')

            prepare_flight(b, lang, out)
            write_report(b, lang, out)
        finally:
            b.close()


if __name__ == '__main__':
    main(sys.argv[1:])
