"""Garde des fichiers JS du dossier de données (data/**/*.js) : seuls les deux formats écrits par la suite passent.

Les pages chargent ces fichiers par <script> (shared/data_files.js) : un fichier piégé du dépôt partagé s'exécuterait
chez chaque pilote. Tant qu'ils ne sont pas remplacés par du JSON (docs/technique/AUDIT_SECURITE_2026-10-07.md, C1),
le lanceur ne sert un .js de data/ que s'il suit l'un de ces formats, et la synchronisation ne le commite qu'à cette
condition :

  1. fichier de données de AircraftDB/datafile.py (et de son double shared/data_admin.js › render) :
       (() => { 'use strict'; // commentaires … const META = <JSON>; let data = <JSON>; const fileData = data; …
       try { … localStorage.getItem('<clé>') … } catch { … } <exportation en liste fermée> })();
  2. littéral : commentaires, puis window.<NOM> = <littéral JS sans expression> ; (data_tree.js,
     cr/mission_ledger_defaults.js), NOM en liste fermée.

Rien n'est évalué : les valeurs sont relues comme du JSON (format 1) ou par un analyseur de littéraux (format 2) ;
tout ce qui n'est ni commentaire, ni valeur, ni code fixe du gabarit est refusé.

Usage : python tools/data_guard.py <fichier.js | dossier>…  (code 1 si un fichier est refusé)
"""
import json, os, re, sys

# exportations du format 1 (AircraftDB/update_fleet.py, tools/defa_reference.py, shared/data_admin.js,
# shared/fleet_reporting.js) : texte exact
EXPORTS = {
    "window.DEFA_FLEET = data.rows.map(row => ({ ...row, callsign: (row.callsigns || [])[0] || '' })); "
    "window.DEFA_FLEET_META = META; window.DEFA_FLEET_FILE = fileData.rows;",
    'window.MISSION_CALLSIGNS = { META, table: data.table, operators: data.operators, file: fileData };',
    'window.DEFA_REFERENCE = { META, pilots: data.pilots, aircraft: data.aircraft, file: fileData };',
    'window.DEFA_PERSONAL_AIRCRAFT = data.rows; window.DEFA_PERSONAL_AIRCRAFT_META = META;',
}
# variables du format 2
# (AIRCRAFT_DB, AIRCRAFT_PERF : base des types publiée dans le dépôt des données pour le mode GitHub, AircraftDB/ ;
# exécutée par les téléphones, donc littéral pur exigé comme les autres)
GLOBALS = {'DATA_TREE', 'MissionLedgerDefaultsB64', 'AIRCRAFT_DB', 'AIRCRAFT_PERF'}

EOL = '\n\r  '  # fins de ligne du JavaScript : un commentaire // s'arrête à chacune
COMMENT = r'//[^\n\r  ]*'


class Refused(ValueError):
    pass


def _json_at(text, i):
    """Valeur JSON stricte à la position i : (valeur, position après) ; NaN, Infinity refusés."""
    def no_const(c):
        raise Refused(f'constante {c} refusée')
    try:
        return json.JSONDecoder(parse_constant=no_const).raw_decode(text, i)
    except json.JSONDecodeError as e:
        raise Refused(f'JSON invalide : {e.msg} (position {e.pos})')


def _expect(text, i, literal):
    if not text.startswith(literal, i):
        raise Refused(f'attendu {literal!r} (position {i})')
    return i + len(literal)


def check_datafile(text):
    """Format 1 : le code fixe du gabarit, des valeurs JSON ; entre les deux, seulement des blancs et des commentaires."""
    i = _ws(text, _expect(text, 0, '(() => {'))
    i = _ws(text, _expect(text, i, "'use strict';"))
    i = _expect(text, i, 'const META = ')
    meta, i = _json_at(text, i)
    if not isinstance(meta, dict):
        raise Refused('META doit être un objet')
    i = _ws(text, _expect(text, i, ';'))
    i = _expect(text, i, 'let data = ')
    data, i = _json_at(text, i)
    if not isinstance(data, dict):
        raise Refused('data doit être un objet')
    i = _ws(text, _expect(text, i, ';'))
    i = _ws(text, _expect(text, i, 'const fileData = data;'))
    m = re.compile(r"try \{ const o = JSON\.parse\(localStorage\.getItem\('([\w:.-]{1,80})'\) \|\| 'null'\); "
                   r"if \(o && o\.updatedAt > META\.updatedAt\) data = o\.data; \} catch \{ /\* stockage indisponible \*/ \}").match(text, i)
    if not m:
        raise Refused('lecture des modifications locales modifiée')
    i = _ws(text, m.end())
    m = re.compile(r'[^\n\r  ]*').match(text, i)
    export = m.group(0).rstrip()
    if export not in EXPORTS:
        raise Refused('exportation inconnue : ' + export[:120])
    i = _ws(text, _expect(text, i, export))
    i = _ws(text, _expect(text, i, '})();'))
    if i != len(text):
        raise Refused('texte après la fin du gabarit')
    return 'datafile'


# ---- format 2 : littéral JavaScript sans expression (objets, tableaux, chaînes, nombres, true/false/null)
_WS = re.compile(r'(?:[ \t\n\r﻿]+|//[^\n\r  ]*|/\*(?:[^*]|\*(?!/))*\*/)*')
_NUM = re.compile(r'-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?')
_IDENT = re.compile(r'[A-Za-z_$][\w$]*')
_STR = {'"': re.compile(r'"(?:[^"\\\n\r]|\\[\s\S])*"'), "'": re.compile(r"'(?:[^'\\\n\r]|\\[\s\S])*'")}


def _ws(text, i):
    return _WS.match(text, i).end()


def _literal(text, i, depth=0):
    if depth > 64:
        raise Refused('littéral trop profond')
    i = _ws(text, i)
    c = text[i:i + 1]
    if c in _STR:
        m = _STR[c].match(text, i)
        if not m:
            raise Refused(f'chaîne invalide (position {i})')
        return m.end()
    if c == '{':
        i = _ws(text, i + 1)
        while text[i:i + 1] != '}':
            k = text[i:i + 1]
            m = _STR[k].match(text, i) if k in _STR else (_IDENT.match(text, i) or _NUM.match(text, i))
            if not m:
                raise Refused(f'clé invalide (position {i})')
            i = _ws(text, m.end())
            i = _expect(text, i, ':')
            i = _ws(text, _literal(text, i, depth + 1))
            if text[i:i + 1] == ',':
                i = _ws(text, i + 1)
            elif text[i:i + 1] != '}':
                raise Refused(f'« , » ou « }} » attendu (position {i})')
        return i + 1
    if c == '[':
        i = _ws(text, i + 1)
        while text[i:i + 1] != ']':
            i = _ws(text, _literal(text, i, depth + 1))
            if text[i:i + 1] == ',':
                i = _ws(text, i + 1)
            elif text[i:i + 1] != ']':
                raise Refused(f'« , » ou « ] » attendu (position {i})')
        return i + 1
    m = _NUM.match(text, i)
    if m and m.end() > i:
        return m.end()
    m = _IDENT.match(text, i)
    if m and m.group(0) in ('true', 'false', 'null'):
        return m.end()
    raise Refused(f'valeur non littérale (position {i})')


def check_literal(text):
    i = _ws(text, 0)
    m = re.compile(r'window\.([A-Za-z_$][\w$]*)[ \t]*=').match(text, i)
    if not m:
        raise Refused('ni gabarit de données, ni « window.NOM = littéral; »')
    if m.group(1) not in GLOBALS:
        raise Refused(f'variable window.{m.group(1)} non admise')
    i = _ws(text, _literal(text, m.end()))
    i = _expect(text, i, ';')
    if _ws(text, i) != len(text):
        raise Refused('texte après le littéral')
    return 'literal'


def check(text):
    """Format reconnu ('datafile' ou 'literal') ; Refused sinon. Un séparateur de ligne Unicode (U+2028, U+2029) dans
    un commentaire // le termine pour le navigateur : les deux analyses s'y arrêtent aussi, et la suite est refusée."""
    return check_datafile(text) if text.startswith('(() => {') else check_literal(text)


_cache = {}


def check_file(path):
    """(ok, motif) pour un fichier ; verdict gardé tant que taille et date ne changent pas."""
    try:
        st = os.stat(path)
    except OSError as e:
        return False, str(e)
    key = (os.path.normcase(os.path.abspath(path)), st.st_size, st.st_mtime_ns)
    if key not in _cache:
        try:
            with open(path, encoding='utf-8') as f:
                text = f.read()
            _cache[key] = (True, check(text))
        except UnicodeDecodeError:
            _cache[key] = (False, 'pas en UTF-8')
        except Refused as e:
            _cache[key] = (False, str(e))
        except OSError as e:
            return False, str(e)
    return _cache[key]


if __name__ == '__main__':
    bad = 0
    for arg in sys.argv[1:] or ['.']:
        files = [arg] if os.path.isfile(arg) else [os.path.join(d, f) for d, _, fs in os.walk(arg) if '.git' not in d.split(os.sep)
                                                    for f in fs if f.endswith('.js')]
        for p in sorted(files):
            ok, why = check_file(p)
            bad += not ok
            print(('ok    ' if ok else 'REFUSÉ') + f' {p} : {why}')
    sys.exit(1 if bad else 0)
