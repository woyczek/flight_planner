"""Sonde EAD Basic : explore la bibliothèque AIP avec VOTRE compte, en lecture seule, et écrit un compte rendu à me renvoyer.

  python tools/proc_ead.py --probe [--user NOM] [--state "United Kingdom"] [--icao EGLL] [--name EGLL] [--download] [--out ead_probe]

Ce que la sonde fait : se connecte (formulaire AJAX de la page de connexion publique), parcourt les pages jusqu'à la bibliothèque AIP, lit son
formulaire (listes déroulantes, boutons), tente une recherche (État choisi, partie AD, type AIP, langue EN) et liste les documents trouvés.
Ce qu'elle ne fait pas : télécharger un PDF (sauf --download : un seul, dans ead_probe/cache/), écrire quoi que ce soit hors du dossier --out, garder le mot de passe (demandé à l'invite, ou
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
    # chaque secret tel que tapé, et ses formes encodées qu'une page peut renvoyer : adresse (quote, quote_plus), HTML (échappé)
    forms = set()
    for x in secrets:
        if x and len(x) >= 3:
            forms |= {x, urllib.parse.quote(x), urllib.parse.quote(x, safe=''), urllib.parse.quote_plus(x), html.escape(x), html.escape(x, quote=False),
                      html.escape(urllib.parse.quote_plus(x))}
    for s in sorted(forms, key=len, reverse=True):
        out = re.sub(re.escape(s), '<secret>', out, flags=re.I)
    out = re.sub(r'(javax\.faces\.ViewState[^>]{0,80}?value=")[^"]*', r'\1<viewstate>', out)
    out = re.sub(r"(ViewState'?\"?\s*[:=]\s*['\"])[^'\"]*", r'\1<viewstate>', out)          # forme « ViewState': '…' » d'un dictionnaire imprimé
    out = re.sub(r'-?\d{6,}:-?\d{6,}', '<viewstate>', out)                                        # jeton d'état de page JSF (nombre:nombre)
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
             'fields': {}, 'selects': {}, 'defaults': {}, 'buttons': [], 'checkboxes': []}
        for im in re.finditer(r'(?is)<input\b([^>]*)>', body):
            a = im.group(1)
            name, typ, val = get('name', a), (get('type', a) or 'text').lower(), html.unescape(get('value', a))
            if typ == 'checkbox' and name:
                f['checkboxes'].append(name)
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
            chosen_opt = next((html.unescape(get('value', o.group(1))) for o in re.finditer(r'(?is)<option\b([^>]*)>', sm.group(2)) if re.search(r'\bselected\b', o.group(1), re.I)), None)
            f['defaults'][name] = chosen_opt if chosen_opt is not None else (opts[0][0] if opts else '')
        forms.append(f)
    return forms


def partial_updates(body):
    """Fragments HTML d'une réponse JSF partielle (<update id=…><![CDATA[…]]></update>) : [(id, html)] ; une page ordinaire : [('page', html)]."""
    ups = [(m.group(1), m.group(2)) for m in re.finditer(r'(?s)<update id="([^"]*)">\s*<!\[CDATA\[(.*?)\]\]>\s*</update>', body)]
    return ups or [('page', body)]


def parse_rows(markup):
    """Lignes de tableau (<tr> avec cellules <td>) d'un fragment : [{ ri, cells [texte], links [(texte, adresse)], actions [identifiants PrimeFaces d'un lien de commande] }]."""
    rows = []
    for tm in re.finditer(r'(?is)<tr\b([^>]*)>(.*?)</tr>', markup):
        body = tm.group(2)
        if not re.search(r'(?i)<td\b', body):
            continue
        cells = [text_of(c.group(1)) for c in re.finditer(r'(?is)<td\b[^>]*>(.*?)</td>', body)]
        ri = (re.search(r'data-ri="([^"]*)"', tm.group(1)) or [None, ''])[1]
        acts = [html.unescape(m.group(1)) for m in re.finditer(r'PrimeFaces\.ab\(\{[^}]*?s:\\?"([^"\\]+)', html.unescape(body))]
        btns = []
        for bm in re.finditer(r'(?is)<(button|input|a)\b([^>]*)>', body):
            a = bm.group(2)
            g = lambda n: html.unescape((re.search(n + r'\s*=\s*"([^"]*)"', a, re.I) or [None, ''])[1])
            if g('id') or g('name'):
                btns.append({'id': g('id'), 'name': g('name'), 'value': g('value'), 'onclick': g('onclick')[:120]})
        rows.append({'ri': ri, 'cells': cells, 'links': parse_links(body), 'actions': acts, 'buttons': btns})
    return rows


def fields_by_label(markup):
    """{ libellé: nom du champ de saisie } d'après <label for=ID>texte</label> et l'<input id=ID name=NOM> correspondant ; et tous les champs texte du fragment."""
    ids = {}
    for m in re.finditer(r'(?is)<input\b([^>]*)>', markup):
        a = m.group(1)
        i, n = (re.search(r'\bid="([^"]*)"', a) or [None, ''])[1], (re.search(r'\bname="([^"]*)"', a) or [None, ''])[1]
        if i and n:
            ids[i] = (n, html.unescape((re.search(r'\bvalue="([^"]*)"', a) or [None, ''])[1]), (re.search(r'\btype="([^"]*)"', a) or [None, 'text'])[1].lower())
    labels = {text_of(m.group(2)): ids[m.group(1)][0] for m in re.finditer(r'(?is)<label\b[^>]*\bfor="([^"]*)"[^>]*>(.*?)</label>', markup) if m.group(1) in ids}
    return labels, {n: v for n, v, t in ids.values() if t in ('text', 'hidden')}


def pager_text(body):
    """Texte du paginateur PrimeFaces (« Page 1 of 16 », « 1-15 of 1155 ») s'il y en a un."""
    return [text_of(m) for m in re.findall(r'(?is)ui-paginator-current[^>]*>(.*?)</span>', body)][:2]


def result_info(body):
    """(lignes, nombre, message) des RÉSULTATS d'une réponse : lignes du <tbody id=…searchResults_data> seulement (les autres tableaux de la page sont de la mise en page), nombre
    de « Number of search results: N » et « No data found. » s'ils y sont."""
    rows, count, msg = [], None, ''
    for _, frag in partial_updates(body):
        for m in re.finditer(r'(?is)<tbody\b[^>]*id="[^"]*searchResults_data"[^>]*>(.*?)</tbody>', frag):
            rows += [r for r in parse_rows('<table><tbody>' + m.group(1) + '</tbody></table>')]
        t = text_of(frag)
        c = re.search(r'Number of search results:\s*(\d+)', t)
        if c:
            count = int(c.group(1))
        if 'No data found' in t:
            msg = 'No data found'
    return rows, count, msg


def describe(body):
    """Résumé d'une réponse JSF partielle : taille, composants mis à jour (id et taille), erreurs, redirection, messages affichés."""
    ups = [(m.group(1), len(m.group(2))) for m in re.finditer(r'(?s)<update id="([^"]*)">\s*<!\[CDATA\[(.*?)\]\]>\s*</update>', body)]
    err = [text_of(m)[:160] for m in re.findall(r'(?is)<error>(.*?)</error>', body)]
    red = re.findall(r'<redirect url="([^"]*)"', body)
    msg = [text_of(m)[:160] for m in re.findall(r'(?is)ui-messages?-(?:error|warn|info|fatal)[^>]*>(.*?)</(?:div|ul|span|li)>', body)][:4]
    return f'{len(body)} octets | mises à jour: ' + ', '.join(f'{i[-45:]}({n})' for i, n in ups[:12]) + (f' | erreurs: {err}' if err else '') + (f' | redirection: {red}' if red else '') + (f' | messages: {msg}' if msg else '') + (' | début: ' + text_of(body)[:160] if not ups else '')


def sent_summary(d):
    """Noms des paramètres envoyés, avec la valeur des courts hors jetons d'état : pour comparer avec la requête du navigateur."""
    return {k: ('<état>' if re.search(r'ViewState|jid|token|nonce', k, re.I) else (v if len(str(v)) <= 40 else '<long>')) for k, v in sorted(d.items())}


def view_state(body):
    m = re.search(r'ViewState[^>]*>\s*<!\[CDATA\[([^\]]+)', body)
    return m.group(1) if m else None


def pick(options, wanted):
    """Valeur de la première option dont le libellé correspond à l'expression `wanted` (insensible à la casse), ou None."""
    rx = re.compile(wanted, re.I)
    return next((v for v, label in options if rx.search(label) or rx.search(v)), None)


def login_json(body):
    """Réponse du formulaire de connexion lue en objet : du JSON encodé deux fois (une chaîne qui contient l'objet) est relu ;
    une autre valeur (chaîne, liste, nombre) devient { errorMessage: « réponse inattendue … » } ; None si ce n'est pas du JSON."""
    try:
        j = json.loads(body)
        if isinstance(j, str) and j.lstrip().startswith('{'):
            j = json.loads(j)
    except ValueError:
        return None
    return j if isinstance(j, dict) else {'errorMessage': 'réponse JSON inattendue: ' + str(j)[:200]}


def login_result(body):
    """(connecté, message) d'après la réponse JSON du formulaire de connexion ; jamais d'exception."""
    j = login_json(body)
    if j is None:
        return False, 'réponse non JSON: ' + body[:200]
    return bool(j.get('loggedIn')), str(j.get('errorMessage') or j.get('redirect') or '')


# ---------------------------------------------------------------------------------------------------------- la sonde
class OffHost(Exception):
    """Redirection hors de HOST : refusée, jamais suivie."""


class StayOnHost(urllib.request.HTTPRedirectHandler):
    """Suit une redirection seulement vers HOST (www.ead.eurocontrol.int, ou la copie locale des essais) : une page d'un autre hôte
    n'est ni demandée ni gardée dans le compte rendu."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not urllib.parse.urljoin(req.full_url, newurl).startswith(HOST + '/'):
            raise OffHost(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class Session:
    def __init__(self, secrets):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar), StayOnHost())
        self.secrets = secrets
        self.n = 0

    def call(self, url, data=None, headers=None, timeout=60, raw=False):
        if not url.startswith(HOST + '/'):
            raise SystemExit('adresse hors de www.ead.eurocontrol.int refusée: ' + sanitize(url, self.secrets))
        h = {'User-Agent': UA, 'Accept-Language': 'en'}
        h.update(headers or {})
        req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode() if data is not None else None, headers=h)
        try:
            with self.op.open(req, timeout=timeout) as r:
                b = r.read()
                return r.status, r.geturl(), b if raw else b.decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            b = e.read()
            return e.code, url, b if raw else b.decode('utf-8', 'replace')
        except OffHost as e:
            raise SystemExit('redirection hors de www.ead.eurocontrol.int refusée: ' + sanitize(str(e), self.secrets)) from None


def probe(user, password, state, icao, out, name=None, download=False):
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
    j = login_json(body) or {}
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
        say('     champs:', {k: ('<état>' if re.search(r'ViewState|jid|token|nonce', k, re.I) else (v[:30] if len(v) < 40 else '<long>')) for k, v in f['fields'].items()})
        say('     cases à cocher:', f['checkboxes'])
        for sel_name, opts in f['selects'].items():
            say(f'     liste {sel_name}: {len(opts)} options:', '; '.join(f'{v}={l}'[:60] for v, l in opts[:400]))
        for b in f['buttons']:
            say('     bouton', b)
    form = next((f for f in forms if f['selects']), forms[0] if forms else None)
    if not form:
        say('5. aucun formulaire dans la page de la bibliothèque')
        return finish(out, rep, s)
    data = dict(form['fields'])
    chosen = {}
    for sel, opts in form['selects'].items():
        labels = ' | '.join(l for _, l in opts)
        for kind, test, wanted in (('État', lambda: pick(opts, state) is not None, state), ('partie', lambda: re.search(r'\bENR\b', labels) and re.search(r'\bAD\b', labels), r'^AD$'),
                                   ('type', lambda: re.search(r'\bAMDT\b', labels) and re.search(r'\bSUP\b', labels), r'^AIP$'),
                                   ('langue', lambda: re.search(r'\bEN\b', labels), r'^EN\b|^English')):
            if kind not in chosen.values() and test():
                v = pick(opts, wanted)
                if v is not None:
                    chosen[sel] = kind
                    data[sel] = v
                    break
    for sel, opts in form['selects'].items():
        if sel not in data:
            civil = pick(opts, r'^Civil') if re.search(r'Civil', ' '.join(l for _, l in opts)) else None
            data[sel] = civil if civil is not None else form['defaults'].get(sel, '')          # le navigateur envoie TOUTES les listes
            chosen[sel] = 'défaut' if civil is None else 'type d\'autorité'
    say('5. choix faits dans les listes:', chosen or 'aucun (voir les options ci-dessus)')
    adv = next((k for k in form['checkboxes'] if re.search(r'advanced', k, re.I)), None)
    btn = next((b for b in form['buttons'] if re.search(r'search|suche|recherche', b['label'] + b['value'] + b['id'], re.I)), form['buttons'][0] if form['buttons'] else None)
    action = urllib.parse.urljoin(url, form['action'] or url)
    hdr = {'Faces-Request': 'partial/ajax', 'X-Requested-With': 'XMLHttpRequest', 'Referer': url}
    rows_of = lambda body: result_info(body)[0]
    if not btn:
        say('6. aucun bouton de recherche reconnu')
        return finish(out, rep, s)
    src = btn['id'] or btn['name']

    sent = {}

    def ajax(extra, tag, source, event=None, execute='@all', render='@all'):
        d = dict(data)
        d.update(extra)
        d.update({'javax.faces.partial.ajax': 'true', 'javax.faces.source': source, 'javax.faces.partial.execute': execute, 'javax.faces.partial.render': render})
        if event:
            d['javax.faces.partial.event'] = event
        sent['last'] = d
        code, _, body = s.call(action, d, hdr)
        keep(tag, body)
        vs = view_state(body)
        if vs:
            data['javax.faces.ViewState'] = vs          # JSF peut renouveler l'état de la page : le suivant est utilisé
        return code, body

    last = {'body': ''}

    def search(extra, tag, execute='mainForm', render='mainForm'):
        code, body = ajax({**extra, src: src}, tag, src, execute=execute, render=render)
        if rows_of(body):
            last['body'] = body                           # la dernière réponse qui portait des lignes
        return code, body, rows_of(body)
    st = next((k for k, v in chosen.items() if v == 'État'), None)
    if st:                                               # le navigateur déclenche un événement à la sélection de l'État : on le rejoue avant de chercher
        w = st[:-6] if st.endswith('_input') else st
        for event in ('valueChange', 'change'):
            code, cb = ajax({}, 'changement_etat', w, event=event, execute=w)
            ok_ev = '<error' not in cb and 'redirect' not in cb and code == 200
            say('   sélection de l\'État, événement', event, '->', code, describe(cb)[:260])
            if ok_ev:
                break
    code, body, rows = search({}, 'recherche_ajax')
    say('6. recherche (État + partie AD):', code, len(body), 'octets |', len(rows), 'ligne(s) de résultats | nombre annoncé:', result_info(body)[1], result_info(body)[2], '| paginateur:', pager_text(body) or 'aucun')
    say('   réponse:', describe(body))
    say('   paramètres envoyés:', sent_summary(sent['last']))
    result_ids = [m.group(1) for m in re.finditer(r'(?s)<update id="([^"]*)">\s*<!\[CDATA\[(.*?)\]\]>', body) if 'searchResults' in m.group(2) and 'ViewState' not in m.group(1)]
    say('   composant(s) portant les lignes:', result_ids or 'aucun identifié')
    hit = lambda r: icao.upper() in ' '.join(r['cells'] + [h for _, h in r['links']]).upper()
    if name:
        if adv:
            wid = adv[:-6] if adv.endswith('_input') else adv
            labels, extra_fields = {}, {}
            for event in ('valueChange', 'change'):
                code, tb = ajax({adv: 'on'}, 'recherche_avancee', wid, event=event, execute=wid)
                labels, extra_fields = fields_by_label(tb)
                if any(re.search(r'document.?name', l, re.I) for l in labels) or extra_fields:
                    break
            say('   case recherche avancée', adv, '->', code, '| champs apparus:', labels or extra_fields or 'aucun')
            data[adv] = 'on'
            data.update({k: v for k, v in extra_fields.items() if not re.search(r'ViewState', k)})
            field = next((n for l, n in labels.items() if re.search(r'document.?name', l, re.I)), None)
        else:
            field = next((k for k in form['fields'] if re.search(r'document.?name', k, re.I)), None)
            say('   case recherche avancée: aucune dans le formulaire')
        say('   champ « Document Name »:', field or 'INTROUVABLE')
        code, cbody, crows = search({}, 'recherche_apres_bascule')
        say('   contrôle: la recherche sans nom, après la bascule, rend', len(crows), 'ligne(s) de résultats, nombre annoncé', result_info(cbody)[1], '|', describe(cbody)[:300])
        if field:
            variants = [('ciblée, tout le formulaire', 'mainForm', 'mainForm'),      # la seule forme qui a rendu des lignes sur le vrai écran (28 octobre)
                        ('formulaire (execute @form, render @all)', '@form', '@all'), ('tout (execute et render @all)', '@all', '@all'),
                        ('ciblée (execute champs + bouton, render composants des lignes)', f'{src} {field} {adv}', ' '.join(result_ids) or '@all')]
            use = {'v': variants[0]}

            def by_name(text, tag):
                code, body, rs = search({field: text}, tag, use['v'][1], use['v'][2])
                say(f'   nom « {text} »:', code, len(rs), 'ligne(s) de résultats | nombre annoncé:', result_info(body)[1], result_info(body)[2], '| paginateur:', pager_text(body) or 'aucun')
                if not rs:
                    say('      réponse:', describe(body)[:400])
                return rs
            for v in variants:
                use['v'] = v
                code, vbody, vrs = search({field: name}, 'variante', v[1], v[2])
                say('   variante', v[0], '->', len(vrs), 'ligne(s)')
                if len(vrs) or v is variants[-1]:
                    say('   paramètres envoyés (variante):', sent_summary(sent['last']))
                    if len(vrs):
                        break
            rows = by_name(name, 'recherche_nom')
            tail = name.split('_', 1)[1] if '_' in name else name
            contains = by_name(tail, 'recherche_nom_contient') if tail != name else []
            say('   le champ fait', '« contient »' if contains else ('« commence par » (ou rien de plus large trouvé)' if rows else 'pas de résultat'), f'(« {name} »: {len(rows)}, « {tail} »: {len(contains)})')
            if not rows:
                say('   repli: noms exacts', f'{name}_<section>-<n>_en.pdf', '(section 1 à 8, n de 1 à 9, arrêt au premier vide par section)')
                for sec in range(1, 9):
                    for n in range(1, 10):
                        rs = by_name(f'{name}_{sec}-{n}_en.pdf', f'recherche_{sec}_{n}')
                        if not rs:
                            break
                        rows += rs
    tables = [t for _, frag in partial_updates(last['body']) for t in re.findall(r'(?is)<table\b.*?</table>', frag)]
    if tables:
        (out / 'tables.html').write_text(sanitize('\n\n'.join(tables)[:40000], s.secrets), encoding='utf-8')
        say('   ead_probe/tables.html: le(s) <table> des résultats, nettoyé(s) (à coller si je le demande)')
    say('7. tableau des résultats retenu:', len(rows), 'ligne(s) |', sum(1 for r in rows if hit(r)), 'pour', icao)
    for r in rows[:300]:
        say('     ', f"[{r['ri']}]", ' | '.join(c[:70] for c in r['cells']), '| liens:', [(l[:40], h[:100]) for l, h in r['links']][:3],
            '| boutons:', [(b['id'][-40:], b['name'][-40:], b['onclick'][:60]) for b in r['buttons']][:2], '| commandes:', r['actions'][:2])
    if download:
        row = next((r for r in rows if hit(r)), None)
        target = next(((l, h) for l, h in row['links'] if h), None) if row else None
        if row and not target and row['buttons']:
            bt = row['buttons'][-1]                          # le bouton ▶ de la ligne : envoi classique du formulaire avec ce bouton
            d = dict(data)
            d[bt['name'] or bt['id']] = bt['value'] or bt['name'] or bt['id']
            code, u3, raw = s.call(action, d, {'Referer': url}, raw=True)
            label = ' '.join(row['cells'])[:60]
            say('8. téléchargement par le bouton', bt['id'][-40:], 'de', label, ':', code, len(raw), 'octets', '| PDF' if raw[:5] == b'%PDF-' else '| PAS un PDF')
            if raw[:5] != b'%PDF-':
                say('   début de la réponse:', sanitize(raw[:300].decode('utf-8', 'replace'), s.secrets).replace('\n', ' '))
        elif target:
            code, u3, raw = s.call(urllib.parse.urljoin(url, target[1]), headers={'Referer': url}, raw=True)
            label = target[0]
            say('8. téléchargement de', label[:60], ':', code, len(raw), 'octets', '| PDF' if raw[:5] == b'%PDF-' else '| PAS un PDF')
        else:
            raw, label = b'', ''
            say('8. téléchargement: aucune ligne pour', icao)
        if raw[:5] == b'%PDF-':
            cache = out / 'cache'
            cache.mkdir(exist_ok=True)
            (cache / ((re.sub(r'[^A-Za-z0-9._-]+', '_', label)[:80] or 'page') + '.pdf')).write_bytes(raw)
            say('   gardé dans', 'ead_probe/cache/ (cache local: ne va jamais dans le dépôt)')
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
    ap.add_argument('--name', default=None, help='filtre « nom de document » (recherche avancée), ex. EGLL')
    ap.add_argument('--download', action='store_true', help='télécharge UN document du terrain dans ead_probe/cache/ (cache local)')
    a = ap.parse_args(argv)
    if not a.probe:
        raise SystemExit('rien à faire: ajouter --probe')
    user = a.user or input('EAD Basic, nom d\'utilisateur: ').strip()
    password = os.environ.get('EAD_PASSWORD') or getpass.getpass('EAD Basic, mot de passe (non gardé): ')
    probe(user, password, a.state, a.icao, a.out, a.name, a.download)


if __name__ == '__main__':
    main()
