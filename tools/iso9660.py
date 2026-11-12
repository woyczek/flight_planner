"""Lecteur d'images ISO 9660 en Python pur, en LECTURE SEULE et BORNÉ (V3, 12 nov. 2026, SOG-0244 : l'AIP du Portugal se télécharge en ISO, dans un zip).

Ce que lit ce module : un fichier .iso (ou son contenu rendu par l'appelant) au format ISO 9660 : le descripteur primaire (signature « CD001 » au secteur 16), le supplémentaire Joliet s'il existe (noms longs en UCS-2), l'arbre des dossiers
et les octets d'un fichier. L'image de l'eAIP du Portugal est de NIVEAU 1 pur (ni Joliet, ni Rock Ridge, ni UDF) : ses noms sont tronqués en 8.3 (« LP_ENR33.HTM »), ce que l'appelant résout par le contenu (le titre d'une page), jamais par le nom.
Ce que ce module ne fait pas : UDF, Rock Ridge, El Torito, fichiers multi-extents ; il ne monte rien, n'exécute rien, n'écrit rien. Un fichier d'une image est une ENTRÉE NON FIABLE : tout est borné (profondeur, nombre d'entrées, taille lue,
extents dans l'image) et chaque refus lève `IsoError` avec sa raison en clair. Bibliothèque standard seulement."""
import os
import struct

SECTOR = 2048
MAX_ENTRIES = 50000          # entrées d'une image : au-delà, ce n'est pas l'image attendue
MAX_DEPTH = 12
MAX_READ = 32 * 1024 * 1024  # un fichier lu d'une image (une page d'eAIP : moins de 2 Mo)
MAX_DIR = 4 * 1024 * 1024    # un dossier de l'image


class IsoError(ValueError):
    """Image illisible ou hors des bornes : le message est la raison en clair."""


def looks_like_iso(head_at_0x8000):
    """Vrai si les octets lus à 0x8000 portent un descripteur ISO 9660 (« \\x01CD001 »)."""
    return head_at_0x8000[1:6] == b'CD001'


class Iso:
    """Une image ISO 9660 ouverte (objet fichier binaire à accès direct : open(path, 'rb')). Ne ferme pas le fichier."""

    def __init__(self, f, size=None):
        self.f = f
        if size is None:
            f.seek(0, os.SEEK_END)
            size = f.tell()
        self.size = size
        self.joliet = False
        self.label = ''
        self.root = None
        self._volumes()

    def _read(self, off, n):
        if off < 0 or n < 0 or off + n > self.size:
            raise IsoError('extent hors de l’image')
        self.f.seek(off)
        b = self.f.read(n)
        if len(b) != n:
            raise IsoError('image tronquée')
        return b

    def _volumes(self):
        prim = joliet = None
        for s in range(16, 40):
            if (s + 1) * SECTOR > self.size:
                break
            d = self._read(s * SECTOR, SECTOR)
            if d[1:6] != b'CD001':
                if s == 16:
                    raise IsoError('pas une image ISO 9660 (signature CD001 absente)')
                break
            if d[0] == 255:
                break
            if d[0] == 1 and prim is None:
                prim = d
            elif d[0] == 2 and d[88:91] in (b'%/@', b'%/C', b'%/E'):      # Joliet : séquence d'échappement UCS-2
                joliet = d
        if prim is None:
            raise IsoError('descripteur de volume primaire absent')
        vol = joliet or prim
        self.joliet = joliet is not None
        self.label = prim[40:72].decode('ascii', 'replace').strip()
        self.root = self._record(vol[156:190], 0)

    def _record(self, rec, off):
        return {'extent': struct.unpack('<I', rec[2:6])[0], 'size': struct.unpack('<I', rec[10:14])[0], 'dir': bool(rec[25] & 2)}

    def _entries(self, ext, size):
        if size > MAX_DIR:
            raise IsoError('dossier de l’image trop grand')
        data = self._read(ext * SECTOR, size)
        i, out = 0, []
        while i < len(data):
            n = data[i]
            if n == 0:
                i = (i // SECTOR + 1) * SECTOR
                continue
            if n < 34 or i + n > len(data):
                raise IsoError('enregistrement de dossier invalide')
            nlen = data[i + 32]
            raw = data[i + 33:i + 33 + nlen]
            if raw in (b'\x00', b'\x01'):
                i += n
                continue
            name = raw.decode('utf-16-be', 'replace') if self.joliet else raw.decode('ascii', 'replace')
            name = name.split(';')[0].rstrip('.')
            out.append((name, self._record(data[i:i + n], i)))
            i += n
        return out

    def walk(self):
        """{ chemin (« / », sans le « ;1 ») : (extent, taille) } de tous les fichiers de l'image, bornés (profondeur, nombre d'entrées)."""
        out, stack, count = {}, [('', self.root, 0)], 0
        while stack:
            prefix, d, depth = stack.pop()
            if depth > MAX_DEPTH:
                raise IsoError('arborescence trop profonde')
            for name, r in self._entries(d['extent'], d['size']):
                count += 1
                if count > MAX_ENTRIES:
                    raise IsoError('trop d’entrées dans l’image')
                path = prefix + '/' + name if prefix else name
                if r['dir']:
                    stack.append((path, r, depth + 1))
                else:
                    out[path] = (r['extent'], r['size'])
        return out

    def read(self, entry, limit=MAX_READ):
        """Les octets d'un fichier (extent, taille) de walk() ; IsoError s'il dépasse `limit`."""
        ext, size = entry
        if size > limit:
            raise IsoError('fichier de l’image trop grand')
        return self._read(ext * SECTOR, size)
