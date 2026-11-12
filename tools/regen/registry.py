"""aircraft/registry (SOG-0270, lecture seule) : le registre français des immatriculations, lu sur ce poste (tools/registry_fr.py, dérivé à cinq colonnes sous data/local/registry/).
  Arguments : { reg?: « F-BHHH » | « FBHHH » (une immatriculation), type?: « cessna 172 » (des mots du constructeur et du modèle), limit?: 1 à 200 (50 par défaut) } ; au moins reg ou type, et rien d'autre.
  Réponse : { ok, source (« Registre français des immatriculations, DGAC »), date (celle du fichier pris), rows: [{ reg, maker, model, serial, base }], count, truncated } ; { ok: true, rows: [], absent: true } sans registre sur le poste.
  Le type du registre est un libellé (constructeur + modèle), une SUGGESTION : l'appelant le rapproche de nos types par la base locale des types, un type non reconnu se montre tel quel. Aucun nom, aucune adresse de propriétaire n'existe ici."""
import os
import re
import sys

TOOLS = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if TOOLS not in sys.path:
    sys.path.insert(0, TOOLS)
import registry_fr  # noqa: E402

MAX_LIMIT = 200


def check(a):
    """Contrôle d'arguments (→ 400 si None)."""
    if not isinstance(a, dict) or not set(a) <= {'reg', 'type', 'limit'}:
        return None
    reg, typ, limit = a.get('reg'), a.get('type'), a.get('limit', 50)
    if reg is None and typ is None:
        return None
    if reg is not None and not (isinstance(reg, str) and re.fullmatch(r'[A-Za-z0-9 -]{2,12}', reg)):
        return None
    if typ is not None and not (isinstance(typ, str) and 2 <= len(typ.strip()) <= 60 and re.fullmatch(r'[\w .+/-]+', typ)):
        return None
    if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= MAX_LIMIT:
        return None
    return {**({'reg': reg.strip()} if reg is not None else {}), **({'type': typ.strip()} if typ is not None else {}), 'limit': limit}


def run(job, args, ctx):
    doc = registry_fr.load(os.path.join(str(ctx['data']), 'local', 'registry'))
    if doc is None:
        return {'ok': True, 'rows': [], 'count': 0, 'absent': True}
    rows = registry_fr.lookup(doc, args.get('reg'), args.get('type'), args['limit'] + 1)
    return {'ok': True, 'source': doc.get('source'), 'date': doc.get('date'), 'rows': rows[:args['limit']], 'count': min(len(rows), args['limit']), 'truncated': len(rows) > args['limit']}


VERBS = {('aircraft', 'registry'): (run, check)}
