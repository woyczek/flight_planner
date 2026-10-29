"""Des lignes lues aux procédures du schéma commun d'aerodb (frame/aerodb/SPEC.md § 5 quinquies) : tronçons → points → fiches, et le passage commun à tous les lecteurs (V3 § 10.29 (b)).

`records` (une table du SIA) et `records_uk_app` (une table des dispositions étrangères, EAD et OCR) construisent les fiches : identifiant, points, phase (approche interrompue), seuil de piste d'une
approche ILS (`with_threshold`), source ; puis proc_geometry.review les contrôle (un doute se marque, rien n'est retiré). `build_pdf_dir` lit TOUS les PDF d'un terrain (toutes les pages de tous
les documents : les listes de coordonnées d'un autre document complètent les points, le type lu à une page passe à la suivante, les noms coupés se confirment d'une page à l'autre) puis la géométrie
juge les fiches complétées. `stats_of` compte la lecture. Bibliothèque standard seulement.
"""
import re
from datetime import datetime, timezone

import proc_geometry as G
from proc_layouts import detect_layout, ei_names, fingerprint, KNOWN_FINGERPRINTS, page_date, PARSERS, read_page
from proc_pdf import PdfTimeout, waypoint_coords



def records_uk_app(icao, parsed, source, cycle, at=None, state='UK'):
    """Procédures du schéma commun d'une page UK « Instrument Approach Procedure Coding Tables » ; statut « check », source ead-basic/UK. Le cap vrai imprimé est gardé (`trk`) :
    proc_geometry.review contrôle ensuite la procédure construite, à la tolérance du cap vrai ; une procédure qui échoue est GARDÉE, statut « doubt » et le code « geometry » (jamais
    écartée : la table n'est pas perdue pour une procédure)."""
    out, warnings = [], list(parsed['warnings'])
    for t in parsed['tables']:
        pts, missed = [], False
        for lg in t['legs']:
            p = {'seq': len(pts) + 1, 'id': lg['id'], 'lat': lg['lat'], 'lon': lg['lon'], 'alt': lg['alt'], 'leg': lg['leg']}
            if lg.get('vpa') is not None:
                p['vpa'] = lg['vpa']
            if lg['kt']:
                p['kt'] = lg['kt']
            if lg['crs'] is not None:
                p['crs'] = lg['crs']
            if lg.get('true') is not None:
                p['trk'] = lg['true']
            if lg.get('nm') is not None:
                p['nm'] = lg['nm']
            if lg.get('turn'):
                p['turn'] = lg['turn']
            if lg.get('coords_from'):
                p['coords_from'] = lg['coords_from']
            if lg['over']:
                p['over'] = True
            if missed:
                p['phase'] = 'missed'
            if re.fullmatch(r'RW\d{2}[LRC]?', lg['id'] or '') or 'MAPt' in lg['remark']:
                missed = True
            pts.append(p)
        if any(p['lat'] is None and p['id'] is not None for p in pts):             # un tronçon sans point (CA, VA… : id None) n'a rien à résoudre
            warnings.append(f'{t["title"][:60]}: coordonnées absentes de la page, à résoudre par aerodb (base des points)')
        name = t['name']
        rw = f'RW{t["runways"][0]}' if len(t['runways']) == 1 else 'RWALL'
        norm = lambda v: re.sub(r'[\s-]+', '', (v or '').upper())
        kind = t.get('kind', 'APP')
        out.append({'id': '.'.join([icao, kind, norm(name), rw] + ([norm(t['transition'])] if t['transition'] else [])), 'icao': icao, 'kind': kind, 'name': name,
                    'runways': t['runways'], 'transition': t['transition'], 'points': pts,
                    'source': {'kind': 'ead-basic', 'ref': f'ead-basic/{state}/{source}', 'cycle': cycle, 'at': at}, 'status': 'check'})
        warnings += G.review(out[-1])
    return out, warnings


def build_pdf_dir(icao, pdfs, rows_of, cycle):
    """Fichier d'un terrain d'après des PDF d'AIP déjà téléchargés à la main ou par la sonde EAD (dossier de PDF) : CHAQUE page de chaque PDF passe par la détection de disposition
    (le tableau de codage est souvent à la page 2 ou plus, la première étant une carte) ; une disposition connue est lue, une inconnue est signalée (rien de deviné) ; chaque
    table est contrôlée par la géométrie (caps et coordonnées). Les points sans coordonnées sont complétés par les listes de coordonnées de TOUS les PDF du terrain
    (`waypoint_coords`, marque `coords_from: 'liste'`) AVANT le contrôle géométrique, qui juge donc la procédure complétée.
    `pdfs` : noms ; `rows_of(nom)` : liste des pages, chacune une liste de lignes (une liste de chaînes = ancien contrat, première page seulement)."""
    procs, warnings, formats = [], [], []
    pages_of, failed = {}, {}
    for f in sorted(pdfs):
        try:
            got = rows_of(f)
        except PdfTimeout as e:                      # lecture abandonnée (délai, document illisible) : le fichier est signalé, l'outil continue
            failed[f] = str(e)
            got = []
        pages_of[f] = [list(got)] if got and isinstance(got[0], str) else [list(x) for x in got]
        if not pages_of[f]:
            pages_of[f] = [[]]
    coords, ei_known = {}, {}
    for f in sorted(pdfs):
        for rows in pages_of[f]:
            for k, v in waypoint_coords(rows).items():
                coords.setdefault(k, v)
            if detect_layout(rows) == 'ei-coding':        # les noms coupés par la couche de texte se confirment d'une page à l'autre du terrain (mêmes coordonnées, même nom entier)
                for k, v in ei_names(rows).items():
                    ei_known.setdefault(k, set()).update(v)
    for f in sorted(pdfs):
        known = 0
        last_kind = None                      # type de procédure lu à la page précédente du document (le mot STAR / SID n'est parfois imprimé qu'à la première page)
        for n, rows in enumerate(pages_of[f], 1):
            layout = detect_layout(rows)
            if layout not in PARSERS:
                continue
            known += 1
            fp = fingerprint(rows)
            parsed = read_page(layout, rows, kind_hint=last_kind, known=ei_known)       # l'analyseur de la disposition (proc_layouts.LAYOUTS) ; le type et les noms confirmés viennent des pages déjà lues
            kinds_read = {t.get('kind') for t in parsed['tables']}
            if len(kinds_read) == 1 and None not in kinds_read:
                last_kind = kinds_read.pop()
            for t in parsed['tables']:
                for lg in t['legs']:
                    if lg.get('lat') is None and lg['id'] in coords:
                        lg['lat'], lg['lon'] = coords[lg['id']]
                        lg['coords_from'] = 'liste'
            recs, w = records_uk_app(icao, parsed, f, cycle, page_date(rows), icao[:2])
            ok = bool(recs) and len(recs) == len(parsed['tables']) and not any('NON retenue' in x for x in w)
            problems = [x for x in w if 'NON retenue' in x] + ([] if recs else ['aucune table lue'])
            if fp not in KNOWN_FINGERPRINTS[layout]:
                problems.append(f'info: en-tête inconnu (empreinte {fp}): format changé depuis les pages vues ?')
            formats.append({'file': f, 'page': n, 'layout': layout, 'fingerprint': fp, 'ok': ok, 'problems': problems})
            procs += recs
            warnings += [f'{f} p.{n}: {x}' for x in w]
        if f in failed:
            formats.append({'file': f, 'pages': 0, 'layout': None, 'fingerprint': None, 'ok': False, 'problems': [failed[f]]})
            warnings.append(f'{f}: NON lu, {failed[f]}')
            continue
        if not known:
            most = max(len(r) for r in pages_of[f])
            first = pages_of[f][0]
            formats.append({'file': f, 'pages': len(pages_of[f]), 'layout': detect_layout(first), 'fingerprint': fingerprint(first), 'ok': False,
                            'problems': ['disposition non reconnue' + (' (très peu de texte: tableau dessiné en vecteurs ou image ? ' + str(most) + ' ligne(s))' if most < 8 else '')]})
            warnings.append(f'{f}: {len(pages_of[f])} page(s) NON lue(s), disposition non reconnue' + (' (texte absent: tables dessinées sans couche de texte)' if most < 8 else ''))
    return {'schema': 1, 'icao': icao, 'cycle': cycle, 'updated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'procedures': procs, 'formats': formats,
            'warnings': warnings, 'notice': ead_notice(icao)}


def ead_notice(icao):
    """Mention portée par tout fichier de procédures issu d'EAD Basic (décision de l'utilisateur, 28 octobre 2026 ; EAD_BASIC.md § 1) : EAD Basic
    n'est pas relié à la base opérationnelle d'EAD et ses informations « shall not be used for operational purposes »."""
    return (f'Source : AIP de l\'État ({icao[:2]}) via EAD Basic (EUROCONTROL) ; données NON OPÉRATIONNELLES (« shall not be used for operational '
            'purposes ») : à vérifier, pour la simulation seulement, jamais pour la navigation.')


# ---------------------------------------------------------------------------------------------------------- schéma commun
def _id_of(icao, kind, name, runways, trans):
    norm = lambda v: re.sub(r'[^A-Z0-9]+', '', (v or '').upper())      # « INA RNAV (GNSS) RWY 14R » → INARNAVGNSSRWY14R
    rw = f'RW{runways[0]}' if len(runways) == 1 else 'RWALL'
    return '.'.join([icao, kind, norm(name) or 'NONAME', rw] + ([norm(trans)] if norm(trans) else []))


def _points(icao, legs, coords, warnings, missed_after=None):
    pts, seen_rw = [], False
    missing = []
    # l'approche interrompue commence après le point de piste (RWnn) ; sans lui dans la table, après le tronçon qui porte l'angle vertical (le seuil : « -3.0° / 50 »), avertissement
    by_angle = bool(missed_after) and not any(re.fullmatch(r'RW\d{2}[LRC]?', l['id'] or '') for l in legs) and any(l.get('vpa') is not None for l in legs)         and not any(l.get('phase') for l in legs)
    if by_angle:
        warnings.append('point de piste (RWnn) absent de la table: approche interrompue repérée après le tronçon qui porte l\'angle vertical')
    for leg in legs:
        c = coords.get(leg['id']) if leg['id'] else None        # un tronçon sans point (CA, FM…) : id, lat et lon null, jamais un point inventé
        if leg['id'] and not c and leg['id'] not in missing:
            missing.append(leg['id'])
        p = {'seq': len(pts) + 1, 'id': leg['id'], 'lat': c[0] if c else None, 'lon': c[1] if c else None,
             'alt': leg['alt'], 'leg': leg['leg']}
        for k in ('turn', 'crs', 'nm', 'kt', 'rnp', 'vpa'):
            if leg.get(k) is not None:
                p[k] = leg[k]
        if leg['over']:
            p['over'] = True
        if leg.get('synthetic'):
            p['synthetic'] = leg['synthetic']        # point que la table n'imprime pas (le seuil d'une approche ILS), ajouté d'après la page AD 2.12
        if seen_rw or leg.get('phase'):
            p['phase'] = 'missed'
        if leg.get('gap'):
            p['gap'] = True        # la table ne code pas ce qui sépare ce tronçon du précédent (page ILS, « See chart »)
        if missed_after and (re.fullmatch(r'RW\d{2}[LRC]?', leg['id'] or '') or (by_angle and leg.get('vpa') is not None)):
            seen_rw = True
        pts.append(p)
    if missing:
        warnings.append(f'coordonnées introuvables (page DATA ni base, à résoudre à la lecture par aerodb): {", ".join(missing)}')
    return pts


def with_threshold(legs, runways, coords, warnings):
    """Page ILS : la table code le point initial (IF), puis « See chart » (le dernier tronçon, l'alignement sur le radioalignement de piste, n'est PAS codé), puis l'approche interrompue (premier
    tronçon marqué `gap`). Insère entre les deux le seuil de la piste, { id: 'RWnn', leg: 'CF', synthetic: 'threshold' } : une approche ILS devient IF (/FAF) → seuil → interrompue, tracée droit.
    Le seuil vient de `coords` (page AD 2.12, voir build_aerodrome) ; sans position, ou si la page ne nomme pas une seule piste, rien n'est inséré (avertissement). Une approche sans point initial lu
    (la page commence par l'approche interrompue) reçoit quand même le seuil, en tête, avec un avertissement. Le premier tronçon interrompu garde son drapeau `gap` (le contrôle de géométrie
    ne le compare pas au seuil)."""
    if len(runways) != 1:
        warnings.append('page ILS: la page ne nomme pas une seule piste, seuil non ajouté')
        return legs
    rw = 'RW' + runways[0]
    pos = coords.get(rw)
    if not pos or pos[0] is None:
        warnings.append(f'page ILS: position du seuil {rw} inconnue (page AD 2.12 absente ou piste non lue), seuil non ajouté')
        return legs
    if any(l['id'] == rw for l in legs):
        return legs
    at = next((k for k, l in enumerate(legs) if l.get('gap')), len(legs))
    if not any(l['id'] for l in legs[:at]):
        warnings.append(f'page ILS: aucun point initial lu avant « See chart » (IF absent), la procédure commence au seuil {rw}')
    return legs[:at] + [{'id': rw, 'leg': 'CF', 'alt': None, 'over': None, 'synthetic': 'threshold'}] + legs[at:]


def records(icao, table, coords, source, cycle):
    """Procédures du schéma commun d'une table lue (parse_code_table), statut « check »."""
    out, warnings = [], list(table['warnings'])
    src = {'kind': 'eaip', 'ref': source, 'cycle': cycle, 'at': table.get('amdt')}
    if table['kind'] in ('SID', 'STAR'):
        for g in table['groups']:
            name = g['label'] or None
            rws = [g['runway']] if g.get('runway') else table['runways']       # un départ à plusieurs pistes : une procédure par piste
            out.append({'id': _id_of(icao, table['kind'], name, rws, None), 'icao': icao, 'kind': table['kind'],
                        'name': name, 'runways': rws, 'transition': None,
                        'points': _points(icao, g['legs'], coords, warnings), 'source': src, 'status': 'check'})
            if g.get('lost'):
                warnings.append(G.mark(out[-1], 'unread', f'{g["lost"]} ligne(s) de la table non lue(s)'))
    elif table['kind'] == 'APP':
        final = next((g for g in reversed(table['groups']) if g['label'] == 'APCH'), None)
        inas = [g for g in table['groups'] if g is not final and (g['label'] or '').startswith('INA ') and not g.get('skip')]
        name = table['title']
        for g in inas or [None]:
            legs = (g['legs'] if g else []) + ([l for l in final['legs'] if not (g and l is final['legs'][0] and l['id'] and
                                                                                  g['legs'][-1]['id'] == l['id'])] if final else [])
            trans = g['label'][4:] if g else None
            if final and final.get('gap') is not None:          # page ILS : l'alignement sur la piste n'est pas codé, le seuil est ajouté
                legs = with_threshold(legs, table['runways'], coords, warnings)
            out.append({'id': _id_of(icao, 'APP', name, table['runways'], trans), 'icao': icao, 'kind': 'APP', 'name': name,
                        'runways': table['runways'], 'transition': trans,
                        'points': _points(icao, legs, coords, warnings, missed_after=True), 'source': src, 'status': 'check'})
            lost = sum(x.get('lost', 0) for x in ([final] if final else []) + ([g] if g else []))
            if lost:
                warnings.append(G.mark(out[-1], 'unread', f'{lost} ligne(s) de la table non lue(s)'))
    return out, warnings


def reason_of(problem):
    """Motif court, stable, d'un problème de page ou d'une procédure écartée (`formats[].problems`, géométrie) : sert au compte rendu `stats.reasons` de la lecture à la demande
    (le texte est celui que Carburant montre, ou associe à sa traduction)."""
    t = problem or ''
    if 'moins de 85' in t:
        return 'lignes de tronçon illisibles (moins de 85 % lues)'
    if 'disposition non reconnue' in t:
        return 'mise en page non reconnue'
    if 'titre de la page non reconnu' in t or 'titre non reconnu' in t:
        return 'titre de la page non reconnu'
    if 'aucun groupe' in t or 'aucune table lue' in t:
        return 'aucun tronçon lisible'
    if 'géométrie' in t:
        return 'géométrie incohérente'
    return re.sub(r'\s+', ' ', t.split(':')[0]).strip()[:80] or 'autre'


def stats_of(formats, procedures, dropped=(), doubt=()):
    """Compte rendu d'une lecture : { pages (pages de codage trouvées), read (lues), rejected (non lues), procedures (installées, celles « à vérifier » comprises), dropped (VRAIMENT retirées :
    un bloc sans titre qui en répète une nommée), doubt (installées au statut « doubt »), reasons (les 3 motifs les plus fréquents, [motif, nombre], sur les pages non lues, les procédures
    retirées et celles à vérifier) }. `formats` : la liste `formats` du fichier du terrain ; `dropped` : un motif (texte) par procédure retirée ; `doubt` : UN CODE par procédure à vérifier
    (proc_geometry.doubt_codes : « geometry », « name »…), que `reasons` porte tel quel. Les motifs des pages non lues restent des phrases, jusqu'à ce que les pages portent des codes aussi."""
    counts, dropped, doubt = {}, list(dropped), list(doubt)
    for f in formats:
        if not f.get('ok'):
            why = next((reason_of(x) for x in f.get('problems', []) if not x.startswith('info:')), 'autre')
            counts[why] = counts.get(why, 0) + 1
    for why in dropped + doubt:
        counts[why] = counts.get(why, 0) + 1
    top = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:3]
    read = sum(1 for f in formats if f.get('ok'))
    return {'pages': len(formats), 'read': read, 'rejected': len(formats) - read, 'procedures': procedures, 'dropped': len(dropped), 'doubt': len(doubt), 'reasons': [[k, v] for k, v in top]}
