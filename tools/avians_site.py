"""La prise de l'eAIP d'Islande sur le site d'Avians (SOG-0368) : l'édition en vigueur LUE sur la page des éditions, le sommaire lu pour la liste des pages de routes, l'ENR 4.4, puis les pages de routes, UNE requête à la fois.

Règles : jamais une adresse construite (l'édition est un lien de la page des éditions ; les noms des pages de routes sont ceux du sommaire, par un motif strict) ; une pause entre deux requêtes ; une taille bornée par page ; arrêt au PREMIER refus de l'hôte (429, 403, 5xx, délai, réseau) :
jamais contourné ; une page absente (404, 410) est dite avec son adresse et les autres sont gardées ; le compte « n pages lues sur m » est écrit dans le fichier et dans l'entrée. Le fichier d'une édition COMPLÈTE déjà là n'est pas relu (une seule requête : la page des éditions).
`get(url, limit)` (celui du lanceur : son agent, son console) est donné par l'appelant : ce module ne touche pas au réseau seul. Bibliothèque standard seulement."""
import json
import os
import time
import urllib.error

import avians_eaip as A
import eaip_annexe15 as core

EDITIONS_MAX = 1 * 1024 * 1024
MENU_MAX = 16 * 1024 * 1024           # le sommaire fait 5 Mo
PAUSE_S = 0.5
HAVE_MAX = 16 * 1024 * 1024


def refusal(e):
    """Une erreur de lecture est-elle un REFUS de l'hôte (à respecter : 403, 429, 5xx, délai, réseau) plutôt qu'une page absente (404, 410) ?"""
    return not (isinstance(e, urllib.error.HTTPError) and e.code in (404, 410))


def from_site(get, folder, today=None, sleep=time.sleep):
    """Prend l'édition en vigueur : ([entrée], [erreurs]). Rien n'est écrit par un échec avant l'ENR 4.4 ; un refus de l'hôte au milieu des pages de routes garde celles déjà lues (`pages.read` < `pages.of` : la prochaine prise les relit toutes). Le GeoJSON est rendu en octets dans
    l'entrée (`body`) : l'appelant l'écrit."""
    label = A.SOURCE.split(' (')[0]
    tried = A.EDITIONS_URL
    try:
        ed = A.pick_edition(A.editions(get(tried, EDITIONS_MAX).decode('utf-8', 'replace')), today)
        if not ed:
            return [], [f'{label} : aucune édition en vigueur lue sur {tried} (page changée ?) ; rien n’a été écrit']
        issue, base = ed
        name = core.out_name('avians_is_enr', issue)
        have = os.path.join(folder, name)
        try:
            if os.path.getsize(have) > HAVE_MAX:
                raise ValueError('trop gros')      # le compte de pages d'un fichier de l'utilisateur est lu sous un plafond
            with open(have, encoding='utf-8') as f:
                pg = (json.load(f) or {}).get('pages') or {}
            if pg.get('read') is not None and pg.get('read') == pg.get('of'):
                return [{'name': name, 'bytes': os.path.getsize(have), 'edition': issue, 'unchanged': True, 'pages': pg}], []
        except (OSError, ValueError, AttributeError):
            pass
        tried = A.page_url(base, A.MENU_PAGE)
        names = A.route_names(get(tried, MENU_MAX).decode('utf-8', 'replace'))
        if not names:
            return [], [f'{label} : aucune page de route (ENR 3.2) dans le sommaire {tried} (page changée ?) ; rien n’a été écrit']
        tried = A.page_url(base, A.POINTS_PAGE)
        sleep(PAUSE_S)
        points_page = get(tried, A.PAGE_MAX).decode('utf-8', 'replace')
        if len(A.parse_points(points_page)) < A.MIN_POINTS:
            return [], [f'{label} : la page {tried} n’est pas l’ENR 4.4 attendue ; rien n’a été écrit']
    except (OSError, ValueError) as e:
        return [], [f'{label} : {e} (adresse essayée : {tried}) ; rien n’a été écrit']
    pages, missing, stopped = [], [], None
    for n in names:
        url = A.page_url(base, n)
        sleep(PAUSE_S)
        try:
            pages.append(get(url, A.PAGE_MAX).decode('utf-8', 'replace'))
        except (OSError, ValueError) as e:
            if refusal(e):
                stopped = f'{url} : {e}'
                break
            missing.append(url)
    info = {'read': len(pages), 'of': len(names), **({'missing': missing[:5]} if missing else {})}
    if not pages:
        return [], [f'{label} : aucune page de route lue sur {len(names)}' + (f' ; l’hôte a refusé : {stopped}' if stopped else '') + ' ; rien n’a été écrit']
    try:
        g, n, m = A.convert(points_page, pages, issue, info)
    except ValueError as e:
        return [], [f'{label} : {e}']
    entry = {'name': name, 'edition': issue, 'features': n + m, 'pages': info, 'body': json.dumps(g, ensure_ascii=False).encode('utf-8')}
    if stopped:
        entry['stopped'] = stopped[:240]
    if g.get('skipped'):
        entry['skipped'] = g['skipped']
    return [entry], []
