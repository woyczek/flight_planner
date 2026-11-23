"""La table des gains d'une relecture ou d'une mise à jour d'un pays (SOG-0568) — bibliothèque standard seulement.

Un pays « à jour » peut avoir été lu par un lecteur plus ancien que celui de la suite (`parserVersion` de son meta.json < la version courante) : ses
données SERVENT, il n'est jamais « périmé » pour autant. L'écran dit ce qu'une RELECTURE (le lecteur actuel relit les sources déjà sur le poste : aucun
téléchargement, aucun hôte) ou une MISE À JOUR (une pièce jamais lue : une page à télécharger) lui apporterait, en mots du pilote. Cette table est la
SEULE source de ces phrases.

LA RÈGLE DURABLE (décision de l'ergonome, 23 nov. 2026) — toute évolution du lecteur qui change les données compilées déclare son gain ICI :
  · une ligne par évolution : { id, since (la version du lecteur qui l'apporte : VERSION de shared/sia_base.js), kind, portée, label }
  · pas de montée de version du lecteur sans sa ligne (le cas K523 compare la dernière version de la table à VERSION et PARSER_VERSION) ;
  · une version sans effet pour le pilote a sa ligne marquée `nogain` (elle ne fait PAS passer un pays en « relecture possible ») ;
  · `kind` : 'absent' (une pièce qui manque aujourd'hui) ou 'better' (une lecture mieux faite) — jamais autre chose ;
  · la portée : `zones` (les pays nommés) ou `sources` (les pays dont le poste détient un fichier de l'une de ces sources) ; sans l'un ni l'autre, tous ;
  · `label` : UNE PHRASE ENTIÈRE par langue [fr, en, de, es], écrite ici, sans accord automatique ; elle ne redit ni le pays ni la source ;
  · une ligne `piece` (hors version) : un fichier que le code attend et que le pays n'a pas lu (route/levels_fr.json) ; son gain est une MISE À JOUR
    (une page à télécharger : `source` dit laquelle), jamais une relecture.
L'écran compare la version qui a lu le pays à la version courante et n'affiche que les gains qui manquent (frame/aerodb/INTEGRATION.md « The gains of a
country »).
"""

GAINS = (
    {'id': 'v29-fr-usual-names', 'since': 29, 'kind': 'absent', 'zones': ('fr',),
     'label': ['noms usuels des zones R, D et P (absents aujourd’hui)',
               'usual names of the R, D and P areas (not there today)',
               'Gebrauchsnamen der R-, D- und P-Gebiete (heute nicht vorhanden)',
               'nombres de uso de las zonas R, D y P (hoy ausentes)']},
    {'id': 'v29-us-ca-hours', 'since': 29, 'kind': 'absent', 'zones': ('us', 'ca'),
     'label': ['horaires et remarques des zones (absents aujourd’hui)',
               'hours and remarks of the areas (not there today)',
               'Zeiten und Hinweise der Gebiete (heute nicht vorhanden)',
               'horarios y observaciones de las zonas (hoy ausentes)']},
    {'id': 'v29-openaip-hours', 'since': 29, 'kind': 'better', 'sources': ('openaip',),
     'label': ['horaires des zones mieux lus',
               'hours of the areas better read',
               'Zeiten der Gebiete besser gelesen',
               'horarios de las zonas mejor leídos']},
    {'id': 'v30-de-airspaces', 'since': 30, 'kind': 'better', 'zones': ('de',),
     'label': ['espaces contrôlés et zones (CTR, TMA, R, D, RMZ, TMZ, ATZ) mieux lus',
               'controlled airspaces and areas (CTR, TMA, R, D, RMZ, TMZ, ATZ) better read',
               'Kontrollräume und Gebiete (CTR, TMA, R, D, RMZ, TMZ, ATZ) besser gelesen',
               'espacios controlados y zonas (CTR, TMA, R, D, RMZ, TMZ, ATZ) mejor leídos']},
    {'id': 'v31-gb-uir-fra', 'since': 31, 'kind': 'absent', 'zones': ('gb',),
     'label': ['UIR de Londres et zones de route libre (absentes aujourd’hui)',
               'London UIR and free-route areas (not there today)',
               'UIR London und Gebiete mit freier Streckenführung (heute nicht vorhanden)',
               'UIR de Londres y zonas de ruta libre (hoy ausentes)']},
    # hors version : une pièce que le code attend (SOG-0530 : la table des niveaux de croisière de l'ENR 1.7, lue pour la règle semi-circulaire)
    {'id': 'fr-levels-table', 'piece': ('route', 'levels_fr.json'), 'source': 'enr51', 'kind': 'absent', 'zones': ('fr',),
     'label': ['règle semi-circulaire (absente aujourd’hui)',
               'semicircular rule (not there today)',
               'Halbkreisregel (heute nicht vorhanden)',
               'regla semicircular (hoy ausente)']},
)

KINDS = ('absent', 'better')


def in_scope(g, zone, sources):
    """Le gain `g` concerne-t-il ce pays ? `sources` : les sources dont le poste détient un fichier pour lui."""
    if 'zones' in g:
        return zone in g['zones']
    if 'sources' in g:
        return bool(set(g['sources']) & set(sources or ()))
    return True


def public(g):
    """Ce que le lanceur dit d'un gain à la page : { id, kind, label[4] } (+ `source` d'une pièce : la page à télécharger)."""
    out = {'id': g['id'], 'kind': g['kind'], 'label': list(g['label'])}
    if 'piece' in g:
        out['source'] = g['source']
    return out


def pending(zone, built, sources, piece_ok, has_inputs=True):
    """Les gains qui manquent à un pays construit : { redo: [..], update: [..] }.
    `built` : la version du lecteur qui l'a lu (entier) ; `sources` : les sources dont le poste détient un fichier pour lui ; `piece_ok(g)` : la pièce
    du gain est-elle lue ? ; `has_inputs` : le poste détient-il de quoi relire (sans fichier, une relecture n'a rien à lire : le gain devient une
    mise à jour). Une ligne `nogain` n'apporte rien."""
    redo, update = [], []
    for g in GAINS:
        if g.get('nogain') or not in_scope(g, zone, sources):
            continue
        if 'piece' in g:
            if not piece_ok(g):
                update.append(public(g))
        elif isinstance(built, int) and built < g['since']:
            (redo if has_inputs else update).append(public(g))
    return {'redo': redo, 'update': update}


def latest_version():
    """La plus haute version déclarée par la table (gain ou `nogain`)."""
    return max((g['since'] for g in GAINS if 'since' in g), default=0)
