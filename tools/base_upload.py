"""Envoi d'un fichier CHOISI par l'utilisateur au lanceur du poste (SOG-0199, route POST /__setup/base/upload) — bibliothèque standard seulement.

« Si on n'a pas trouvé le fichier automatiquement, proposer de le choisir à la main » : la page (sélecteur du système) envoie les OCTETS du fichier tels quels ; le lanceur le reconnaît par son
CONTENU (jamais par un chemin venu de la page, jamais par son seul nom) ou dit pourquoi. Un fichier reconnu est posé sous son nom canonique dans data/local/upload/, un dossier que base/pickup lit comme
Téléchargements (tools/launch.py downloads_dirs) : l'envoi ne construit rien, la page enchaîne le parcours normal (plan puis prise de base/pickup, puis construction).

Contrat (frame/aerodb/INTEGRATION.md « Envoi d'un fichier choisi ») :
  · POST /__setup/base/upload, ce poste seulement (X-SOG-Setup, même origine), corps = les octets (application/octet-stream), `X-SOG-Name` = le nom du fichier choisi, ENCODÉ (encodeURIComponent : accents,
    espaces), un indice seulement (décodé, réduit à son dernier composant, jamais un chemin) ;
  · la taille est bornée par Content-Length AVANT toute lecture (MAX_BYTES : 1,5 Go) ; le corps est écrit en flux dans un fichier temporaire de data/local/upload/ (jamais en mémoire), haché au passage ;
  · reconnu par le contenu : un zip par la liste de ses membres (l'annuaire seul est lu), un JSON par son premier signe (+ son nom, pour openAIP) ; sources de base/pickup : sia, nats, lfv, openaip ;
  · réponse { ok: true, source, zone, name (le nom rangé), size, cycle?, replaced, sha256 } — replaced: false : le même fichier était déjà là, rien n'est réécrit — ou { ok: false, reason, message, expected? } ;
    `reason` (liste FERMÉE) : too-large (413), empty (400), type (415), unrecognised (422 ; `expected` : les identifiants des sources attendues), busy (409 : un travail tourne), merge-pending (409),
    disk (507), refused (403 : appareil du réseau local, rendu par le lanceur).
Rien n'est écrit hors de data/local/upload/ ; le fichier temporaire est retiré quoi qu'il arrive."""
import hashlib
import os
import re
import secrets
import struct
import time
import urllib.parse
import zipfile

MAX_BYTES = 1536 * 1024 * 1024          # 1,5 Go : l'eAIP suédois hors ligne fait environ 1 Go
CHUNK = 1024 * 1024
MAX_MEMBERS = 200000                    # un zip de plus de membres : pas une archive attendue (son annuaire n'est pas lu)
CD_MAX = 64 * 1024 * 1024               # un annuaire de plus de 64 Mo : idem (ZipFile le charge entier en mémoire avant tout autre contrôle)
FOLDER = ('local', 'upload')
EXPECTED = ['sia', 'nats', 'lfv', 'openaip', 'faa', 'ukmil', 'eurocontrol_rad', 'navpt']       # les sources que base/pickup prend (dites avec `unrecognised`)
REASONS = ('too-large', 'empty', 'type', 'unrecognised', 'busy', 'merge-pending', 'disk', 'refused')
STATUS = {'too-large': 413, 'empty': 400, 'type': 415, 'unrecognised': 422, 'busy': 409, 'merge-pending': 409, 'disk': 507, 'refused': 403}
NATS_MEMBER = re.compile(r'^EG_(AIP|OBS|UAS)_.*?(\d{8})\.xml\Z', re.I | re.A)
SIA_MEMBER = re.compile(r'^(?:AIXM4\.5_all_FR_OM_|XML_SIA_)(\d{4}-\d{2}-\d{2})\.xml\Z', re.I | re.A)
NASR_NAME = re.compile(r'^(\d{2})_([A-Z][a-z]{2})_(\d{4})_(FIX|AWY|NAV)_CSV(?: \(\d+\))?\.zip\Z', re.A)      # « 29_Oct_2026_FIX_CSV.zip » : le nom que la FAA donne à ses jeux CSV
SUB_NAME = re.compile(r'^28DaySubscription_Effective_(\d{4}-\d{2}-\d{2})(?: \(\d+\))?\.zip\Z', re.A)      # SOG-0273 : l'abonnement NASR complet (tools/faa_nasr.py SUB_NAME, le même motif)
INNER_MEMBER = re.compile(r'^CSV_Data/\d{2}_[A-Z][a-z]{2}_\d{4}_CSV\.zip\Z', re.A)      # son zip de jeux CSV (tools/faa_nasr.py INNER_MEMBER)
NASR_MEMBER = {'FIX': 'FIX_BASE.csv', 'AWY': 'AWY_SEG_ALT.csv', 'NAV': 'NAV_BASE.csv'}
FRA_MEMBER = re.compile(r'^(?:.*/)?(eurocontrol-airac-(\d{4})-fra-points-[A-Za-z0-9-]+\.xlsx)\Z', re.I | re.A)      # SOG-0273 : un zip de classeurs FRA (l'historique des cycles, 41 classeurs) : seuls ceux du cycle en vigueur et du suivant sont pris, sur place
TAKE_MAX = 32 * 1024 * 1024        # un classeur pris dans une archive : 1,6 Mo aujourd'hui
RAD_NAME = re.compile(r'^RAD_\d{4}_v[\d_]+(?: \(\d+\))?\.xlsx\Z', re.I | re.A)      # tools/route_engine/import_books.py RAD_NAME / FRA_NAME : les classeurs d'EUROCONTROL, sous leur nom d'origine
FRA_NAME = re.compile(r'^eurocontrol-airac-\d{4}-fra-points-[A-Za-z0-9-]+(?: \(\d+\))?\.xlsx\Z', re.I | re.A)
OPENAIP_NAME = re.compile(r'^(?P<cc>[a-z]{2})_(?P<layer>asp|apt|nav|rpp)(?: \(\d+\))?\.(?P<ext>geojson|json)\Z', re.A | re.I)    # base_sources.OPENAIP_FILE, sans « hot » ni xml (pas lus)


class Refused(Exception):
    """Un refus de la liste fermée : reason, message, expected (facultatif)."""

    def __init__(self, reason, message='', expected=None):
        super().__init__(reason)
        self.reason, self.message, self.expected = reason, message, expected


def clean_hint(raw):
    """Le nom indiqué par la page (encodé) : décodé, sans caractère de contrôle, réduit à son dernier composant (jamais un chemin), 150 caractères au plus ; '' s'il est illisible."""
    try:
        s = urllib.parse.unquote(str(raw or ''), errors='strict')
    except (UnicodeDecodeError, ValueError):
        return ''
    s = re.sub(r'[\x00-\x1f\x7f]', '', s).replace('\\', '/').rsplit('/', 1)[-1].strip()
    return s[:150]


def _date_ok(text):
    """Une date « AAAAMMJJ » ou « AAAA-MM-JJ » plausible (2000-2099) → « AAAA-MM-JJ », sinon ''."""
    m = re.fullmatch(r'(20\d\d)-?(0[1-9]|1[0-2])-?(0[1-9]|[12]\d|3[01])', text or '')
    return '-'.join(m.groups()) if m else ''


def _directory(path):
    """(nombre d'entrées, taille de l'annuaire en octets) lus dans l'enregistrement de fin du zip — les derniers octets du fichier, zip64 compris — SANS construire l'annuaire (zipfile.ZipFile le charge entier avant tout contrôle) ; None si l'enregistrement est introuvable (ZipFile dira BadZipFile)."""
    with open(path, 'rb') as f:
        f.seek(0, os.SEEK_END)
        size = f.tell()
        back = min(size, 22 + 65535)
        f.seek(size - back)
        tail = f.read(back)
        i = tail.rfind(b'PK\x05\x06')
        if i < 0 or len(tail) - i < 22:
            return None
        count, cd = struct.unpack('<HI', tail[i + 10:i + 16])
        at = size - back + i                      # la place de l'enregistrement de fin dans le fichier
        if at >= 20 + 56:
            f.seek(at - 20)
            loc = f.read(20)
            if loc[:4] == b'PK\x06\x07':          # un localisateur zip64 le précède : le vrai nombre et la vraie taille sont dans l'enregistrement zip64 qu'il désigne (zipfile le suit : des « données étendues » peuvent s'intercaler avant lui)
                reloff = struct.unpack('<Q', loc[8:16])[0] if len(loc) == 20 else -1
                found = None
                for pos in {reloff, at - 20 - 56}:       # le décalage du localisateur ET la place fixe (juste avant lui) : selon la version de Python, zipfile suit l'un ou l'autre ; on retient le plus grand des deux
                    if 0 <= pos <= at - 20 - 56:
                        f.seek(pos)
                        rec = f.read(56)
                        if len(rec) == 56 and rec[:4] == b'PK\x06\x06':
                            got = struct.unpack('<QQ', rec[32:48])
                            found = got if not found else (max(found[0], got[0]), max(found[1], got[1]))
                if not found:
                    return MAX_MEMBERS + 1, CD_MAX + 1      # un zip64 dont l'enregistrement ne se trouve nulle part : refusé sans l'ouvrir
                count, cd = found
        return count, cd


def _eaip_package(path, names, kind):
    """Un eAIP pris à la main (SOG-0244) reconnu par son CONTENU : un zip qui porte une image ISO ou le dossier de l'eAIP (kind 'zip', `names` : ses membres), ou une image ISO seule (kind 'iso'). Rend { source: 'navpt', zone: 'pt', name, cycle (l'édition lue dans le titre des pages) }
    ou None si ce n'est pas un paquet d'eAIP ; lève Refused avec la raison EN CLAIR si c'en est un qui n'est pas celui du Portugal ou qui ne se lit pas (« ISO illisible : … »). Rien n'est extrait : tools/eaip_annexe15.read_package lit les pages par leur titre."""
    import eaip_annexe15 as core
    if kind == 'zip':
        low = [n.replace('\\', '/').lower() for n in names]
        if not (any(n.endswith('.iso') for n in low) or any('eaip/html/eaip' in n for n in low)):
            return None
    try:
        page44, routes, issue = core.read_package(core.PROFILES['pt'], path)
    except ValueError as e:
        raise Refused('unrecognised', f'eAIP pris à la main non reconnu : {e}', EXPECTED) from None
    return {'source': 'navpt', 'zone': 'pt', 'name': 'navpt_eaip.zip' if kind == 'zip' else 'navpt_eaip.iso', 'cycle': issue}


def _airac_ids(today=None):
    """Les identifiants EUROCONTROL du cycle en vigueur et du suivant (« 2611 », « 2612 » : année sur deux chiffres, numéro du cycle)."""
    import datetime
    import aero_cycles
    today = today or datetime.date.today()
    out = []
    for iso in (aero_cycles.airac_start(today), aero_cycles.airac_start(today + datetime.timedelta(days=28))):
        d = datetime.date.fromisoformat(iso)
        first = datetime.date.fromisoformat(aero_cycles.airac_start(datetime.date(d.year, 1, 1)))
        if first.year < d.year:
            first += datetime.timedelta(days=28)
        out.append(f'{d.year % 100:02d}{(d - first).days // 28 + 1:02d}')
    return out


def recognise(path, hint='', today=None):
    """Ce que le CONTENU du fichier dit : { source, zone, name (le nom canonique que base/pickup retrouve), cycle } ; lève Refused (type, unrecognised). Un zip : la liste de ses membres seulement."""
    with open(path, 'rb') as f:
        head = f.read(8)
    if head[:4] == b'PK\x03\x04':
        dirinfo = _directory(path)
        if dirinfo and (dirinfo[0] > MAX_MEMBERS or dirinfo[1] > CD_MAX):
            raise Refused('unrecognised', 'trop de membres', EXPECTED)        # avant de construire l'annuaire : ZipFile le lit entier en mémoire
        try:
            z = zipfile.ZipFile(path)
        except (zipfile.BadZipFile, OSError):
            raise Refused('type', 'zip illisible') from None
        with z:
            infos = z.namelist()
            if len(infos) > MAX_MEMBERS:
                raise Refused('unrecognised', 'trop de membres', EXPECTED)
            names = set(infos)
            pkg = _eaip_package(path, [i for i in infos], 'zip')
            if pkg:
                return pkg
            try:
                import lfv_eaip
                if lfv_eaip.COVER in names and lfv_eaip.ENR44 in names:
                    return {'source': 'lfv', 'zone': 'se', 'name': 'AIP_OFFLINE.zip', 'cycle': None}
            except ImportError:
                pass
            sub = SUB_NAME.fullmatch(hint or '')                  # SOG-0273 : l'abonnement NASR COMPLET (un seul fichier, ses jeux CSV dans CSV_Data/) : le nom dit le cycle, le contenu dit que c'en est un
            if sub and any(INNER_MEMBER.fullmatch(n) for n in names) and 'FIX.txt' in names:
                iso = _date_ok(sub.group(1))
                if iso:
                    return {'source': 'faa', 'zone': 'us', 'name': f'28DaySubscription_Effective_{iso}.zip', 'cycle': iso}
            nasr = NASR_NAME.match(hint or '')                    # le NASR de la FAA (SOG-0219 : la page de l'abonnement refuse le lanceur, le fichier se dépose à la main) : le contenu dit le jeu, le nom dit le cycle
            if nasr and NASR_MEMBER[nasr.group(4)] in names:
                months = ('Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec')
                if nasr.group(2) in months:
                    iso = _date_ok(f'{nasr.group(3)}-{months.index(nasr.group(2)) + 1:02d}-{nasr.group(1)}')
                    if iso:
                        return {'source': 'faa', 'zone': 'us', 'name': f'{nasr.group(1)}_{nasr.group(2)}_{nasr.group(3)}_{nasr.group(4)}_CSV.zip', 'cycle': iso}
            book = 'rad' if RAD_NAME.match(hint or '') else 'fra' if FRA_NAME.match(hint or '') else ''
            if book and '[Content_Types].xml' in names and 'xl/workbook.xml' in names:          # SOG-0237 : un classeur d'EUROCONTROL (RAD, points FRA) : posé sous son nom d'origine, que route/import-rad lit comme Téléchargements
                return {'source': 'eurocontrol_rad', 'kind': book, 'zone': '', 'name': re.sub(r' \(\d+\)(?=\.xlsx$)', '', hint, flags=re.I), 'cycle': None}
            fra = [(n, m.group(1), m.group(2)) for n in names if (m := FRA_MEMBER.match(n))]
            if len(fra) >= 2 and '[Content_Types].xml' not in names:       # une archive de classeurs FRA : ceux du cycle en vigueur et du suivant, reconnus par leur nom de membre
                ids = _airac_ids(today)
                take = [(n, base) for n, base, cid in fra if cid in ids]
                if not take:
                    raise Refused('unrecognised', f'aucun classeur FRA du cycle en vigueur ({ids[0]}) ni du suivant ({ids[1]}) dans cette archive', EXPECTED)
                return {'source': 'eurocontrol_rad', 'kind': 'fra', 'zone': '', 'name': take[0][1], 'cycle': None, 'take': take}
            sia = sorted(m.group(1) for n in names if (m := SIA_MEMBER.match(n)))
            if sia:
                return {'source': 'sia', 'zone': 'fr', 'name': f'export_xml_bd_SIA_{sia[-1]}.zip', 'cycle': sia[-1]}
            nats = [(m.group(1).upper(), _date_ok(m.group(2))) for n in names if (m := NATS_MEMBER.match(n)) and not re.search(r'DIFF|DELTA', n, re.I)]
            nats = [x for x in nats if x[1]]
            if nats:
                kind, date = sorted(nats, key=lambda x: x[1])[-1]
                return {'source': 'nats', 'zone': 'gb', 'name': f'EG_{kind}_DS_{date.replace("-", "")}_XML.zip', 'cycle': date}
        raise Refused('unrecognised', 'le contenu de ce zip ne ressemble à aucune source attendue', EXPECTED)
    if os.path.getsize(path) > 0x8006:          # une image ISO seule (SOG-0244) : « CD001 » au secteur 16, ce que ni le zip ni le JSON ni le PDF ne disent
        with open(path, 'rb') as f:
            f.seek(0x8000)
            vd = f.read(8)
        if vd[1:6] == b'CD001':
            return _eaip_package(path, [], 'iso')
    first = head.lstrip()[:1]
    if first in (b'{', b'['):
        m = OPENAIP_NAME.match(hint or '')
        if not m:
            raise Refused('unrecognised', 'un JSON dont le nom n’est pas « <pays>_<asp|apt|nav|rpp>.geojson » : pas un export d’openAIP', EXPECTED)
        return {'source': 'openaip', 'zone': m.group('cc').lower(), 'name': f'{m.group("cc").lower()}_{m.group("layer").lower()}.{m.group("ext").lower()}', 'cycle': None}
    if head[:4] == b'%PDF' and re.fullmatch(r'MIAM_OACI_ENR 5\.7(?: \(\d+\))?\.pdf', hint or '', re.I):      # SOG-0273 : l'ENR 5.7 du MIAM (CD DIRCAM du SIA, sorti du zip par la page) : gardé tel quel ; c'est la PAGE qui le lit (pdf.js → miam-enr-5-7-tracks.xml), le lanceur n'a pas de lecteur de PDF
        return {'source': 'dircam', 'zone': 'fr', 'name': 'MIAM_OACI_ENR 5.7.pdf', 'cycle': None}
    if head[:4] == b'%PDF' and re.fullmatch(r'ENR-5-2(?: \(\d+\))?\.pdf', hint or ''):         # l'ENR 5.2 de l'AIP militaire britannique (SOG-0234 : le serveur coupe la connexion TLS du lanceur)
        return {'source': 'ukmil', 'zone': 'gb', 'name': 'ENR-5-2.pdf', 'cycle': None}
    if head[:4] == b'%PDF' or first == b'<':
        raise Refused('unrecognised', 'ce type de fichier (PDF, XML seul) n’est pas pris par cet envoi', EXPECTED)
    raise Refused('type', 'ni zip, ni JSON, ni PDF, ni XML')


def _sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while chunk := f.read(CHUNK):
            h.update(chunk)
    return h.hexdigest()


def _drop(path):
    try:
        os.unlink(path)
    except OSError:
        pass


def receive(rfile, length, hint, data, busy=None, merge_pending=None):
    """Reçoit `length` octets de rfile, les reconnaît, les pose sous data/local/upload/. Rend (statut HTTP, corps JSON) ; `close` dans le corps (clé « _close ») : le lanceur coupe la connexion (un refus avant lecture du corps).
    busy() : un travail du lanceur tourne ; merge_pending() : une fusion interrompue attend dans data/."""
    def no(reason, message='', expected=None, close=False, running=None):
        return STATUS[reason], {'ok': False, 'reason': reason, 'message': message or reason, **({'expected': list(expected)} if expected else {}), **({'running': running} if running else {}), **({'_close': True} if close else {})}
    if not isinstance(length, int) or length <= 0:
        return no('empty', 'fichier vide', close=True)
    if length > MAX_BYTES:
        return no('too-large', f'plus de {MAX_BYTES // (1024 * 1024)} Mo', close=True)
    running = busy() if busy else None
    if running:
        return no('busy', 'un travail du poste tourne : réessayez à sa fin', close=True, running=running if isinstance(running, dict) else None)      # SOG-0245 : quel travail (nom, départ, étape, signes de vie), que l'écran dit et sait arrêter
    if merge_pending and merge_pending():
        return no('merge-pending', 'une fusion interrompue attend dans data/ : « Synchroniser » la règle', close=True)
    folder = os.path.join(data, *FOLDER)
    base = os.path.realpath(data)
    try:
        os.makedirs(folder, exist_ok=True)
        real = os.path.realpath(folder)
        if os.path.commonpath([real, base]) != base:
            return no('disk', 'dossier hors de data/', close=True)
        for n in os.listdir(folder):                       # les restes d'un envoi coupé, vieux d'une heure
            p = os.path.join(folder, n)
            if n.startswith('.recv-') and n.endswith('.part') and time.time() - os.path.getmtime(p) > 3600:
                _drop(p)
    except OSError as e:
        return no('disk', str(e)[:120], close=True)
    tmp = os.path.join(folder, f'.recv-{secrets.token_hex(6)}.part')
    h, got = hashlib.sha256(), 0
    try:
        with open(tmp, 'wb') as out:
            while got < length:
                chunk = rfile.read(min(CHUNK, length - got))
                if not chunk:
                    break                                  # l'envoi s'est arrêté avant la fin (annulé par la page)
                out.write(chunk)
                h.update(chunk)
                got += len(chunk)
        if got != length:
            _drop(tmp)
            return no('empty', 'envoi interrompu', close=True)
        try:
            info = recognise(tmp, clean_hint(hint))
        except Refused as r:
            _drop(tmp)
            return no(r.reason, r.message, r.expected, close=False)
        except (OSError, ValueError, zipfile.BadZipFile) as e:
            _drop(tmp)
            return no('type', str(e)[:120])
        if info.get('take'):                               # une archive dont on ne prend que des membres (SOG-0273) : ils sont posés sous leur nom, l'archive n'est pas gardée
            try:
                with zipfile.ZipFile(tmp) as z:
                    done = []
                    for member, base in info['take']:
                        zi = z.getinfo(member)
                        if zi.file_size > TAKE_MAX:
                            raise Refused('unrecognised', f'{base} : trop gros pour un classeur', EXPECTED)
                        body = z.read(member)
                        part = os.path.join(folder, f'.recv-{secrets.token_hex(6)}.part')
                        with open(part, 'wb') as out:
                            out.write(body)
                        os.replace(part, os.path.join(folder, base))
                        done.append(base)
            except Refused as r:
                _drop(tmp)
                return no(r.reason, r.message, r.expected, close=False)
            except (OSError, ValueError, KeyError, zipfile.BadZipFile) as e:
                _drop(tmp)
                return no('type', str(e)[:120])
            _drop(tmp)
            return 200, {'ok': True, 'source': info['source'], 'zone': info['zone'], 'name': done[0], 'names': done, 'kind': info.get('kind', ''), 'size': got, 'replaced': True, 'sha256': h.hexdigest()}
        dest = os.path.join(folder, info['name'])
        digest = h.hexdigest()
        replaced = True
        if os.path.isfile(dest) and not os.path.islink(dest) and os.path.getsize(dest) == got and _sha(dest) == digest:
            _drop(tmp)
            replaced = False
        else:
            os.replace(tmp, dest)
        extra = {'kind': info['kind']} if info.get('kind') else {}           # eurocontrol_rad : 'rad' ou 'fra' (le classeur)
        if info['source'] == 'faa':                      # le NASR arrive en trois jeux : ce qui est déjà posé pour ce cycle et ce qui manque (SOG-0219), pour que l'écran n'ait pas à compter
            if SUB_NAME.fullmatch(info['name']):             # l'abonnement complet vaut les trois jeux
                have = sorted(NASR_MEMBER)
            else:
                have = sorted(k for k in NASR_MEMBER if os.path.isfile(os.path.join(folder, NASR_NAME.sub(lambda m: f'{m.group(1)}_{m.group(2)}_{m.group(3)}_{k}_CSV.zip', info['name']))))
            extra = {'deposited': have, 'missing': [k for k in NASR_MEMBER if k not in have]}
        return 200, {'ok': True, 'source': info['source'], 'zone': info['zone'], 'name': info['name'], 'size': got, **({'cycle': info['cycle']} if info['cycle'] else {}), **extra, 'replaced': replaced, 'sha256': digest}
    except OSError as e:
        _drop(tmp)
        return no('disk', str(e)[:120])
