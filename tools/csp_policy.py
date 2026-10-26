"""Politique de sécurité du contenu (CSP) de la suite, commune au lanceur (en-tête, tools/launch.py) et au site sans
lanceur (balise meta posée dans chaque page par tools/build_pages.py : GitHub Pages n'envoie pas d'en-têtes ; l'appli
iOS reprend ce site). Les pages ne contactent (fetch, cartes, workers) que la suite et les services prévus : un script
injecté ne peut plus envoyer les données ailleurs par requête. Scripts : ceux de la suite, en ligne (pages actuelles),
pdf.js et acorn épinglés. Images, liens et navigation : non restreints (tuiles, liens d'aide) — fuite résiduelle
documentée (docs/technique/AUDIT_SECURITE_2026-10-07.md, M2 ; APPLI_AUTONOME_SECURITE.md, S1).
"""
import os
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
    # TAF sans lanceur (appli Pilote V3, clé personnelle de l'appareil ajoutée par le cadre)
    'https://avwx.rest',
    # base mondiale des aérodromes (sources.airports) et purge de son cache
    'https://cdn.jsdelivr.net', 'https://purge.jsdelivr.net',
    # laboratoire des données (frame/aerodb/lab_sources.js, écran #datalab, TEMPORAIRE, 26 octobre 2026) : les hôtes des sources
    # du tableau 1.2 de docs/technique/V3_DONNEES_REGENERATION.md, pour que « Tester l'adresse » mesure le serveur (CORS) et non la
    # politique de la page. Une décision de sécurité par hôte (AUDIT_SECURITE_2026-10-07.md, M2) : à retirer avec le laboratoire
    # (ou à garder pour les seuls hôtes que l'appli Données retiendra, après les mesures).
    'https://www.sia.aviation-civile.gouv.fr', 'https://download.geonames.org', 'https://www.dircam.dsae.defense.gouv.fr',
    'https://www.aidu.mod.uk', 'https://www.navcanada.ca', 'https://s3.openaip.net', 'https://aip.enaire.es',
    'https://services6.arcgis.com', 'https://nats-uk.ead-it.com', 'https://nms.aim.faa.gov', 'https://aeronav.faa.gov',
    'https://nomads.ncep.noaa.gov',
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


# ---- V3 : hôtes publics qu'une bibliothèque d'un module appelle elle-même (meta.net, frame/SPEC.md § 3.2 : MapLibre et
# ses tuiles), jamais par ctx.net ni par le lanceur ; https seulement ; « hôte » ou « hôte/chemin » (préfixe de chemin)
NET_RE = re.compile(r'^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:/[A-Za-z0-9._~/-]*)?$')


def app_modules(root):
    """Identifiants des modules de l'appli V3 (APP.modules de frame/app.js) ; [] sans cadre."""
    try:
        with open(os.path.join(root, 'frame', 'app.js'), encoding='utf-8') as f:
            text = f.read()
    except OSError:
        return []
    m = re.search(r'const APP = \{(.*?)\n  \};', text, re.S)
    block = m.group(1) if m else ''
    i = block.find('modules:')
    return re.findall(r"\bid:\s*'([\w-]+)'", block[i:]) if i >= 0 else []


def module_files(root):
    """Points d'entrée (module.js) des modules de l'appli V3."""
    return [os.path.join(root, 'modules', m, 'module.js') for m in app_modules(root)]


def module_hosts(root):
    """Sources CSP des hôtes déclarés par meta.net des modules de l'appli (https://hôte ou https://hôte/chemin/), dans
    l'ordre ; une entrée qui n'est pas un hôte public écrit simplement est ignorée."""
    out = []
    for p in module_files(root):
        try:
            with open(p, encoding='utf-8') as f:
                text = f.read()
        except OSError:
            continue
        meta = re.search(r'export const meta = \{(.*?)\n\};', text, re.S)
        net = re.search(r'\bnet\s*:\s*\[([^\]]*)\]', meta.group(1)) if meta else None
        for a, b in re.findall(r"'([^']*)'|\"([^\"]*)\"", net.group(1) if net else ''):
            host = (a or b).strip().lower().removeprefix('https://')
            if not NET_RE.match(host) or host.split('/')[0] in ('localhost',) or re.fullmatch(r'[\d.]+', host.split('/')[0]):
                continue
            src = 'https://' + host if '/' not in host else 'https://' + host.rstrip('/') + '/'
            if src not in out:
                out.append(src)
    return out


def value(extra=(), meta=False):
    """Valeur de la politique : connect-src (liste fixe, puis extra : configuration, sites autorisés) ; meta : sans
    frame-ancestors (ignoré dans une balise meta ; le site sans lanceur n'a pas d'en-tête pour l'imposer)."""
    connect = ' '.join(dict.fromkeys(["'self'", *CONNECT, *extra]))
    return (f"connect-src {connect}; worker-src 'self' blob:; script-src 'self' 'unsafe-inline' {' '.join(SCRIPTS)}; "
            "object-src 'none'; base-uri 'self'; form-action 'self'" + ('' if meta else "; frame-ancestors 'self'"))
