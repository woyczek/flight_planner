"""Schémas du tutoriel d'installation (SVG, français et anglais) : échanges de la suite avec les services extérieurs, et
identifiants (où on les saisit, où ils restent, vers qui ils partent). Relancer après une modification :
    python docs/tutorial/build_diagrams.py
Sources des faits : relevé du code (lanceur tools/launch.py, pages shared/*.js) — voir docs/tutorial/installation.*.md."""
import os
from xml.sax.saxutils import escape

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'img')
FONT = "font-family='Segoe UI, Helvetica, Arial, sans-serif'"
C = {  # couleurs : poste, lanceur, données, services par famille, flèches
    'pc': '#eef3f8', 'pcline': '#5b6b7c', 'browser': '#dbeafe', 'launch': '#fde68a', 'disk': '#dcfce7',
    'sog': '#fee2e2', 'net': '#e0e7ff', 'aero': '#ccfbf1', 'misc': '#f3f4f6', 'read': '#2563eb', 'send': '#dc2626',
    'both': '#7c3aed', 'manual': '#6b7280', 'ink': '#111827', 'sub': '#4b5563'
}

T = {
    'fr': {
        'title': 'Ce que la suite échange, et avec qui',
        'pc': 'Votre ordinateur',
        'browser': 'Navigateur (Chrome, Edge)', 'browser2': 'pages de la suite · profil et réglages (localStorage)',
        'browser3': 'dossiers autorisés (lecture et écriture directes)',
        'launch': 'Lanceur (lancer.cmd)', 'launch2': 'serveur local http://127.0.0.1:8000',
        'launch3': 'secrets/ : clé et client IVAO', 'launch4': 'git : données du SOG',
        'disk': "Dossier de l'application", 'disk2': 'code de la suite', 'disk3': 'data/ : missions, ODV, CR,',
        'disk4': 'affectations, dispos · data/sia/',
        'dl': 'Téléchargements', 'dl2': 'ZIP du SIA, de NATS (à la main)',
        'g_browser': 'appelés par le navigateur', 'g_launch': 'appelés par le lanceur',
        'legend_read': 'lu (téléchargé)', 'legend_send': 'envoyé', 'legend_both': 'dans les deux sens',
        'legend_manual': 'à la main', 'none': 'sans identifiant',
        's': [
            ('net', 'b', 'read', 'IVAO, VATSIM — données publiques', 'trafic en ligne, plans de vol, METAR', 'sans identifiant (VID / CID comparés sur le poste)'),
            ('misc', 'b', 'read', 'SimBrief', 'dernier plan de vol (OFP), appareils', "nom d'utilisateur SimBrief"),
            ('misc', 'b', 'read', 'Cartes, relief, sommets', 'OpenStreetMap, AWS Terrain, Overpass', 'sans identifiant (zone affichée envoyée)'),
            ('misc', 'b', 'read', 'Météo (Open-Meteo)', 'prévision et archive au point de la mission', 'sans identifiant (position, date)'),
            ('sog', 'b', 'send', 'Webservice du SOG (envoi des CR)', 'compte rendu de mission, en JSON', 'clé du webservice (Centre) — facultatif'),
            ('misc', 'b', 'read', 'Dépôt de la suite (framagit)', 'contrôle des mises à jour', 'sans identifiant'),
            ('net', 'l', 'read', 'IVAO — API', 'activations de zones, NOTAM, sessions ATC', "clé d'API IVAO (du groupe)"),
            ('net', 'l', 'read', 'VATSIM — réservations ATC', 'sessions ATC réservées', 'sans identifiant'),
            ('sog', 'l', 'read', 'Site du SOG', 'pages Flotte et Journal des vols, 1 fois par jour', 'sans connexion (mot de passe : INOP)'),
            ('sog', 'l', 'both', 'Dépôt git des données du SOG', 'missions, ODV, affectations, CR, dispos', 'clé SSH ou jeton (gestionnaire de Git)'),
            ('aero', 'l', 'read', 'Sources aéronautiques', 'openAIP, FAA, ENAIRE, AIP militaire UK, NAV CANADA', 'sans identifiant'),
            ('aero', 'd', 'manual', 'SIA, NATS', 'ZIP téléchargé à la main, repris par le lanceur', 'compte SIA gratuit · inscription NATS'),
        ],
    },
    'en': {
        'title': 'What the suite exchanges, and with whom',
        'pc': 'Your computer',
        'browser': 'Browser (Chrome, Edge)', 'browser2': 'suite pages · profile and settings (localStorage)',
        'browser3': 'authorised folders (direct read and write)',
        'launch': 'Launcher (lancer.cmd)', 'launch2': 'local server http://127.0.0.1:8000',
        'launch3': 'secrets/: IVAO key and client', 'launch4': 'git: SOG data',
        'disk': 'Application folder', 'disk2': 'suite code', 'disk3': 'data/: missions, ODV, reports,',
        'disk4': 'assignments, availability · data/sia/',
        'dl': 'Downloads', 'dl2': 'SIA and NATS ZIPs (by hand)',
        'g_browser': 'called by the browser', 'g_launch': 'called by the launcher',
        'legend_read': 'read (downloaded)', 'legend_send': 'sent', 'legend_both': 'both ways',
        'legend_manual': 'by hand', 'none': 'no credential',
        's': [
            ('net', 'b', 'read', 'IVAO, VATSIM — public data', 'online traffic, flight plans, METAR', 'no credential (VID / CID matched on the computer)'),
            ('misc', 'b', 'read', 'SimBrief', 'latest flight plan (OFP), airframes', 'SimBrief user name'),
            ('misc', 'b', 'read', 'Maps, terrain, peaks', 'OpenStreetMap, AWS Terrain, Overpass', 'no credential (visible area sent)'),
            ('misc', 'b', 'read', 'Weather (Open-Meteo)', 'forecast and archive at the mission point', 'no credential (position, date)'),
            ('sog', 'b', 'send', 'SOG web service (report sending)', 'mission report, as JSON', 'web service key (Centre) — optional'),
            ('misc', 'b', 'read', 'Suite repository (framagit)', 'update check', 'no credential'),
            ('net', 'l', 'read', 'IVAO — API', 'zone activations, NOTAMs, ATC sessions', 'IVAO API key (group-wide)'),
            ('net', 'l', 'read', 'VATSIM — ATC bookings', 'booked ATC sessions', 'no credential'),
            ('sog', 'l', 'read', 'SOG website', 'Fleet and Flight log pages, once a day', 'no login (password: INOP)'),
            ('sog', 'l', 'both', 'SOG data git repository', 'missions, ODV, assignments, reports, availability', 'SSH key or token (Git credential manager)'),
            ('aero', 'l', 'read', 'Aeronautical sources', 'openAIP, FAA, ENAIRE, UK military AIP, NAV CANADA', 'no credential'),
            ('aero', 'd', 'manual', 'SIA, NATS', 'ZIP downloaded by hand, taken by the launcher', 'free SIA account · NATS registration'),
        ],
    },
}


def text(x, y, s, size=13, weight='normal', fill=None, anchor='start', italic=False):
    return (f"<text x='{x}' y='{y}' {FONT} font-size='{size}' font-weight='{weight}' fill='{fill or C['ink']}' "
            f"text-anchor='{anchor}'{' font-style=\"italic\"' if italic else ''}>{escape(s)}</text>")


def box(x, y, w, h, fill, stroke='#94a3b8', r=8, dash=False):
    return (f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='{r}' fill='{fill}' stroke='{stroke}' stroke-width='1.3'"
            f"{' stroke-dasharray=\"6 4\"' if dash else ''}/>")


def arrow(x1, y1, x2, y2, kind):
    col = C[kind]
    ends = {'read': " marker-start='url(#a-read)'", 'send': " marker-end='url(#a-send)'",
            'both': " marker-start='url(#a-both-s)' marker-end='url(#a-both)'", 'manual': " marker-end='url(#a-manual)'"}[kind]
    mid = (x1 + x2) / 2
    dash = " stroke-dasharray='5 4'" if kind == 'manual' else ''
    return (f"<path d='M{x1},{y1} C{mid},{y1} {mid},{y2} {x2},{y2}' fill='none' stroke='{col}' stroke-width='2'{dash}{ends}/>")


def markers():
    out = ['<defs>']
    for k in ('read', 'send', 'both', 'manual'):
        out.append(f"<marker id='a-{k}' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='7' markerHeight='7' orient='auto-start-reverse'>"
                   f"<path d='M0,0 L10,5 L0,10 z' fill='{C[k]}'/></marker>")
    out.append(f"<marker id='a-both-s' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='7' markerHeight='7' orient='auto-start-reverse'>"
               f"<path d='M0,0 L10,5 L0,10 z' fill='{C['both']}'/></marker>")
    out.append('</defs>')
    return ''.join(out)


def architecture(lang):
    L = T[lang]
    W, H = 1240, 930
    o = [f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {W} {H}' width='{W}' height='{H}' role='img' aria-label='{escape(L['title'])}'>",
         markers(), f"<rect width='{W}' height='{H}' fill='#ffffff'/>", text(24, 36, L['title'], 22, 'bold')]
    # poste
    o.append(box(20, 60, 560, 600, C['pc'], C['pcline'], 14))
    o.append(text(40, 88, L['pc'], 16, 'bold', C['pcline']))
    # navigateur
    o += [box(40, 104, 520, 170, C['browser']), text(58, 132, L['browser'], 16, 'bold'), text(58, 156, L['browser2'], 12.5, fill=C['sub']),
          text(58, 176, L['browser3'], 12.5, fill=C['sub'])]
    # lanceur
    o += [box(300, 330, 260, 190, C['launch']), text(316, 358, L['launch'], 16, 'bold'), text(316, 382, L['launch2'], 12.5, fill=C['sub']),
          text(316, 404, L['launch3'], 12.5, fill=C['sub']), text(316, 426, L['launch4'], 12.5, fill=C['sub'])]
    # dossier
    o += [box(40, 330, 240, 190, C['disk']), text(56, 358, L['disk'], 16, 'bold'), text(56, 382, L['disk2'], 12.5, fill=C['sub']),
          text(56, 404, L['disk3'], 12.5, fill=C['sub']), text(56, 424, L['disk4'], 12.5, fill=C['sub'])]
    # téléchargements
    o += [box(300, 560, 260, 74, '#ffffff', '#9ca3af', 8, True), text(316, 588, L['dl'], 14, 'bold'), text(316, 610, L['dl2'], 12, fill=C['sub'])]
    # liens internes
    o += [arrow(430, 274, 430, 330, 'both'), arrow(160, 274, 160, 330, 'both'), arrow(300, 425, 280, 425, 'both'),
          arrow(430, 520, 430, 560, 'read')]
    # services
    x0, wbox, hb, gap = 680, 540, 56, 10
    y = 70
    o.append(text(x0, y - 8, L['g_browser'], 13, 'bold', C['read']))
    for fam, who, kind, name, what, cred in L['s']:
        if who == 'l' and not any(s[1] == 'l' for s in L['s'][:L['s'].index((fam, who, kind, name, what, cred))]):
            y += 22
            o.append(text(x0, y - 8, L['g_launch'], 13, 'bold', '#a16207'))
        if who == 'd':
            y += 12
        o.append(box(x0, y, wbox, hb, C[fam], dash=(kind == 'manual')))
        o += [text(x0 + 14, y + 20, name, 14, 'bold'), text(x0 + 14, y + 37, what, 12, fill=C['sub']),
              text(x0 + 14, y + 51, cred, 11, fill=C['sub'], italic=True)]
        ym = y + hb / 2
        if who == 'b':
            o.append(arrow(560, 120 + 12 * L['s'].index((fam, who, kind, name, what, cred)), x0, ym, kind))
        elif who == 'l':
            o.append(arrow(560, 440 + 14 * (L['s'].index((fam, who, kind, name, what, cred)) - 6), x0, ym, kind))
        else:
            o.append(arrow(x0, ym, 560, 597, 'manual'))
        y += hb + gap
    # légende
    ly = H - 34
    lx = 24
    for k in ('read', 'send', 'both', 'manual'):
        o.append(f"<line x1='{lx}' y1='{ly}' x2='{lx + 40}' y2='{ly}' stroke='{C[k]}' stroke-width='2.5'"
                 f"{' stroke-dasharray=\"5 4\"' if k == 'manual' else ''}/>")
        o.append(text(lx + 48, ly + 4, L['legend_' + k], 13))
        lx += 230
    o.append('</svg>')
    return '\n'.join(o)


CRED = {
    'fr': {
        'title': 'Identifiants : où on les saisit, où ils restent, vers qui ils partent',
        'cols': ['Identifiant', 'Saisi dans', 'Reste sur votre ordinateur, dans…', 'Part vers'],
        'never': 'nulle part', 'rows': [
            ('Mot de passe du Centre', 'Premier lancement › Centre', 'le navigateur (empreinte comparée sur place)', None),
            ('Mot de passe du compte de la suite', 'Mon profil › Connexion', 'data/utilisateurs (empreinte PBKDF2 seulement)', '!en clair : nulle part (empreinte : dépôt des données)'),
            ('Mot de passe du site du SOG', '— (INOP)', 'plus gardé : hors service', None),
            ("Clé d'API IVAO (groupe)", 'Premier lancement › Compagnie', 'le lanceur : secrets/ivao.json (hors git)', 'api.ivao.aero, seulement'),
            ('Client IVAO : ID et secret (personnel)', 'Mon profil › IVAO', 'le lanceur : secrets/users/<TRI>.json', '!rien : pas encore utilisé'),
            ('Accès au dépôt git du SOG', 'Premier lancement › Données', 'gestionnaire de Git (si « mémoriser ») ou clé SSH', 'le serveur du dépôt, seulement'),
            ('Clé du webservice du SOG', 'Paramètres › Centre › Envoi des CR', 'le navigateur (hors sauvegardes)', 'le webservice du SOG, seulement'),
            ('Trigramme, VID IVAO, CID VATSIM, SimBrief', 'Premier lancement › Profil', 'le navigateur (profil pilote)', 'SimBrief, CR envoyés (identifiants publics)'),
        ]},
    'en': {
        'title': 'Credentials: where you enter them, where they stay, where they go',
        'cols': ['Credential', 'Entered in', 'Stays on your computer, in…', 'Goes to'],
        'never': 'nowhere', 'rows': [
            ('Centre password', 'First run › Centre', 'the browser (hash compared locally)', None),
            ('Suite account password', 'My profile › Sign-in', 'data/utilisateurs (PBKDF2 hash only)', '!in clear: nowhere (hash: data repository)'),
            ('SOG website password', '— (INOP)', 'no longer kept: out of service', None),
            ('IVAO API key (group)', 'First run › Airline', 'the launcher: secrets/ivao.json (not in git)', 'api.ivao.aero only'),
            ('IVAO client: ID and secret (personal)', 'My profile › IVAO', 'the launcher: secrets/users/<TRI>.json', '!nowhere: not used yet'),
            ('SOG git repository access', 'First run › Data', 'Git credential manager (if “remember”) or SSH key', 'the repository server only'),
            ('SOG web service key', 'Settings › Centre › Report sending', 'the browser (not in backups)', 'the SOG web service only'),
            ('Trigram, IVAO VID, VATSIM CID, SimBrief', 'First run › Profile', 'the browser (pilot profile)', 'SimBrief, sent reports (public IDs)'),
        ]},
}


def credentials(lang):
    L = CRED[lang]
    W = 1240
    cols = [24, 300, 540, 920]
    rh = 54
    H = 120 + rh * len(L['rows']) + 30
    o = [f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {W} {H}' width='{W}' height='{H}' role='img' aria-label='{escape(L['title'])}'>",
         markers(), f"<rect width='{W}' height='{H}' fill='#ffffff'/>", text(24, 36, L['title'], 22, 'bold')]
    for x, c in zip(cols, L['cols']):
        o.append(text(x + 6, 82, c, 14, 'bold', C['sub']))
    y = 96
    for i, (name, where, stays, goes) in enumerate(L['rows']):
        o.append(box(20, y, W - 40, rh - 8, '#f8fafc' if i % 2 else '#ffffff', '#e5e7eb', 6))
        o.append(text(cols[0] + 6, y + 28, name, 13.5, 'bold'))
        o.append(text(cols[1] + 6, y + 28, where, 12.5, fill=C['sub']))
        o.append(box(cols[2], y + 8, 350, rh - 24, C['launch'] if 'secrets' in stays else C['disk'] if 'data/' in stays or 'Git' in stays else C['browser'], '#cbd5e1', 6))
        o.append(text(cols[2] + 10, y + 28, stays, 12.5))
        if goes and not goes.startswith('!'):
            o.append(arrow(cols[2] + 352, y + 23, cols[3], y + 23, 'send'))
            o.append(text(cols[3] + 8, y + 28, goes, 12.5, 'bold', C['send']))
        else:
            o.append(f"<circle cx='{cols[3] - 16}' cy='{y + 23}' r='9' fill='none' stroke='#16a34a' stroke-width='2'/>"
                     f"<line x1='{cols[3] - 22}' y1='{y + 29}' x2='{cols[3] - 10}' y2='{y + 17}' stroke='#16a34a' stroke-width='2'/>")
            o.append(text(cols[3] + 8, y + 28, goes[1:] if goes else L['never'], 12.5, 'bold', '#16a34a'))
        y += rh
    o.append('</svg>')
    return '\n'.join(o)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for lang in ('fr', 'en'):
        for name, fn in (('schema_echanges', architecture), ('schema_identifiants', credentials)):
            p = os.path.join(OUT, f'{name}.{lang}.svg')
            open(p, 'w', encoding='utf-8', newline='\n').write(fn(lang))
            print(p)
