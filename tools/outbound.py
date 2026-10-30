"""Requêtes sortantes du lanceur et de ses travaux (V3, 30 oct. 2026).

- Un seul User-Agent, nommé : « SOG-launcher/<version> (+adresse du projet) ». Certains services refusent celui de urllib
  (« Python-urllib/3.x ») : la découverte OpenID d'IVAO, derrière Cloudflare, répondait 403.
- Une ligne de console pour chaque échec : le service, l'hôte, le chemin et le code (« HTTP 403 ») ou la nature de l'erreur
  réseau ; jamais les paramètres de l'adresse, un en-tête, un corps ni un jeton.

Les ouvreurs du lanceur se construisent ici (opener) ; urlopen remplace urllib.request.urlopen. Bibliothèque standard seulement.
"""
import os
import re
import socket
import sys
import urllib.error
import urllib.parse
import urllib.request

PROJECT = 'https://framagit.org/asr/flight_planner'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _version():
    """La version de la suite (config/repository_tree, release.version) ; « 0 » si elle est illisible."""
    for p in (os.path.join(ROOT, 'config', 'repository_tree'), os.path.join(ROOT, 'repository_tree')):
        try:
            with open(p, encoding='utf-8') as f:
                m = re.search(r'release\s*:\s*\{[^}]*?version\s*:\s*"([0-9A-Za-z.+-]{1,40})"', f.read())
            if m:
                return m.group(1)
        except OSError:
            pass
    return '0'


VERSION = _version()
UA = f'SOG-launcher/{VERSION} (+{PROJECT})'


def where(url):
    """« hôte/chemin » d'une adresse, sans identifiants, requête ni ancre (ce qui peut porter un jeton) ; chaque segment du
    chemin coupé à son premier « ; » (EAD Basic y met « ;jsessionid=… », que urlsplit laisse dans le chemin) ; 160 signes au plus."""
    try:
        u = urllib.parse.urlsplit(str(url))
        path = '/'.join(s.split(';')[0] for s in (u.path or '/').split('/'))
        return f'{u.hostname or "?"}{path}'[:160]
    except ValueError:
        return '?'


def reason(e):
    """« HTTP 403 » pour une réponse d'erreur ; sinon la nature de l'échec réseau (« URLError (timeout) », « TimeoutError »)."""
    if isinstance(e, urllib.error.HTTPError):
        return f'HTTP {e.code}'
    if isinstance(e, urllib.error.URLError):
        r = e.reason
        return f'URLError ({type(r).__name__ if isinstance(r, BaseException) else str(r)[:60]})'
    return type(e).__name__


def log(url, e, what=''):
    """La ligne de console d'un échec sortant (jamais un secret : where et reason seulement)."""
    print(f'[sortant] échec{" " + what if what else ""} : {where(url)} : {reason(e)}', file=sys.stdout, flush=True)


class SameHost(urllib.request.HTTPRedirectHandler):
    """Une redirection n'est suivie que vers le même hôte (et en https si l'adresse l'était) ; sinon une erreur : les contrôles
    faits sur une adresse (lue sur une page, calculée par un verbe) valent pour toute la requête, pas pour la première seulement."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        a, b = urllib.parse.urlsplit(req.full_url), urllib.parse.urlsplit(newurl)
        if b.hostname != a.hostname or (a.scheme == 'https' and b.scheme != 'https'):
            raise urllib.error.HTTPError(newurl, code, f'redirect to another host refused: {b.hostname}', headers, fp)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def opener(*handlers, what='', quiet=()):
    """Un ouvreur urllib qui pose UA (si la requête n'a pas le sien), ne suit une redirection que sur le même hôte (SameHost,
    sauf si un gestionnaire de redirection est donné : _NoRedirect d'OpenID et de GitLab, _RelayRedirect du relais, StayOnHost
    d'EAD) et journalise chaque échec (sauf les codes de quiet : une absence attendue, 404 d'une carte non publiée, que le
    travail dit lui-même)."""
    redirect = any(isinstance(h, type) and issubclass(h, urllib.request.HTTPRedirectHandler)
                   or isinstance(h, urllib.request.HTTPRedirectHandler) for h in handlers)
    op = urllib.request.build_opener(*handlers, *(() if redirect else (SameHost,)))
    op.addheaders = [('User-agent', UA)]
    raw = op.open

    def open_(req, data=None, timeout=socket._GLOBAL_DEFAULT_TIMEOUT):
        try:
            return raw(req, data, timeout)
        except urllib.error.HTTPError as e:
            if e.code not in quiet:
                log(getattr(req, 'full_url', req), e, what)
            raise
        except (OSError, ValueError) as e:
            log(getattr(req, 'full_url', req), e, what)
            raise
    op.open = open_
    return op


_DEFAULT = opener()
_QUIET = opener(quiet=(404, 410))


def urlopen(req, timeout=socket._GLOBAL_DEFAULT_TIMEOUT, absent_ok=False):
    """urllib.request.urlopen avec UA et le journal des échecs ; absent_ok : un 404 / 410 n'est pas écrit (absence attendue)."""
    return (_QUIET if absent_ok else _DEFAULT).open(req, timeout=timeout)
