"""Politique de sécurité du contenu (CSP) de la suite, commune au lanceur (en-tête, tools/launch.py) et au site sans
lanceur (balise meta posée dans chaque page par tools/build_pages.py : GitHub Pages n'envoie pas d'en-têtes ; l'appli
iOS reprend ce site). Les pages ne contactent (fetch, cartes, workers) que la suite et les services prévus : un script
injecté ne peut plus envoyer les données ailleurs par requête. Scripts : ceux de la suite, en ligne (pages actuelles),
pdf.js et acorn épinglés. Images, liens et navigation : non restreints (tuiles, liens d'aide) — fuite résiduelle
documentée (docs/technique/AUDIT_SECURITE_2026-10-07.md, M2 ; APPLI_AUTONOME_SECURITE.md, S1).
"""
import re
import urllib.parse

CONNECT = [
    # fonds de carte, relief, points OSM (map_planner, map_parser, sia_base, profil vertical)
    'https://tiles.openfreemap.org', 'https://tiles.versatiles.org', 'https://vector.openstreetmap.org',
    'https://tile.openstreetmap.org', 'https://a.tile.opentopomap.org', 'https://b.tile.opentopomap.org',
    'https://c.tile.opentopomap.org', 'https://s3.amazonaws.com/elevation-tiles-prod/', 'https://overpass-api.de',
    # plans de vol, réseaux, météo
    'https://www.simbrief.com', 'https://dispatch.simbrief.com', 'https://api.ivao.aero', 'https://data.vatsim.net',
    # dépôt des données par l'API GitHub (accès aux données, shared/github_data.js)
    'https://api.github.com',
    'https://metar.vatsim.net', 'https://api.open-meteo.com', 'https://archive-api.open-meteo.com',
    # base mondiale des aérodromes (sources.airports) et purge de son cache
    'https://cdn.jsdelivr.net', 'https://purge.jsdelivr.net',
]
SCRIPTS = ['https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/', 'https://cdnjs.cloudflare.com/ajax/libs/acorn/']
ORIGIN_RE = re.compile(r'^(?:https://[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d{1,5})?|http://(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?)$')


def site_origin(url):
    """Origine (schéma, hôte, port) d'une adresse https (ou http de cette machine) ; '' sinon."""
    try:
        u = urllib.parse.urlsplit(str(url or '').strip())
        o = f'{u.scheme}://{u.hostname}' + (f':{u.port}' if u.port else '') if u.scheme and u.hostname else ''
    except ValueError:
        return ''
    return o.lower() if ORIGIN_RE.match(o.lower()) else ''


def config_sites(config_text):
    """Origines des adresses https du texte de la configuration (config/repository_tree : dépôt de la suite, sources),
    réglées par le code, pas par la page."""
    return sorted({site_origin(u) for u in re.findall(r'https://[^\s"\'`]+', config_text or '')} - {''})


def value(extra=(), meta=False):
    """Valeur de la politique : connect-src (liste fixe, puis extra : configuration, sites autorisés) ; meta : sans
    frame-ancestors (ignoré dans une balise meta ; le site sans lanceur n'a pas d'en-tête pour l'imposer)."""
    connect = ' '.join(dict.fromkeys(["'self'", *CONNECT, *extra]))
    return (f"connect-src {connect}; worker-src 'self' blob:; script-src 'self' 'unsafe-inline' {' '.join(SCRIPTS)}; "
            "object-src 'none'; base-uri 'self'; form-action 'self'" + ('' if meta else "; frame-ancestors 'self'"))
