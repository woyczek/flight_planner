"""Les zips qu'on n'a pas écrits (Téléchargements, dépôts) sont ouverts par ICI (SOG-0273, relecture Sécurisation 12/11) : `zipfile.ZipFile` construit tout l'annuaire en mémoire avant le moindre contrôle (250 000 entrées : 138 Mo ; un zip piégé de 1,5 Go : plusieurs Go). `directory` lit le nombre d'entrées et la taille de l'annuaire dans
l'enregistrement de fin du zip (les derniers octets, zip64 compris) SANS construire l'annuaire ; `open_zip` refuse (BadZipFile) un zip qui dépasse MAX_MEMBERS entrées ou CD_MAX octets d'annuaire, avant de l'ouvrir. Bibliothèque standard seulement."""
import os
import struct
import zipfile

MAX_MEMBERS = 200000                    # un zip de plus de membres : pas une archive attendue
CD_MAX = 64 * 1024 * 1024               # un annuaire de plus de 64 Mo : idem


def directory(path):
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


def open_zip(path):
    """ZipFile(path) après contrôle de l'enregistrement de fin : BadZipFile (« trop de membres ») au-delà des plafonds ; l'annuaire n'est alors pas lu."""
    info = directory(path)
    if info and (info[0] > MAX_MEMBERS or info[1] > CD_MAX):
        raise zipfile.BadZipFile('trop de membres')
    return zipfile.ZipFile(path)
