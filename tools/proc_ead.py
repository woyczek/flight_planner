"""Sonde EAD Basic : explore la bibliothèque AIP avec VOTRE compte, en lecture seule, et écrit un compte rendu à me renvoyer.

  python tools/proc_ead.py --probe [--user NOM] [--state "United Kingdom"] [--icao EGLL] [--out ead_probe]

Ce que la sonde fait : se connecte (formulaire AJAX de la page de connexion publique), parcourt les pages jusqu'à la bibliothèque AIP, lit son
formulaire (listes déroulantes, boutons), tente une recherche (État choisi, partie AD, type AIP, langue EN) et liste les documents trouvés.
Ce qu'elle ne fait pas : télécharger un PDF, écrire quoi que ce soit hors du dossier --out, garder le mot de passe (demandé à l'invite, ou
variable EAD_PASSWORD), le montrer, ou l'envoyer ailleurs qu'à www.ead.eurocontrol.int. Le compte rendu (report.txt) est nettoyé : ni mot de passe, ni nom
d'utilisateur, ni cookie, ni jeton d'état de page, ni adresse de courriel. Relisez-le avant de me le transmettre.
Écrite sans avoir vu l'écran connecté : si une étape échoue, le compte rendu dit laquelle et garde la page reçue (nettoyée) pour la suite.
Bibliothèque standard seulement. Aucun PDF, aucune dépendance (pypdf n'est pas nécessaire ici).
"""
import argparse
import getpass
import html
import http.cookiejar
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HOST = os.environ.get('EAD_PROBE_HOST', 'https://www.ead.eurocontrol.int') if os.environ.get('EAD_PROBE_HOST', '').startswith('http://127.0.0.1') \
    else 'https://www.ead.eurocontrol.int'      # EAD_PROBE_HOST : seulement pour l'essai sur une copie locale (tests/v3), jamais un autre hôte
LOGIN_PAGE = HOST + '/cms-eadbasic/opencms/en/login/ead-basic/'
LOGIN_POST = HOST + '/fwf-eadbasic/ajaxlogin/ajax_security_check.jspx'
UA = 'Mozilla/5.0 (X11; Linux x86_64) SOG-aerodb-probe'


# ---------------------------------------------------------------------------------------------------------- nettoyage
def sanitize(text, secrets=()):
    """Texte sans secret : les valeurs données (mot de passe, nom d'utilisateur…), les jetons d'état de page JSF, les identifiants de session
    et les adresses de courriel sont remplacés ; toute longue suite hexadécimale ou base64 aussi."""
    out = text
    for s in sorted({x for x in secrets if x and len(x) >= 3}, key=len, reverse=True):
        out = re.sub(re.escape(s), '<secret>', out, flags=re.I)
    out = re.sub(r'(javax\.faces\.ViewState[^>]{0,80}?value=")[^"]*', r'\1<viewstate>', out)
    out = re.sub(r'(<update id="[^"]*ViewState[^"]*"><!\[CDATA\[)[^\]]*', r'\1<viewstate>', out)
    out = re.sub(r'(?i)(;jsessionid=|jsessionid=)[A-Za-z0-9._-]+', r'\1<session>', out)
    out = re.sub(r'[\w.+-]+@[\w-]+(?:\.[\w-]+)+', '<mail>', out)
    out = re.sub(r'(?<![A-Za-z0-9/+=_.-])[A-Za-z0-9+/=_-]{40,}(?![A-Za-z0-9/+=_-])', '<token>', out)
    return out


def text_of(markup):
    t = re.sub(r'(?is)<(script|style)[^>]*>.*?</\1>', ' ', markup)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', t))).strip()


def parse_links(markup):
    """[(texte, adresse)] des liens <a href> d'une page, sans doublon."""
    out, seen = [], set()
    for m in re.finditer(r'(?is)<a\b[^>]*?href="([^"]*)"[^>]*>(.*?)</a>', markup):
        href, label = html.unescape(m.group(1)), text_of(m.group(2))[:160]
        if href and (label, href) not in seen and not href.startswith(('javascript:', '#')):
            seen.add((label, href))
            out.append((label, href))
    return out


def parse_forms(markup):
    """Formulaires d'une page : [{ id, action, method, fields {nom: valeur}, selects {nom: [(valeur, libellé)]}, buttons [{id, name, value, label}] }]."""
    forms = []
    for fm in re.finditer(r'(?is)<form\b([^>]*)>(.*?)</form>', markup):
        attrs, body = fm.group(1), fm.group(2)
        get = lambda a, s: (re.search(a + r'\s*=\s*"([^"]*)"', s, re.I) or [None, ''])[1]
        f = {'id': get('id', attrs), 'action': html.unescape(get('action', attrs)), 'method': (get('method', attrs) or 'get').lower(),
             'fields': {}, 'selects': {}, 'buttons': []}
        for im in re.finditer(r'(?is)<input\b([^>]*)>', body):
            a = im.group(1)
            name, typ, val = get('name', a), (get('type', a) or 'text').lower(), html.unescape(get('value', a))
            if typ in ('submit', 'button'):
                f['buttons'].append({'id': get('id', a), 'name': name, 'value': val, 'label': val})
            elif name and typ not in ('checkbox', 'radio', 'password') or (name and 'checked' in a.lower()):
                f['fields'][name] = val
        for bm in re.finditer(r'(?is)<button\b([^>]*)>(.*?)</button>', body):
            f['buttons'].append({'id': get('id', bm.group(1)), 'name': get('name', bm.group(1)), 'value': get('value', bm.group(1)),
                                 'label': text_of(bm.group(2))[:80]})
        for sm in re.finditer(r'(?is)<select\b([^>]*)>(.*?)</select>', body):
            name = get('name', sm.group(1)) or get('id', sm.group(1))
            opts = [(html.unescape(get('value', o.group(1))), text_of(o.group(2))) for o in re.finditer(r'(?is)<option\b([^>]*)>(.*?)</option>', sm.group(2))]
            f['selects'][name] = opts
        forms.append(f)
    return forms


def pick(options, wanted):
    """Valeur de la première option dont le libellé correspond à l'expression `wanted` (insensible à la casse), ou None."""
    rx = re.compile(wanted, re.I)
    return next((v for v, label in options if rx.search(label) or rx.search(v)), None)


def login_result(body):
    """(connecté, message) d'après la réponse JSON du formulaire de connexion ; jamais d'exception."""
    try:
        j = json.loads(body)
    except ValueError:
        return False, 'réponse non JSON'
    return bool(j.get('loggedIn')), str(j.get('errorMessage') or j.get('redirect') or '')


# ---------------------------------------------------------------------------------------------------------- la sonde
class Session:
    def __init__(self, secrets):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.secrets = secrets
        self.n = 0

    def call(self, url, data=None, headers=None, timeout=60):
        if not url.startswith(HOST + '/'):
            raise SystemExit('adresse hors de www.ead.eurocontrol.int refusée: ' + sanitize(url, self.secrets))
        h = {'User-Agent': UA, 'Accept-Language': 'en'}
        h.update(headers or {})
        req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode() if data is not None else None, headers=h)
        try:
            with self.op.open(req, timeout=timeout) as r:
                return r.status, r.geturl(), r.read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            return e.code, url, e.read().decode('utf-8', 'replace')


def probe(user, password, state, icao, out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=True)
    s = Session([user, password])
    rep = []
    say = lambda *a: rep.append(sanitize(' '.join(str(x) for x in a), s.secrets))

    def keep(name, body):
        s.n += 1
        (out / f'{s.n:02d}_{name}.html').write_text(sanitize(body, s.secrets), encoding='utf-8')
    say('SONDE EAD BASIC — état demandé:', state, '— terrain:', icao)
    code, url, body = s.call(LOGIN_PAGE)
    say('1. page de connexion:', code)
    code, url, body = s.call(LOGIN_POST, {'j_username': user, 'j_password': password},
                             {'X-Requested-With': 'XMLHttpRequest', 'Referer': LOGIN_PAGE})
    ok, msg = login_result(body)
    say('2. connexion:', 'OUI' if ok else 'NON', '| code', code, '|', msg[:200])
    if not ok:
        return finish(out, rep, s)
    try:
        j = json.loads(body)
    except ValueError:
        j = {}
    home = j.get('redirect') or '/fwf-eadbasic/public/static/home.faces'
    home = urllib.parse.urljoin(HOST, home)
    code, url, body = s.call(home)
    keep('accueil', body)
    say('3. accueil:', code, sanitize(url, s.secrets))
    links = parse_links(body)
    say('   liens de la page d\'accueil (texte -> adresse):')
    for label, href in links[:80]:
        say('     ', label[:70], '->', href[:140])
    lib = next(((l, h) for l, h in links if re.search(r'AIP', l + h, re.I) and re.search(r'librar|bibli', l + h, re.I)), None) \
        or next(((l, h) for l, h in links if re.search(r'AIP', l, re.I)), None)
    if not lib:
        say('4. bibliothèque AIP: lien introuvable dans l\'accueil (voir 01_accueil.html nettoyé)')
        return finish(out, rep, s)
    code, url, body = s.call(urllib.parse.urljoin(url, lib[1]))
    keep('bibliotheque', body)
    say('4. bibliothèque AIP:', lib[0], '| code', code, '|', sanitize(url, s.secrets))
    forms = parse_forms(body)
    for f in forms:
        say('   formulaire', f['id'], f['method'], f['action'][:100])
        say('     champs:', {k: (v[:30] if len(v) < 40 else '<long>') for k, v in f['fields'].items()})
        for name, opts in f['selects'].items():
            say(f'     liste {name}: {len(opts)} options:', '; '.join(f'{v}={l}'[:60] for v, l in opts[:400]))
        for b in f['buttons']:
            say('     bouton', b)
    form = next((f for f in forms if f['selects']), forms[0] if forms else None)
    if not form:
        say('5. aucun formulaire dans la page de la bibliothèque')
        return finish(out, rep, s)
    data = dict(form['fields'])
    chosen = {}
    for name, opts in form['selects'].items():
        labels = ' | '.join(l for _, l in opts)
        for kind, test, wanted in (('État', lambda: pick(opts, state) is not None, state), ('partie', lambda: re.search(r'\bENR\b', labels) and re.search(r'\bAD\b', labels), r'^AD$'),
                                   ('type', lambda: re.search(r'\bAMDT\b', labels) and re.search(r'\bSUP\b', labels), r'^AIP$'),
                                   ('langue', lambda: re.search(r'\bEN\b', labels), r'^EN\b|^English')):
            if kind not in chosen.values() and test():
                v = pick(opts, wanted)
                if v is not None:
                    chosen[name] = kind
                    data[name] = v
                    break
    say('5. choix faits dans les listes:', chosen or 'aucun (voir les options ci-dessus)')
    btn = next((b for b in form['buttons'] if re.search(r'search|suche|recherche', b['label'] + b['value'] + b['id'], re.I)), form['buttons'][0] if form['buttons'] else None)
    results = []
    action = urllib.parse.urljoin(url, form['action'] or url)
    if btn:
        ajax = dict(data)
        ajax.update({'javax.faces.partial.ajax': 'true', 'javax.faces.source': btn['id'] or btn['name'], 'javax.faces.partial.execute': '@all',
                     'javax.faces.partial.render': '@all', (btn['id'] or btn['name']): (btn['id'] or btn['name'])})
        code, u2, b2 = s.call(action, ajax, {'Faces-Request': 'partial/ajax', 'X-Requested-With': 'XMLHttpRequest', 'Referer': url})
        keep('recherche_ajax', b2)
        say('6. recherche (requête partielle JSF):', code, len(b2), 'octets')
        results = parse_links(b2)
        if not results:
            plain = dict(data)
            plain[btn['name'] or btn['id']] = btn['value'] or btn['name']
            code, u2, b2 = s.call(action, plain, {'Referer': url})
            keep('recherche_simple', b2)
            say('6b. recherche (envoi classique):', code, len(b2), 'octets')
            results = parse_links(b2)
    else:
        say('6. aucun bouton de recherche reconnu')
    docs = [(l, h) for l, h in results if re.search(r'\.pdf|download|document|aip', h, re.I)]
    say('7. documents trouvés:', len(docs), '| dont', icao, ':', sum(1 for l, h in docs if icao.upper() in (l + h).upper()))
    for label, href in docs[:120]:
        say('     ', label[:80], '->', href[:140])
    return finish(out, rep, s)


def finish(out, rep, s):
    text = '\n'.join(rep) + '\n'
    (out / 'report.txt').write_text(text, encoding='utf-8')
    for secret in s.secrets:
        assert not secret or secret not in text, 'secret dans le compte rendu: écriture abandonnée'
    print(text)
    print(f'Compte rendu: {out / "report.txt"} (pages nettoyées dans le même dossier). Relisez-le avant de le transmettre.', file=sys.stderr)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--probe', action='store_true', help='explorer la bibliothèque AIP (lecture seule)')
    ap.add_argument('--user', default=os.environ.get('EAD_USER'))
    ap.add_argument('--state', default='United Kingdom')
    ap.add_argument('--icao', default='EGLL')
    ap.add_argument('--out', default='ead_probe')
    a = ap.parse_args(argv)
    if not a.probe:
        raise SystemExit('rien à faire: ajouter --probe')
    user = a.user or input('EAD Basic, nom d\'utilisateur: ').strip()
    password = os.environ.get('EAD_PASSWORD') or getpass.getpass('EAD Basic, mot de passe (non gardé): ')
    probe(user, password, a.state, a.icao, a.out)


if __name__ == '__main__':
    main()
