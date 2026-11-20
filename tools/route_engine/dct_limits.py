"""SOG-0401 (lot 3) : les LIMITES DES DIRECTS au raccord d'un terrain, lues dans le classeur RAD déjà déposé sur le poste (annexe 3A, feuille « Conditions », lignes `XX_LIM_AD`).

Le RAD borne, par pays, le direct (DCT) que le plan de vol peut tracer depuis le terrain de départ (ou vers le terrain d'arrivée) : « ED** DEP DCT 10 NM, sauf (EDDF, EDDM…) 0 NM » veut dire qu'à Francfort la route doit commencer au dernier
point de la SID (un direct de 0 NM) ; Eurocontrol répond ROUTE135 à un « EDDF DCT ULNOK ». Cette limite est décidable : un nombre, un terrain, un sens. Le moteur la lit, comme le fait le contrôle des plafonds de voies (SOG-0401, point 4),
et la dit.

Ce que ce module lit : le texte de chaque ligne `XX_LIM_AD` en CLAUSES « sujet — sens — limite en NM » (sujet : le pays entier `ED**`, une liste `(EDAC, EDDF…)`, un terrain seul ; sens : ARR, DEP ou les deux, « Departures/Arrivals » compris),
dans l'ordre du texte (une exception vient après la règle générale et la remplace). Une clause qui porte un niveau, une heure ou « sauf en dessous de FL… » n'est PAS décidée (`complex`) : le terrain qu'elle nomme reste « à examiner », jamais
un refus inventé. Un terrain qu'aucune clause ne nomme et dont le pays n'a pas de feuille : limite inconnue, « à examiner » aussi.

Ce que ce module NE lit PAS : la limite des directs EN ROUTE par espace (annexe 3B, « FRA LIM ») : elle dépend du contour des espaces (EDUUFRAE, LFFFACC…) que la base n'a pas ; elle est dite « non appliquée » dans la réponse.
Python : bibliothèque standard."""
import re

SHEET = 'Annex 3A Conditions'
ID = re.compile(r'^([A-Z]{2})_LIM_AD$')
NM = re.compile(r'(\d{1,4})\s*NM', re.I)      # une limite de NM s'écrit en quatre chiffres au plus (jamais un entier non borné : un texte falsifié ne lève rien)
ICAO = re.compile(r'\b[A-Z]{2}[A-Z0-9]{2}\b')
STOP = {'STAR', 'EXC', 'NOTE', 'ONLY', 'FROM', 'THEN', 'WITH', 'DEPA', 'ARRI'}      # des mots de quatre signes qui ne sont pas des terrains
COMPLEX = re.compile(r'\bFL\s*\d|\bBELOW\b|\bABOVE\b|\bABV\b|\bBLW\b|\bDURING\b|\bNIGHT\b|\bH\d\d\b|\d\d:\d\d', re.I)
EXC = re.compile(r'(\b[A-Z]{2}[A-Z0-9]{2}\b)\s*\(([^()]{0,120}\b(?:FL\s*\d|BELOW|ABOVE|ABV|BLW)[^()]{0,120})\)', re.I)      # « EGBJ (except below FL105) » : l'exception du terrain qui la précède, pas de toute la liste
MAX_TEXT = 8000
CACHE = {}


def _kinds(seg):
    s = seg.upper()
    found = None
    for m in re.finditer(r'ARR\s*/\s*DEP|DEP\s*/\s*ARR|DEPARTURES?\s*/\s*ARRIVALS?|ARRIVALS?\s*/\s*DEPARTURES?|\bARR\b|\bDEP\b|\bARRIVALS?\b|\bDEPARTURES?\b', s):
        t = m.group(0)
        found = {'arr', 'dep'} if '/' in t else {'arr'} if t.startswith('ARR') else {'dep'}
    return found or {'arr', 'dep'}


def _subject(seg):
    """(préfixe, ensemble de terrains) du sujet d'une clause ; (None, None) : le pays de la feuille tout entier."""
    lists = [m.group(1) for m in re.finditer(r'\(([^()]*)\)', seg)]
    for body in reversed(lists):
        codes = {x for x in ICAO.findall(body.upper()) if x not in STOP}
        if codes:
            return None, codes
    pref = re.findall(r'\b([A-Z]{2})\*\*', seg.upper())
    if pref:
        return pref[-1], None
    codes = {x for x in ICAO.findall(seg.upper()) if x not in STOP}
    return (None, codes) if codes else (None, None)


def parse(sheet_id, text, struck=False):
    """Les clauses d'une ligne `XX_LIM_AD` : [{ prefix, codes, kinds, nm, complex }] dans l'ordre du texte ; [] si rien n'est lisible. `struck` : une partie barrée de la cellule a été retirée à l'import : le texte n'est pas sûr, toutes ses clauses sont `complex`."""
    flat = ' '.join(str(text or '')[:MAX_TEXT].replace('\r', '\n').split())
    out, last = [], 0
    ms = list(NM.finditer(flat))
    for n, m in enumerate(ms):
        seg = flat[last:m.end()]
        last = m.end()
        after = flat[m.end():(ms[n + 1].start() if n + 1 < len(ms) else len(flat))][:200]      # ce qui suit la limite, jusqu'à la clause suivante : « (sauf là où une SID existe, RFL au-dessus de FL055) » la rend non décidée
        exc = {x.group(1).upper() for x in EXC.finditer(seg)}      # SOG-0501 : les terrains dont la liste dit « (except below FL105) » : seuls ceux-là ne sont pas décidés ; les autres de la même liste le sont
        plain = EXC.sub(lambda x: x.group(1), seg)
        pref, codes = _subject(plain)
        hard = bool(COMPLEX.search(plain) or COMPLEX.search(after) or re.search(r'\bEXCEPT\b', after, re.I))      # SOG-0529 : une condition de niveau, d'heure ou d'exception : non décidée
        out.append({'prefix': pref, 'codes': sorted(codes) if codes else None, 'kinds': sorted(_kinds(plain)), 'nm': int(m.group(1)), 'other': bool(re.search(r'\bOTHERS?\b', plain, re.I)),
                    'exc': sorted(exc) or None, 'complex': hard, 'struck': bool(struck)})      # `struck` : une partie BARRÉE de la cellule a été retirée à l'import (la limite se lit, mais DIT qu'elle est à confirmer : jamais une ERREUR)
    return out


def rules(rad):
    """{ identifiant de feuille : [clauses] } du classeur en vigueur ; gardé par classeur. Vide sans RAD."""
    book = getattr(rad, 'book', None)
    if not book:
        return {}
    key = book.get('sha256') or book.get('file')      # sans empreinte ni nom : pas de cache (deux classeurs ne partagent jamais une entrée)
    key = (key, str(getattr(rad, 'date', None))) if key else key      # revue de Sécurisation : `rules` filtre par `rad.active` (la date du RAD) : la date est dans la clé, un même classeur à deux dates ne partage pas une entrée
    if key and key in CACHE:
        return CACHE[key]
    out = {}
    for r in (book.get('sheets') or {}).get(SHEET, []):
        v = r.get('v') or []
        if len(v) < 6 or v[0] == 'DEL' or not ID.match(str(v[3]).strip()):
            continue
        try:
            if not rad.active(r):
                continue
        except (KeyError, TypeError, ValueError, AttributeError):
            continue
        try:
            clauses = parse(str(v[3]).strip(), v[5], bool(r.get('strike_removed')))
        except (ValueError, TypeError, RecursionError):      # un texte abîmé ou falsifié : aucune clause, la ligne reste « à examiner »
            clauses = []
        out.setdefault(str(v[3]).strip(), []).extend(clauses)
    if key:
        if len(CACHE) > 8:
            CACHE.clear()
        CACHE[key] = out
    return out


def limit_of(rad, icao, end):
    """La limite du direct au raccord de `icao` (`end` : 'dep' ou 'arr') : { state: known | complex | unknown, nm, rule } ; `rule` : la feuille qui la porte.
    known : un nombre de NM ; complex : une clause qui nomme ce terrain porte un niveau ou une heure (non décidée) ; unknown : aucune clause."""
    icao = str(icao or '').upper()
    state, nm, rule, struck = 'unknown', None, None, False
    for sid, clauses in rules(rad).items():
        named = set()      # les terrains que les clauses d'avant de la feuille nomment : « Other AD's » veut dire tous les autres
        for cl in clauses:
            if cl['codes']:
                named |= set(cl['codes'])
            if end not in cl['kinds'] or (cl.get('other') and icao in named):
                continue
            general = cl['prefix'] is None and cl['codes'] is None and icao.startswith(sid[:2])
            hit = general or (cl['prefix'] and icao.startswith(cl['prefix'])) or (cl['codes'] and icao in cl['codes'])
            if not hit:
                continue
            rule = sid
            if cl['complex'] or icao in (cl.get('exc') or ()):
                state, nm, struck = 'complex', None, False
            else:
                state, nm, struck = 'known', cl['nm'], bool(cl.get('struck'))
    return {'state': state, 'nm': nm, 'rule': rule, 'struck': struck if state == 'known' else False}


def connection_points(procedures, ad, end, ceiling_ft=None):
    """Les points par lesquels une route peut quitter (SID : son dernier point) ou rejoindre (STAR : son premier point) le terrain d'après les procédures LUES ; None quand la base n'en lit aucune pour ce terrain (alors on ne sait pas)."""
    try:
        items = procedures.options(ad, 'SID' if end == 'dep' else 'STAR')
    except Exception:
        return None
    pts = {str(x['sequence'][-1 if end == 'dep' else 0].get('id', '')).upper() for x in items if x.get('sequence') and getattr(procedures, 'flyable', lambda p, c: True)(x, ceiling_ft)}      # SOG-0529 : seules les procédures volables de ce niveau
    return pts if pts else (set() if items else None)      # set() : des procédures sont lues mais AUCUNE n'est volable de ce niveau ; None : la base n'en lit aucune


def check(rad, legs, dep, arr, typed, procedures=None, ceiling_ft=None, strict=False):
    """Le contrôle des raccords d'un résultat : ({ checked: [...], not_applied: [...] }, [(niveau, texte)]). Un raccord est le PREMIER tronçon depuis le terrain de départ (le DERNIER vers celui d'arrivée) quand c'est un direct sans
    SID ni STAR lue. Trois cas : (1) limite de N > 0 NM dépassée : ERREUR pour une route TAPÉE (comme Eurocontrol), REVUE pour une route calculée (la base n'a pas la SID que le RAD exige : la route le dit) ; (2) limite de 0 NM : la route doit
    commencer au dernier point d'une SID (finir au premier d'une STAR) : ERREUR pour une route tapée si les procédures du terrain sont LUES et que le point n'en est pas un ; sans procédure lue, « à examiner » (on ne sait pas si le point en est un) ;
    (3) limite non décidée ou inconnue : « à examiner », jamais un refus inventé."""
    typed = bool(typed or strict)      # SOG-0532 (3) : `strict` (le moteur) : une limite CONNUE dépassée est une ERREUR pour une route calculée comme pour une route tapée ; sans lui (les cas d'unité) l'ancienne règle : REVUE pour une route calculée
    checked, issues = [], []
    note = ['limite des directs par espace (annexe 3B FRA LIM) : contours des espaces absents de la base']
    if not legs or not getattr(rad, 'book', None):
        return {'checked': checked, 'not_applied': note}, issues
    for end, ad, leg in (('dep', dep, legs[0]), ('arr', arr, legs[-1])):
        if ad and leg.get('no_network') is True and leg.get('via') == 'DCT':      # SOG-0501 (c) : le direct de repli d'un terrain sans réseau (SOG-0474) est dit AVEC la limite du RAD qu'il dépasse : l'IFPS le refuse (ROUTE134), la base n'a ni le réseau ni les STAR de cet État
            a, b = str((leg.get('start') or {}).get('id', '')).upper(), str((leg.get('end') or {}).get('id', '')).upper()
            if (a if end == 'dep' else b) == str(ad).upper():
                lim = limit_of(rad, ad, end)
                nm = round(float(leg.get('nm') or 0), 1)
                if lim['state'] == 'known' and lim['nm'] > 0 and nm > lim['nm']:
                    checked.append({'ad': ad, 'end': end, 'point': b if end == 'dep' else a, 'leg_nm': nm, 'state': 'exceeded', 'limit_nm': lim['nm'], 'rule': lim['rule']})
                    issues.append(('ERREUR' if typed and not lim.get('struck') else 'REVUE', f'{ad} : le direct de repli de {nm:g} NM {"au départ" if end == "dep" else "à l’arrivée"} (aucun réseau de cet État dans la base) dépasse la limite de {lim["nm"]:g} NM du RAD ({lim["rule"]}) : l’IFPS le refusera (ROUTE134) ; il faut les {"SID" if end == "dep" else "STAR"} et le réseau de cet État', {'code': 'connector_limit', 'values': {'ad': ad, 'end': end, 'nm': nm, 'limit_nm': lim['nm'], 'rule': lim['rule'], 'no_network': True}}))
                elif lim['state'] != 'known':      # SOG-0532 (6) : le direct de repli d'un terrain sans réseau dont la limite n'est pas lue : « non vérifiable », nommé
                    issues.append(('REVUE', f'{ad} : le direct de repli de {nm:g} NM {"au départ" if end == "dep" else "à l’arrivée"} (aucun réseau de cet État dans la base) : limite du RAD non lue pour ce terrain, non vérifiable', {'code': 'connector_unknown', 'values': {'ad': ad, 'end': end, 'nm': nm, 'reason': 'no_network_no_limit', 'rule': lim['rule']}, 'unverifiable': True}))
                continue
        if not ad or leg.get('procedure_id') or leg.get('no_network') or leg.get('via') != 'DCT' or leg.get('kind') in ('SID', 'STAR', 'APPROACH_LINK'):      # SOG-0474 : le direct sans réseau est dit à part
            continue
        a, b = str((leg.get('start') or {}).get('id', '')).upper(), str((leg.get('end') or {}).get('id', '')).upper()
        if (a if end == 'dep' else b) != str(ad).upper():
            continue
        far = b if end == 'dep' else a
        nm = round(float(leg.get('nm') or 0), 1)
        lim = limit_of(rad, ad, end)
        rec = {'ad': ad, 'end': end, 'point': far, 'leg_nm': nm, 'state': lim['state'], 'limit_nm': lim['nm'], 'rule': lim['rule']}
        what = 'départ' if end == 'dep' else 'arrivée'
        link = f'{ad} → {far}' if end == 'dep' else f'{far} → {ad}'
        proc = 'SID' if end == 'dep' else 'STAR'
        flag = lambda: (leg.setdefault('alerts', []).append('Limite du direct au raccord (RAD ' + str(lim['rule']) + ')'), leg.__setitem__('compatible', False))
        if lim['state'] == 'known' and lim['nm'] > 0:
            if nm > lim['nm']:
                rec['state'] = 'exceeded'
                if typed and not lim.get('struck'):      # SOG-0529 : une limite lue d'une cellule dont une partie barrée a été retirée n'invente jamais une ERREUR : REVUE, dite
                    issues.append(('ERREUR', f'Raccord {link} : direct de {nm:g} NM au {what}, au-delà de la limite de {lim["nm"]:g} NM du RAD ({lim["rule"]})', {'code': 'connector_limit', 'values': {'ad': ad, 'end': end, 'nm': nm, 'limit_nm': lim['nm'], 'rule': lim['rule'], 'point': far}}))
                    flag()
                else:
                    issues.append(('REVUE', f'{ad} : raccord direct de {nm:g} NM au {what}, au-delà de la limite de {lim["nm"]:g} NM du RAD ({lim["rule"]}) ; la route ne peut pas s’y conformer sans {proc} lue'))
            else:
                rec['state'] = 'within'
        elif lim['state'] == 'known':      # 0 NM : le raccord est la SID / la STAR elle-même
            pts = connection_points(procedures, ad, end, ceiling_ft)
            said = ' (une partie barrée de la cellule du RAD a été retirée à l’import : à confirmer)' if lim.get('struck') else ''
            if pts is None:
                rec['state'] = 'unknown'
                issues.append(('REVUE', f'{ad} : limite du direct au raccord de 0 NM (RAD {lim["rule"]}) : la route doit {"commencer au dernier point d’une SID" if end == "dep" else "finir au premier point d’une STAR"} ; la base ne lit aucune {proc} pour {ad}, on ne peut pas dire si {far} en est un (à examiner)', {'code': 'connector_unknown', 'values': {'ad': ad, 'end': end, 'nm': nm, 'reason': 'no_procedure_read', 'rule': lim['rule']}, 'unverifiable': True}))
            elif far in pts:
                rec['state'] = 'within'
            else:
                rec['state'] = 'exceeded'
                if typed and not lim.get('struck'):      # SOG-0529 : une limite lue d'une cellule dont une partie barrée a été retirée n'invente jamais une ERREUR : REVUE, dite
                    issues.append(('ERREUR', f'Raccord {link} : direct de {nm:g} NM au {what}, la limite du RAD est de 0 NM ({lim["rule"]}) et {far} n’est {"le dernier point d’aucune SID" if end == "dep" else "le premier point d’aucune STAR"} de {ad}', {'code': 'connector_limit', 'values': {'ad': ad, 'end': end, 'nm': nm, 'limit_nm': 0, 'rule': lim['rule'], 'point': far}}))
                    flag()
                else:
                    issues.append(('REVUE', f'{ad} : raccord direct de {nm:g} NM au {what}, limite de 0 NM du RAD ({lim["rule"]}){said} : {far} n’est {"le dernier point d’aucune SID" if end == "dep" else "le premier point d’aucune STAR"} volable{(" à FL" + format(ceiling_ft / 100, "03.0f")) if ceiling_ft else ""} ; la route sera refusée par l’IFPS (ROUTE{"135" if end == "dep" else "134"}) : à examiner, jamais une route valide', {'code': 'connector_limit', 'values': {'ad': ad, 'end': end, 'nm': nm, 'limit_nm': 0, 'rule': lim['rule'], 'point': far, 'struck': bool(lim.get('struck'))}}))
        else:
            why = 'limite avec niveau ou horaire, non décidée' if lim['state'] == 'complex' else 'aucune limite lue pour ce terrain'
            issues.append(('REVUE', f'{ad} : limite du direct au raccord à examiner ({why}) ; direct de {nm:g} NM', {'code': 'connector_unknown', 'values': {'ad': ad, 'end': end, 'nm': nm, 'reason': 'conditional' if lim['state'] == 'complex' else 'no_limit', 'rule': lim['rule']}, 'unverifiable': True}))
        checked.append(rec)
    return {'checked': checked, 'not_applied': note}, issues
