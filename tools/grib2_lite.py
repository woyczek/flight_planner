"""Lecture minimale de GRIB2 en Python standard (tools/build_world_weather.py) : ce que publie NOMADS pour GFS.

Couvre : grille latitude / longitude régulière (modèle de grille 3.0), produits 4.0 et 4.8 (instantané, moyenne ou
cumul : seuls la catégorie, le paramètre et la surface sont lus), compressions 5.0 (simple) et 5.3 (complexe avec
différences spatiales d'ordre 1 ou 2), masque de points (section 6) ; pas de JPEG 2000 (5.40) ni de PNG (5.41), que
GFS 1° n'emploie pas. Référence : WMO Manual on Codes, FM 92 GRIB édition 2.

API : messages(octets) → [{ discipline, category, number, surface, level, ni, nj, lat1, lon1, di, dj, scan, values }]
(values : liste de ni × nj nombres ou None, dans l'ordre du fichier, ligne par ligne selon scan).
"""
import struct


def _sm(raw, bits):
    """Entier signé « signe et grandeur » (le bit de poids fort est le signe), comme GRIB2 les écrit."""
    top = 1 << (bits - 1)
    return -(raw & (top - 1)) if raw & top else raw


class _Bits:
    """Lecteur de bits (poids fort d'abord) sur des octets."""

    def __init__(self, data, pos=0):
        self.data = data
        self.bit = pos * 8

    def read(self, n):
        if n == 0:
            return 0
        start = self.bit >> 3
        end = (self.bit + n + 7) >> 3
        chunk = int.from_bytes(self.data[start:end], 'big')
        shift = (end - start) * 8 - (self.bit & 7) - n
        self.bit += n
        return (chunk >> shift) & ((1 << n) - 1)

    def align(self):
        self.bit = (self.bit + 7) & ~7

    @property
    def byte(self):
        return self.bit >> 3


def _grid(s):
    """Section 3, modèle 3.0 (latitude / longitude régulière)."""
    tmpl = struct.unpack('>H', s[12:14])[0]
    if tmpl != 0:
        raise ValueError(f'grille {tmpl} non prise en charge')
    ni, nj = struct.unpack('>II', s[30:38])
    la1 = _sm(struct.unpack('>I', s[46:50])[0], 32) / 1e6
    lo1 = struct.unpack('>I', s[50:54])[0] / 1e6
    la2 = _sm(struct.unpack('>I', s[55:59])[0], 32) / 1e6
    lo2 = struct.unpack('>I', s[59:63])[0] / 1e6
    di, dj = (v / 1e6 for v in struct.unpack('>II', s[63:71]))
    return {'ni': ni, 'nj': nj, 'lat1': la1, 'lon1': lo1, 'lat2': la2, 'lon2': lo2, 'di': di, 'dj': dj, 'scan': s[71]}


def _product(s):
    """Section 4 : catégorie, paramètre, type et valeur de la première surface (modèles 4.0 à 4.15 : mêmes octets)."""
    tmpl = struct.unpack('>H', s[7:9])[0]
    if tmpl > 15:
        raise ValueError(f'produit {tmpl} non pris en charge')
    scale = _sm(s[23], 8)
    value = _sm(struct.unpack('>I', s[24:28])[0], 32)
    return {'category': s[9], 'number': s[10], 'surface': s[22], 'level': value / 10 ** scale if scale else value}


def _unpack(s5, s6, s7, npts):
    """Sections 5, 6, 7 → valeurs (None hors du masque)."""
    tmpl = struct.unpack('>H', s5[9:11])[0]
    ref = struct.unpack('>f', s5[11:15])[0]
    e = _sm(struct.unpack('>H', s5[15:17])[0], 16)
    d = _sm(struct.unpack('>H', s5[17:19])[0], 16)
    nbits = s5[19]
    k2, k10 = 2.0 ** e, 10.0 ** -d
    data = s7[5:]
    ndata = struct.unpack('>I', s5[5:9])[0]
    if tmpl == 0:
        if nbits == 0:
            ints = [0] * ndata
        else:
            b = _Bits(data)
            ints = [b.read(nbits) for _ in range(ndata)]
    elif tmpl == 3:
        if s5[22] != 0:
            raise ValueError('valeurs manquantes codées (5.3) non prises en charge')
        ng = struct.unpack('>I', s5[31:35])[0]
        wref, wbits = s5[35], s5[36]
        lref = struct.unpack('>I', s5[37:41])[0]
        linc, llast, lbits = s5[41], struct.unpack('>I', s5[42:46])[0], s5[46]
        order, ndesc = s5[47], s5[48]
        b = _Bits(data)
        ival1 = _sm(b.read(8 * ndesc), 8 * ndesc)
        ival2 = _sm(b.read(8 * ndesc), 8 * ndesc) if order == 2 else 0
        minsd = _sm(b.read(8 * ndesc), 8 * ndesc)
        refs = [b.read(nbits) for _ in range(ng)]
        b.align()
        widths = [wref + b.read(wbits) for _ in range(ng)]
        b.align()
        lens = [lref + linc * b.read(lbits) for _ in range(ng)]
        b.align()
        if ng:
            lens[-1] = llast
        ints = []
        for g in range(ng):
            w, r = widths[g], refs[g]
            if w == 0:
                ints.extend([r] * lens[g])
            else:
                ints.extend(r + b.read(w) for _ in range(lens[g]))
        ints = ints[:ndata]
        if order == 1 and ints:
            ints[0] = ival1
            for i in range(1, len(ints)):
                ints[i] += minsd + ints[i - 1]
        elif order == 2 and len(ints) > 1:
            ints[0], ints[1] = ival1, ival2
            for i in range(2, len(ints)):
                ints[i] += minsd + 2 * ints[i - 1] - ints[i - 2]
    else:
        raise ValueError(f'compression {tmpl} non prise en charge')
    vals = [(ref + v * k2) * k10 for v in ints]
    if s6 is None or s6[5] == 255:
        return vals
    if s6[5] != 0:
        raise ValueError('masque prédéfini non pris en charge')
    mask = _Bits(s6[6:])
    it = iter(vals)
    return [next(it) if mask.read(1) else None for _ in range(npts)]


def messages(buf):
    """Tous les messages GRIB2 d'un fichier (octets)."""
    out, i = [], 0
    while True:
        i = buf.find(b'GRIB', i)
        if i < 0:
            return out
        if buf[i + 7] != 2:
            raise ValueError('GRIB édition 1 non prise en charge')
        discipline = buf[i + 6]
        total = struct.unpack('>Q', buf[i + 8:i + 16])[0]
        j, end = i + 16, i + total - 4
        grid = s5 = s6 = prod = None
        while j < end:
            ln, sec = struct.unpack('>I', buf[j:j + 4])[0], buf[j + 4]
            s = buf[j:j + ln]
            if sec == 3:
                grid = _grid(s)
            elif sec == 4:
                prod = _product(s)
            elif sec == 5:
                s5 = s
            elif sec == 6:
                s6 = s if s[5] != 254 else s6  # 254 : le masque précédent
            elif sec == 7:
                out.append({'discipline': discipline, **prod, **grid,
                            'values': _unpack(s5, s6, s, grid['ni'] * grid['nj'])})
            j += ln
        i += total
