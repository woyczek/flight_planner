"""Bibliothèque EAD Basic (EUROCONTROL) : connexion, relevé des États, récupération des documents de procédures d'UN terrain, lecture des tables de codage.

  python tools/proc_ead.py --survey all|EG,ED,LF [--user NOM] [--out dossier]     relevé par État (survey.json, survey.txt)
  python tools/proc_ead.py --fetch EGLL [--user NOM] [--out dossier] [--manual-dir dossier]     les documents d'UN terrain, lus

La sonde de découverte (lecture seule, compte rendu à renvoyer) est dans tools/ead_probe.py depuis V3 § 10.29 (b) : elle partage avec ce module l'adresse du site, la session et la
lecture des formulaires, et rien d'autre. Mot de passe demandé à l'invite ou variable EAD_PASSWORD ; jamais gardé ni journalisé (sanitize). Bibliothèque standard seulement (pypdf et
l'OCR à la demande, par proc_pdf et proc_ocr).
"""
import argparse
import getpass
import html
import http.cookiejar
import json
import os
import re
import time
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import outbound  # le User-Agent du lanceur, chaque échec dit en console

HOST = os.environ.get('EAD_PROBE_HOST', 'https://www.ead.eurocontrol.int') if os.environ.get('EAD_PROBE_HOST', '').startswith('http://127.0.0.1') \
    else 'https://www.ead.eurocontrol.int'      # EAD_PROBE_HOST : seulement pour l'essai sur une copie locale (tests/v3), jamais un autre hôte
LOGIN_PAGE = HOST + '/cms-eadbasic/opencms/en/login/ead-basic/'
LOGIN_POST = HOST + '/fwf-eadbasic/ajaxlogin/ajax_security_check.jspx'
UA = 'Mozilla/5.0 (X11; Linux x86_64) ' + outbound.UA  # le préfixe d'un navigateur gardé (portail EAD), le lanceur nommé


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


def result_info(body):
    """(lignes, nombre, message) des RÉSULTATS d'une réponse : lignes du <tbody id=…searchResults_data> seulement (les autres tableaux de la page sont de la mise en page), nombre
    de « Number of search results: N » et « No data found. » s'ils y sont."""
    rows, count, msg = [], None, ''
    for _, frag in partial_updates(body):
        for m in re.finditer(r'(?is)<tbody\b[^>]*id="[^"]*searchResults_data"[^>]*>(.*?)</tbody>', frag):
            # la ligne « No data found. » d'un tableau vide n'est pas un résultat (vue le 28 octobre 2026 : elle précédait les vraies lignes, d'où un document au nom vide)
            rows += [r for r in parse_rows('<table><tbody>' + m.group(1) + '</tbody></table>') if not (len(r['cells']) == 1 and r['cells'][0].startswith('No data found'))]
        t = text_of(frag)
        c = re.search(r'Number of search results:\s*(\d+)', t)
        if c:
            count = int(c.group(1))
        if 'No data found' in t:
            msg = 'No data found'
    return rows, count, msg


def page_rows(body, table):
    """(lignes, trouvé) d'une réponse à un changement de page : la mise à jour `<update id=table>` ne contient que des lignes nues `<tr data-ri=…>` (sans <table> ni <tbody …_data> : c'est ce
    que veut dire _skipChildren de PrimeFaces, vu sur le vrai écran le 28 octobre 2026) ; si elle a un <tbody>, result_info les lit. `trouvé` est faux quand la réponse n'a aucune mise à jour du tableau."""
    frag = next((f for i, f in partial_updates(body) if i == table), None)
    if frag is None:
        rows, _, _ = result_info(body)
        return rows, bool(rows)
    if re.search(r'(?i)<tbody\b', frag):
        return result_info(body)[0], True
    return [r for r in parse_rows('<table><tbody>' + frag + '</tbody></table>') if not (len(r['cells']) == 1 and r['cells'][0].startswith('No data found'))], True


def describe(body):
    """Résumé d'une réponse JSF partielle : taille, composants mis à jour (id et taille), erreurs, redirection, messages affichés."""
    ups = [(m.group(1), len(m.group(2))) for m in re.finditer(r'(?s)<update id="([^"]*)">\s*<!\[CDATA\[(.*?)\]\]>\s*</update>', body)]
    err = [text_of(m)[:160] for m in re.findall(r'(?is)<error>(.*?)</error>', body)]
    red = re.findall(r'<redirect url="([^"]*)"', body)
    msg = [text_of(m)[:160] for m in re.findall(r'(?is)ui-messages?-(?:error|warn|info|fatal)[^>]*>(.*?)</(?:div|ul|span|li)>', body)][:4]
    return f'{len(body)} octets | mises à jour: ' + ', '.join(f'{i[-45:]}({n})' for i, n in ups[:12]) + (f' | erreurs: {err}' if err else '') + (f' | redirection: {red}' if red else '') + (f' | messages: {msg}' if msg else '') + (' | début: ' + text_of(body)[:160] if not ups else '')


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
        self.op = outbound.opener(urllib.request.HTTPCookieProcessor(self.jar), StayOnHost(), what='EAD')
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


# ---------------------------------------------------------------------------------------------------------- bibliothèque AIP : relevé des États et récupération d'un terrain
SELECT_KINDS = [('authority', r'AuthorityCode', r'Albania|Belgium|France'), ('atype', r'AuthorityType', r'Civil'), ('lang', r'Language', r'^EN$'),
                ('type', r'AipType', r'AMDT'), ('part', r'AipPart', r'ENR')]
SURVEY_KEYS = {'CODING': 'CODING', 'SID': 'DEPARTURE', 'STAR': 'ARRIVAL', 'IAP': 'APPROACH'}
# intitulés français (AIP de la France…) cherchés quand aucun des quatre mots anglais ne donne rien
ALT_KEYS = ['SID', 'STAR', 'IAC', 'RNAV', 'CODAGE', 'ARRIVEE', 'DEPART', 'APPROCHE']
SHAPES = [('mainForm', 'mainForm'), ('@form', '@all'), ('@all', '@all')]
MIN_DELAY = 1.0  # secondes au moins entre deux requêtes de la bibliothèque (conditions d'accès automatisé inconnues : EAD_BASIC.md § 1)
# Pagination du tableau de résultats (PrimeFaces, 15 lignes par page). NOMS DE PARAMÈTRES NON VUS sur le vrai écran (28 octobre 2026) : ce sont ceux que PrimeFaces envoie
# pour un changement de page de <p:dataTable> ; si l'EAD répond autrement, la console imprime ce qui a été envoyé et l'anatomie de la réponse (voir EadLibrary._more_pages), et ce
# dictionnaire seul est à corriger. {t} = identifiant du tableau (mainForm:searchResults), {first} = rang de la première ligne de la page demandée.
PAGE_ROWS = 15
MAX_PAGES = 50      # pages parcourues au plus par recherche (jamais de boucle sans fin)
PAGE_TABLE = 'mainForm:searchResults'
PAGE_PARAMS = {'{t}': '{t}', '{t}_pagination': 'true', '{t}_first': '{first}', '{t}_rows': str(PAGE_ROWS), '{t}_skipChildren': 'true', '{t}_encodeFeature': 'true'}
SAFE_NAME = re.compile(r'^[A-Za-z0-9._-]+$')  # le nom d'un document d'EAD Basic, tel qu'il devient un nom de fichier du cache (proc_pdf.safe_path)
ICAO_RE = re.compile(r'^[A-Z0-9]{4}$')  # un code OACI : entre dans un nom de fichier (cache, interprétation manuelle), jamais un chemin


def icao_code(text):
    """Code OACI validé (4 lettres ou chiffres, en capitales) ; SystemExit sinon : il sert de nom de fichier, jamais de chemin."""
    code = str(text or '').strip().upper()
    if not ICAO_RE.fullmatch(code):
        raise SystemExit(f'code OACI refusé: {sanitize(str(text))[:20]!r} (4 lettres ou chiffres attendus)')
    return code


class EadLibrary:
    """La bibliothèque AIP d'EAD Basic pilotée comme le fait le navigateur (formes de requête établies sur le vrai écran, 28 octobre 2026) : États, type de document, filtres
    nom et titre, recherche, téléchargement. Lecture seule ; le mot de passe n'est jamais gardé ; `delay` espace les requêtes, jamais moins de
    MIN_DELAY (1 s : la valeur du module, que seuls les essais abaissent)."""

    def __init__(self, user, password, say=print, keep=None, delay=0.0):
        self.s = Session([user, password])
        self.say, self.keep, self.delay = say, keep or (lambda n, b: None), max(MIN_DELAY, float(delay or 0))
        self.data, self.sel, self.opts, self.f = {}, {}, {}, {}
        self.shape, self.url, self.action, self.src = 0, '', '', ''
        self.last_sent, self._page_diag = {}, False

    def _wait(self):
        if self.delay:
            time.sleep(self.delay)

    def open(self):
        """Connexion, page d'accueil, bibliothèque AIP, recherche avancée ouverte. Rend True si la bibliothèque est prête."""
        s, say = self.s, self.say
        s.call(LOGIN_PAGE)
        code, url, body = s.call(LOGIN_POST, {'j_username': s.secrets[0], 'j_password': s.secrets[1]}, {'X-Requested-With': 'XMLHttpRequest', 'Referer': LOGIN_PAGE})
        ok, msg = login_result(body)
        say('connexion:', 'OUI' if ok else 'NON', msg[:120] if not ok else '')
        if not ok:
            return False
        j = login_json(body) or {}
        code, url, body = s.call(urllib.parse.urljoin(HOST, j.get('redirect') or '/fwf-eadbasic/public/static/home.faces'))
        links = parse_links(body)
        lib = next(((l, h) for l, h in links if re.search(r'AIP', l + h, re.I) and re.search(r'librar|bibli', l + h, re.I)), None) or next(((l, h) for l, h in links if re.search(r'AIP', l, re.I)), None)
        if not lib:
            say('bibliothèque AIP: lien introuvable')
            return False
        code, self.url, body = s.call(urllib.parse.urljoin(url, lib[1]))
        self.keep('bibliotheque', body)
        forms = parse_forms(body)
        form = next((f for f in forms if f['selects']), None)
        if not form:
            say('bibliothèque AIP: aucun formulaire de recherche')
            return False
        self.action = urllib.parse.urljoin(self.url, form['action'] or self.url)
        self.data = dict(form['fields'])
        for sel_name, opts in form['selects'].items():
            labels = ' | '.join(l + ' ' + v for v, l in opts)
            kind = next((k for k, rx, lab in SELECT_KINDS if re.search(rx, sel_name) or re.search(lab, labels)), None)
            if kind and kind not in self.sel:
                self.sel[kind] = sel_name
                self.opts[kind] = opts
            self.data[sel_name] = form['defaults'].get(sel_name, '')
        btn = next((b for b in form['buttons'] if re.search(r'search|suche|recherche', b['label'] + b['value'] + b['id'], re.I)), None)
        if not btn or 'authority' not in self.sel:
            say('formulaire de recherche non reconnu: boutons', [b['id'] for b in form['buttons']], 'listes', list(form['selects']))
            return False
        self.src = btn['id'] or btn['name']
        adv = next((k for k in form['checkboxes'] if re.search(r'advanced', k, re.I)), None)
        if adv:
            wid = adv[:-6] if adv.endswith('_input') else adv
            for event in ('valueChange', 'change'):
                code, tb = self._ajax({adv: 'on'}, 'recherche_avancee', wid, event=event, execute=wid)
                labels, extra = fields_by_label(tb)
                if any(re.search(r'document.?name', l, re.I) for l in labels):
                    break
            self.data[adv] = 'on'
            self.data.update({k: v for k, v in extra.items() if not re.search(r'ViewState', k)})
            self.f = {'name': next((n for l, n in labels.items() if re.search(r'document.?name', l, re.I)), None),
                      'heading': next((n for l, n in labels.items() if re.search(r'document.?head', l, re.I)), None)}
        say('bibliothèque prête: listes', {k: v.split(':')[-1] for k, v in self.sel.items()}, '| filtres', self.f)
        return bool(self.f.get('name'))

    def _ajax(self, extra, tag, source, event=None, execute='mainForm', render='mainForm'):
        self._wait()
        d = dict(self.data)
        d.update(extra)
        d.update({'javax.faces.partial.ajax': 'true', 'javax.faces.source': source, 'javax.faces.partial.execute': execute, 'javax.faces.partial.render': render})
        if event:
            d['javax.faces.partial.event'] = event
        self.last_sent = d
        code, _, body = self.s.call(self.action, d, {'Faces-Request': 'partial/ajax', 'X-Requested-With': 'XMLHttpRequest', 'Referer': self.url})
        self.keep(tag, body)
        vs = view_state(body)
        if vs:
            self.data['javax.faces.ViewState'] = vs
        return code, body

    def choose(self, kind, wanted):
        """Fixe une liste (authority, atype, lang, type, part) sur l'option dont la valeur ou le libellé est `wanted` ; rend la valeur, ou None si elle n'existe pas."""
        opts = self.opts.get(kind) or []
        v = next((v for v, l in opts if v == wanted or l.strip() == wanted or l.strip().endswith(f'({wanted})')), None)
        if v is not None:
            self.data[self.sel[kind]] = v
        return v

    def authority(self, prefix):
        """Choisit l'autorité (préfixe OACI : EG, LF…), type civil, langue EN, et rejoue l'événement de sélection de l'État ; False si elle n'est pas proposée."""
        if self.choose('authority', prefix) is None:
            return False
        for k, w in (('atype', 'Civil'), ('lang', 'EN')):
            if k in self.sel:
                self.choose(k, w)
        name = self.sel['authority']
        w = name[:-6] if name.endswith('_input') else name
        for event in ('valueChange', 'change'):
            code, cb = self._ajax({}, 'changement_etat', w, event=event, execute=w)
            if code == 200 and '<error' not in cb and 'redirect' not in cb:
                break
        return True

    def search(self, name=None, heading=None, all_pages=False):
        """Recherche avec les listes en cours et les filtres « nom du document » et « titre » (contient) ; rend { rows, count, msg } ; la forme de requête qui marche est gardée.
        `all_pages` : parcourt aussi les pages suivantes du tableau (15 lignes par page), chacune par une requête espacée comme les autres ; la clé `warning` dit pourquoi le parcours
        s'est arrêté avant d'avoir lu toutes les lignes annoncées (réponse d'erreur, page sans ligne nouvelle, 50 pages) ; `pages` compte les pages lues."""
        extra = {self.f['name']: name or '', self.src: self.src}
        if self.f.get('heading'):
            extra[self.f['heading']] = heading or ''
        for i in range(len(SHAPES)):
            ex, rn = SHAPES[(self.shape + i) % len(SHAPES)]
            code, body = self._ajax(extra, 'recherche', self.src, execute=ex, render=rn)
            rows, count, msg = result_info(body)
            if count is not None or rows:
                self.shape = (self.shape + i) % len(SHAPES)
                res = {'rows': rows, 'count': count if count is not None else len(rows), 'msg': msg, 'pages': 1, 'warning': ''}
                if all_pages and rows and res['count'] > len(rows):
                    self._more_pages(res, extra, body)
                return res
        return {'rows': [], 'count': 0, 'msg': 'réponse sans tableau de résultats', 'pages': 0, 'warning': ''}

    def _more_pages(self, res, extra, first_body):
        """Lit les pages 2, 3… du tableau de résultats (changement de page PrimeFaces, requête partielle sur le tableau) et ajoute leurs lignes à `res`. S'arrête quand les lignes lues
        atteignent le nombre annoncé, quand une page ne donne aucune ligne nouvelle, quand la réponse est une erreur, une redirection ou n'a pas de mise à jour du tableau (ses lignes y sont nues, sans <tbody>), ou après MAX_PAGES pages : `res['warning']`
        dit alors combien de lignes ont été lues. La première fois, la console imprime les paramètres envoyés et l'anatomie de la réponse (les noms de PAGE_PARAMS n'ont pas été vus)."""
        m = re.search(r'id="([^"]*searchResults)_data"', first_body)
        table = m.group(1) if m else PAGE_TABLE
        key = lambda r: (tuple(r['cells']), tuple(h for _, h in r['links']))
        seen = {key(r) for r in res['rows']}
        base = {k: v for k, v in extra.items() if k != self.src}          # le bouton « Search » n'est pas cliqué par un changement de page
        for page in range(1, MAX_PAGES):
            if len(res['rows']) >= res['count']:
                return
            params = {k.format(t=table, first=''): v.format(t=table, first=page * PAGE_ROWS) for k, v in PAGE_PARAMS.items()}
            code, body = self._ajax({**base, **params}, 'page', table, execute=table, render=table)
            if not self._page_diag:
                self._page_diag = True
                # deux lignes courtes (le journal du lanceur coupe vers 500 caractères) : l'anatomie de la réponse, puis les seuls NOMS des paramètres envoyés
                self.say('pagination (noms de paramètres non vus sur le vrai écran), réponse :', describe(body))
                self.say('pagination, paramètres envoyés :', ', '.join(sorted(self.last_sent)))
            got, found = page_rows(body, table)
            if code != 200 or '<error' in body or '<redirect' in body or not found:
                res['warning'] = f'{len(res["rows"])} ligne(s) lue(s) sur {res["count"]} : la page {page + 1} a répondu par une erreur ou sans tableau de résultats'
                return
            new = [r for r in got if key(r) not in seen]
            if not new:
                res['warning'] = f'{len(res["rows"])} ligne(s) lue(s) sur {res["count"]} : la page {page + 1} ne donne aucune ligne nouvelle'
                return
            seen.update(key(r) for r in new)
            res['rows'] += new
            res['pages'] += 1
        if len(res['rows']) < res['count']:
            res['warning'] = f'{len(res["rows"])} ligne(s) lue(s) sur {res["count"]} : arrêt après {MAX_PAGES} pages'

    def fetch(self, row):
        """Octets du document d'une ligne de résultats (lien direct, sinon bouton ▶ de la ligne), ou None."""
        target = next((h for l, h in row['links'] if h), None)
        self._wait()
        if target:
            code, _, raw = self.s.call(urllib.parse.urljoin(self.url, target), headers={'Referer': self.url}, raw=True)
        elif row['buttons']:
            bt = row['buttons'][-1]
            d = dict(self.data)
            d[bt['name'] or bt['id']] = bt['value'] or bt['name'] or bt['id']
            code, _, raw = self.s.call(self.action, d, {'Referer': self.url}, raw=True)
        else:
            return None
        return raw if raw[:5] == b'%PDF-' else None


def row_summary(row):
    """(nom du document, titre) d'une ligne de résultats : le nom est la cellule (ou le texte d'un lien) qui ressemble à un nom de fichier AIP (« EB_AD_2_… », avec ou sans .pdf),
    le titre la plus longue des autres cellules."""
    texts = [c for c in row['cells'] if c] + [l for l, h in row['links'] if l]
    name = next((t.split()[0] for t in texts if re.match(r'[A-Z]{2}[_-][A-Za-z0-9_.-]+', t)), '')
    title = max((c for c in row['cells'] if c and c.split()[0] != name), key=len, default='')
    return name, title[:100]


def alt_text(rec):
    """Fin de ligne du relevé : les mots-clés français qui ont répondu (vide si aucun)."""
    hits = {k: v for k, v in (rec.get('alt_keys') or {}).items() if v}
    return f' | alt {hits}' if hits else ''


def survey_state(lib, st, cache, say):
    """Relevé d'UN État (voir `survey`) ; rend sa fiche."""
    rec = {'state': st}
    # libellé de l'option d'autorité choisie (la clé 'XX' d'un État dont les fichiers portent un autre préfixe : le libellé dit de quelle autorité il s'agit, rien n'est deviné)
    rec['label'] = next((l.strip() for v, l in lib.opts.get('authority', []) if v == st or l.strip() == st or l.strip().endswith(f'({st})')), None)
    if not lib.authority(st):
        rec['error'] = 'autorité non proposée'
        say(f'{st}: autorité non proposée')
        return rec
    lib.choose('part', 'AD')
    lib.choose('type', 'AIP')
    rec['aip_ad'] = lib.search()['count']
    lib.choose('type', 'Charts')
    rec['charts_ad'] = lib.search()['count']
    rows_for = {}
    for k, kw in SURVEY_KEYS.items():
        r = lib.search(heading=kw)
        rec[k] = r['count']
        rows_for[k] = r['rows']
        rec['sample_' + k] = [row_summary(x) for x in r['rows'][:3]]
    pick = next(((k, rows_for[k][0]) for k in ('CODING', 'STAR', 'SID') if rows_for[k]), None)
    if not any(rec[k] for k in SURVEY_KEYS) and rec['charts_ad'] > 0:
        # vocabulaire français : on compte chaque mot-clé de ALT_KEYS ; le premier qui répond fournit l'échantillon (et le document à lire si rien d'autre n'a été trouvé)
        alt_rows = {kw: lib.search(heading=kw) for kw in ALT_KEYS}
        rec['alt_keys'] = {kw: r['count'] for kw, r in alt_rows.items()}
        first = next((kw for kw in ALT_KEYS if alt_rows[kw]['rows']), None)
        if first:
            rec['sample_alt'] = [row_summary(x) for x in alt_rows[first]['rows'][:3]]
            if not pick:
                pick = (first, alt_rows[first]['rows'][0])
    rec['sample_any'] = [row_summary(x) for x in lib.search(name='AD_2_')['rows'][:5]]     # vocabulaire de l'État, même quand aucun mot-clé ne répond
    if pick:
        name, title = row_summary(pick[1])
        raw = lib.fetch(pick[1])
        if raw:
            f = cache / (re.sub(r'[^A-Za-z0-9._-]+', '_', name)[:80] or 'doc')
            f.write_bytes(raw)
            cls = classify_name(f)
            rec['document'] = {'from': pick[0], 'name': name, 'title': title, **cls, 'rows_head': safe_rows(f, cls.get('table_page') or 1)[:30]}   # rows_head: étudier la disposition sans retélécharger (survey.json local seulement)
        else:
            rec['document'] = {'from': pick[0], 'name': name, 'error': 'téléchargement impossible', 'row_cells': [c[:60] for c in pick[1]['cells']],
                               'row_links': [h[:80] for l, h in pick[1]['links']], 'row_buttons': len(pick[1]['buttons'])}
    d = rec.get('document') or {}
    say(f'{st}: AD {rec["aip_ad"]} | cartes {rec["charts_ad"]} | CODING {rec["CODING"]} SID {rec["SID"]} STAR {rec["STAR"]} IAP {rec["IAP"]} | doc: {d.get("name", "-")} -> {d.get("kind", d.get("error", "-"))} {d.get("layout") or ""} {d.get("row_cells", "")} {d.get("row_links", "")} {d.get("row_buttons", "")}' + alt_text(rec))
    return rec


def survey(lib, states, out, say=print):
    """Relevé par État : pour chaque autorité, le nombre de documents AD (AIP) et de cartes (Charts), le nombre de cartes dont le titre dit CODING / DEPARTURE / ARRIVAL / APPROACH,
    et UN document de tables de codage (sinon d'arrivée, de départ) téléchargé et classé (texte lisible, dessiné en vecteurs, image) avec sa disposition. Écrit survey.json et survey.txt."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    cache = Path(out) / 'cache'
    cache.mkdir(parents=True, exist_ok=True)
    res = []
    sec = lib.s.secrets      # le relevé est écrit nettoyé, comme le compte rendu (nom d'utilisateur et mot de passe, jetons)

    def keep(path, text):
        path.write_text(sanitize(text, sec), encoding='utf-8')
    for st in states:
        rec = {'state': st}
        try:
            rec = survey_state(lib, st, cache, say)
        except Exception as e:
            rec['error'] = f'{type(e).__name__}: {str(e)[:100]}'
            say(f'{st}: erreur {rec["error"]}')
        res.append(rec)
        keep(Path(out) / 'survey.json', json.dumps(res, ensure_ascii=False, indent=1))
    outdir = Path(out)
    keep(outdir / 'survey.json', json.dumps(res, ensure_ascii=False, indent=1))
    keep(outdir / 'survey.txt', '\n'.join(
        f'{r["state"]} | AD {r.get("aip_ad", "-")} | cartes {r.get("charts_ad", "-")} | CODING {r.get("CODING", "-")} SID {r.get("SID", "-")} STAR {r.get("STAR", "-")} IAP {r.get("IAP", "-")} | '
        f'{(r.get("document") or {}).get("name", "-")} {(r.get("document") or {}).get("kind", r.get("error", ""))} {(r.get("document") or {}).get("layout") or ""}' + alt_text(r) for r in res) + '\n')
    return res


def fetch_ad(lib, icao, out, say=print, manual_dir=None, step=None):
    """Récupère les documents de procédures d'UN terrain, à la demande : cartes (Charts) dont le titre dit CODING / DEPARTURE / ARRIVAL / APPROACH et nom contenant AD_2_<OACI>_ ;
    télécharge et lit les tables de codage (textes lisibles ; disposition inconnue ou dessinée en vecteurs signalée, jamais devinée ; un fichier d'interprétation manuelle
    <manual_dir>/<OACI>.json est ajouté s'il est là) ; écrit <out>/<OACI>.json (format publié) et la liste de tous les documents trouvés (adresses de cartes pour le lecteur PDF).
    `step(texte, fait, total, unité)` : l'avancement chiffré (le lanceur le donne au travail, d'où la page lit « 12/31 ») — les 4 recherches, les documents téléchargés, lus puis analysés
    (une lecture de PDF dure de 1 à 2 s : sans ces nombres, les trois minutes d'un terrain à 31 documents se passent sans rien montrer) ; `fait` est le nombre de pas déjà terminés quand le texte
    annonce le suivant."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import proc_pdf
    import proc_records
    step = step or (lambda *a: None)
    icao = icao_code(icao)
    if not lib.authority(icao[:2]):
        raise SystemExit(f'autorité {icao[:2]} non proposée par la bibliothèque')
    lib.choose('part', 'AD')
    found = {}
    lib.choose('type', 'Charts')
    for i, (k, kw) in enumerate(SURVEY_KEYS.items()):
        step(f'{icao}: recherche des documents {k}', i, len(SURVEY_KEYS), 'recherches')
        r = lib.search(name=f'AD_2_{icao}_', heading=kw, all_pages=True)
        say(f'{icao}: {k}: {r["count"]} document(s)' + (f' en {r["pages"]} pages' if r['pages'] > 1 else '')
            + (f' (ATTENTION : {r["warning"] or str(len(r["rows"])) + " seulement lus"})' if r['count'] > len(r['rows']) else ''))
        for row in r['rows']:
            name, title = row_summary(row)
            found.setdefault(name, {'name': name, 'title': title, 'kinds': [], 'row': row})['kinds'].append(k)
    cache = Path(out) / 'cache' / icao
    cache.mkdir(parents=True, exist_ok=True)
    pdfs = []
    # sans document « CODING » (ex. Arménie, Albanie), on télécharge les cartes SID / STAR / IAP : seules celles dont la disposition est connue seront lues, les autres signalées
    only_coding = any('CODING' in d['kinds'] for d in found.values())
    wanted = [(name, d) for name, d in sorted(found.items()) if 'CODING' in d['kinds'] or not only_coding]
    for i, (name, d) in enumerate(wanted):
        step(f'{icao}: téléchargement de {name}', i, len(wanted), 'documents')
        try:
            target = proc_pdf.safe_path(cache, name, SAFE_NAME)       # le nom vient du serveur : un simple nom de fichier, sous le dossier du terrain, sinon rien n'est téléchargé
        except ValueError:
            say(f'  {name[:80]!r}: nom refusé (pas un simple nom de fichier), ignoré')
            continue
        raw = lib.fetch(d['row'])
        say(f'  {name}: téléchargé' if raw else f'  {name}: téléchargement impossible')
        if raw:
            target.write_bytes(raw)
            pdfs.append(name)
    read = []

    def rows_of(name):
        step(f'{icao}: lecture de {name}', len(read), len(pdfs), 'documents')
        read.append(name)
        return safe_pages(cache / name)
    doc = proc_records.build_pdf_dir(icao, pdfs, rows_of, lib_cycle(out)) if pdfs else \
        {'schema': 1, 'icao': icao, 'cycle': lib_cycle(out), 'procedures': [], 'formats': [], 'warnings': ['aucun document de tables de codage trouvé']}
    kinds = {}                                       # le type d'un PDF se lit UNE fois par document (une lecture dans un processus à part), pas une fois par page
    n_files = len({f['file'] for f in doc['formats']})
    for fm in doc['formats']:
        if fm['file'] not in kinds:
            step(f'{icao}: analyse de {fm["file"]}', len(kinds), n_files, 'documents')
            kinds[fm['file']] = classify_name(cache / fm['file'])
        k = kinds[fm['file']]
        fm['pdf'] = k
        say(f'  {"OK " if fm["ok"] else "NON"} {fm["file"]} | {k.get("kind")} | {fm["layout"]} ' + ''.join(f'| {x}' for x in fm['problems']))
    step(f'{icao}: documents analysés', n_files, n_files, 'documents')
    ocr = ocr_pass(doc, pdfs, cache, icao, out, say)
    mf = Path(manual_dir) / f'{icao}.json' if manual_dir else None
    if mf and mf.is_file():
        man = json.loads(mf.read_text(encoding='utf-8'))
        have = {p['id'] for p in doc['procedures']}
        doc['procedures'] += [p for p in man.get('procedures', []) if p['id'] not in have]
        doc['warnings'].append(f'interprétation manuelle ajoutée: {mf.name}')
    doc['documents'] = [{'name': d['name'], 'title': d['title'], 'kinds': d['kinds']} for d in found.values()]
    (Path(out) / f'{icao}.json').write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    say(f'{icao}: {len(doc["procedures"])} procédure(s), {len(doc["documents"])} document(s) listé(s), {len(doc["warnings"])} avertissement(s)')
    # quel fichier contient quelles procédures, et la commande qui installe chacun (un fichier sans procédure n'est pas à installer : proc_manual le refuse)
    install = lambda f: f'python tools/proc_manual.py {f} --out <dépôt de données>/proc'
    text_file = Path(out) / f'{icao}.json'
    say(f'  {text_file.name} (tables de texte' + (' et interprétation manuelle' if mf and mf.is_file() else '') + f') : {len(doc["procedures"])} procédure(s)'
        + (f' ; à installer par {install(text_file)}' if doc['procedures'] else ' ; rien à installer'))
    if ocr is not None:
        ocr_file = Path(out) / f'{icao}.ocr.json'
        say(f'  {ocr_file.name} (pages lues par OCR) : {len(ocr["procedures"])} procédure(s)' + (f' ; à installer par {install(ocr_file)}' if ocr['procedures'] else ' ; rien à installer'))
    return doc


def ocr_pass(doc, pdfs, cache, icao, out, say=print):
    """Lecture par OCR des documents dont aucune page n'a de disposition connue ET que la lecture signale « dessinés en vecteurs ou image » (pas de couche de texte). Sans moteur
    d'OCR (tools/proc_ocr.py : pypdfium2 et Tesseract ou rapidocr-onnxruntime), le message d'installation est affiché et on continue. Avec un moteur, chaque document est lu page par
    page, les pages fusionnées dans <out>/<OACI>.ocr.json (que tools/proc_manual.py installe : il refait caps et distances) ; la console dit ce qui a été lu et ce que le contrôle de géométrie
    a marqué à vérifier. Rend le document OCR, ou None."""
    vect = [fm['file'] for fm in doc['formats'] if 'pages' in fm and any('vecteurs' in x for x in fm['problems'])]
    if not vect:
        return None
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import proc_ocr
    import proc_pdf
    import proc_records
    if not proc_ocr.backend():
        say(f'{icao}: {len(vect)} document(s) sans couche de texte, non lu(s) : ' + str(proc_ocr._missing()).replace('OCR manque : ', 'OCR absent, ') )
        return None
    merged = {'schema': 1, 'icao': icao, 'cycle': doc['cycle'], 'procedures': [], 'formats': [], 'warnings': [], 'notice': proc_records.ead_notice(icao)}
    have = set()
    for name in vect:
        try:
            # rendu et OCR dans un processus séparé, au plus OCR_TIMEOUT s par document (un PDF piégé ou démesuré ne bloque pas l'outil)
            d = proc_pdf.limited('read_document', cache / name, icao, doc['cycle'], module='proc_ocr', timeout=proc_pdf.OCR_TIMEOUT, file=name)
        except (SystemExit, Exception) as e:
            say(f'  {name}: OCR impossible : {str(e)[:150]}')
            continue
        dropped = [x for x in d['warnings'] if 'NON retenue' in x]
        read = [f for f in d['formats'] if f['layout']]
        doubtful = sum(1 for x in d['procedures'] if x.get('status') == 'doubt')
        say(f'  OCR {name}: {len(d["formats"])} page(s), {len(read)} de disposition reconnue ({", ".join(sorted({f["layout"] for f in read})) or "aucune"}), '
            f'{len(d["procedures"])} procédure(s) retenue(s), dont {doubtful} à vérifier (contrôle de géométrie, proc_geometry), {len(dropped)} table(s) écartée(s) par les comptes')
        merged['formats'] += d['formats']
        merged['warnings'] += d['warnings']
        for rec in d['procedures']:
            if rec['id'] not in have:
                have.add(rec['id'])
                merged['procedures'].append(rec)
    if not merged['formats']:
        return None
    dest = Path(out) / f'{icao}.ocr.json'
    dest.write_text(json.dumps(merged, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if merged['procedures']:
        say(f'{icao}: {len(merged["procedures"])} procédure(s) lue(s) par OCR dans {dest.name} ; à installer par python tools/proc_manual.py {dest} --out <dépôt de données>/proc (contrôle de caps et distances refait)')
    else:
        say(f'{icao}: aucune procédure retenue par OCR ({dest.name} écrit pour ses avertissements) : rien à installer depuis ce fichier')
    return merged


def safe_rows(path, page=1):
    """Lignes de la page `page` (à partir de 1 ; la meilleure page du relevé), ou [] si le fichier n'est pas un PDF lisible."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import proc_pdf
    try:
        _, pages = proc_pdf.pdf_some_pages(path, [page - 1])   # lu dans un processus séparé, au plus PDF_TIMEOUT s
        return pages[0] if pages else []
    except (SystemExit, Exception):
        return []


def safe_pages(path):
    """Lignes de TOUTES les pages (liste de pages), ou [] si le fichier n'est pas un PDF lisible (le terrain est alors signalé « disposition non reconnue », rien n'est deviné)."""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import proc_pdf
    try:
        return proc_pdf.pdf_pages(path)             # lu dans un processus séparé, au plus PDF_TIMEOUT s
    except (SystemExit, Exception):
        return []


def classify_name(path):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import proc_pdf
    try:
        return proc_pdf.pdf_kind(path)             # lu dans un processus séparé, au plus PDF_TIMEOUT s
    except (SystemExit, Exception) as e:
        return {'kind': 'erreur', 'error': str(e)[:80]}


def lib_cycle(out):
    """Cycle AIRAC en vigueur (date de début) d'après le calendrier de 28 jours (AIRAC 2401 = 2024-01-25)."""
    from datetime import date, timedelta
    ref, today = date(2024, 1, 25), date.today()
    return (ref + timedelta(days=28 * ((today - ref).days // 28))).isoformat()


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):              # console cp1252 : un caractère exotique ne doit pas faire échouer l'affichage
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='replace')
    ap =argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--user', default=os.environ.get('EAD_USER'))
    ap.add_argument('--out', default='ead_probe')
    ap.add_argument('--survey', default=None, help="relevé par État : « all » ou une liste de préfixes (EG,ED,LF…) ; écrit survey.json et survey.txt dans --out")
    ap.add_argument('--fetch', default=None, help='récupère les documents de procédures d\'UN terrain (code OACI) : tables de codage téléchargées et lues, liste des documents')
    ap.add_argument('--manual-dir', default=None, help='dossier d\'interprétations manuelles <OACI>.json ajoutées à --fetch')
    ap.add_argument('--delay', type=float, default=1.0, help='pause entre deux requêtes (relevé et récupération), en secondes')
    a = ap.parse_args(argv)
    if a.fetch:
        # EAD Basic : un terrain par appel, sur un geste de l'utilisateur ; jamais en masse (décision de l'utilisateur, EAD_BASIC.md § 1)
        if re.search(r'[,;\s]', a.fetch.strip()):
            raise SystemExit('--fetch : un seul terrain par appel (EAD Basic se lit terrain par terrain, à la demande ; jamais en masse)')
        a.fetch = icao_code(a.fetch)
    if a.survey or a.fetch:
        user = a.user or input('EAD Basic, nom d\'utilisateur: ').strip()
        password = os.environ.get('EAD_PASSWORD') or getpass.getpass('EAD Basic, mot de passe (non gardé): ')
        out = Path(a.out)
        out.mkdir(parents=True, exist_ok=True)
        lines = []

        def say(*x):
            t = sanitize(' '.join(str(i) for i in x), [user, password])
            lines.append(t)
            print(t)
        lib = EadLibrary(user, password, say, delay=a.delay)
        if not lib.open():
            raise SystemExit('bibliothèque non ouverte (voir ci-dessus)')
        if a.survey:
            states = [o[0] for o in lib.opts['authority']] if a.survey == 'all' else [x.strip().upper() for x in a.survey.split(',') if x.strip()]
            states = [x for x in states if re.fullmatch(r'[A-Z]{2}', x)]
            survey(lib, states, out, say)
        else:
            fetch_ad(lib, a.fetch, out, say, a.manual_dir)
        (out / 'report.txt').write_text('\n'.join(lines) + '\n', encoding='utf-8')
        return
    raise SystemExit('rien à faire: ajouter --survey ou --fetch (la sonde est tools/ead_probe.py)')


if __name__ == '__main__':
    main()
