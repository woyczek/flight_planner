"""Décodeur QR indépendant (grille de modules parfaite) pour vérifier frame/lib/qr.js.

Usage : ouvrir frame/lib/test/qr.html, copier « Grilles » dans un fichier, puis python frame/lib/test/qr_check.py <fichier>.
Entrée : JSON [{ text, version, ecl, mask, rows: ["0101…", …] }, …]. Pour chaque code : format (BCH, les deux copies),
version (BCH, v ≥ 7), démasquage, lecture en zigzag, désentrelacement, syndromes Reed-Solomon nuls dans chaque bloc
(calcul par évaluation, distinct de la division de l'encodeur), mode octets, texte identique.
"""
import json
import sys

EXP = [0] * 512
LOG = [0] * 256
x = 1
for i in range(255):
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if x & 0x100:
        x ^= 0x11D
for i in range(255, 512):
    EXP[i] = EXP[i - 255]


def gmul(a, b):
    return 0 if a == 0 or b == 0 else EXP[LOG[a] + LOG[b]]


def poly_eval(cw, a):
    """Évalue le polynôme (coefficients du plus fort au plus faible) en a."""
    r = 0
    for c in cw:
        r = gmul(r, a) ^ c
    return r


# capacités connues (norme) pour contrôler les tables : (version, niveau) → octets en mode octets
KNOWN_BYTES = {(1, 'L'): 17, (1, 'M'): 14, (1, 'Q'): 11, (1, 'H'): 7, (10, 'L'): 271, (10, 'M'): 213, (10, 'H'): 119,
               (20, 'M'): 666, (25, 'L'): 1273, (40, 'L'): 2953, (40, 'M'): 2331, (40, 'Q'): 1663, (40, 'H'): 1273}
ECC = {'L': [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
       'M': [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28]}
BLK = {'L': [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
       'M': [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49]}
FMT_ECL = {1: 'L', 0: 'M', 3: 'Q', 2: 'H'}


def bch_ok(value, gen, nbits):
    r = value
    for i in range(nbits - 1, -1, -1):
        if r >> i & 1 and i >= gen.bit_length() - 1:
            r ^= gen << (i - gen.bit_length() + 1)
    return r == 0


def is_function(x, y, size, ver):
    if x == 6 or y == 6:
        return True
    if (x < 9 and y < 9) or (x >= size - 8 and y < 9) or (x < 9 and y >= size - 8):
        return True
    if ver >= 7 and ((x >= size - 11 and y < 6) or (y >= size - 11 and x < 6)):
        return True
    if ver >= 2:
        n = ver // 7 + 2
        step = 26 if ver == 32 else -(-(ver * 4 + 4) // (n * 2 - 2)) * 2
        pos = [6] + sorted([ver * 4 + 10 - step * k for k in range(n - 1)])
        for i, ax in enumerate(pos):
            for j, ay in enumerate(pos):
                if (i, j) in ((0, 0), (0, n - 1), (n - 1, 0)):
                    continue
                if abs(x - ax) <= 2 and abs(y - ay) <= 2:
                    return True
    return False


def decode(c):
    rows = c['rows']
    size = len(rows)
    ver = (size - 17) // 4
    g = lambda x, y: rows[y][x] == '1'
    # format : première copie
    b = [g(8, i) for i in range(6)] + [g(8, 7), g(8, 8), g(7, 8)] + [g(14 - i, 8) for i in range(9, 15)]
    f1 = sum(int(v) << i for i, v in enumerate(b))
    b2 = [g(size - 1 - i, 8) for i in range(8)] + [g(8, size - 15 + i) for i in range(8, 15)]
    f2 = sum(int(v) << i for i, v in enumerate(b2))
    assert f1 == f2, 'format copies differ'
    raw = f1 ^ 0x5412
    assert bch_ok(raw, 0x537, 15), 'format BCH'
    ecl, mask = FMT_ECL[raw >> 13], (raw >> 10) & 7
    assert g(8, size - 8), 'dark module'
    if ver >= 7:
        vb = sum(int(g(size - 11 + i % 3, i // 3)) << i for i in range(18))
        vb2 = sum(int(g(i // 3, size - 11 + i % 3)) << i for i in range(18))
        assert vb == vb2 and vb >> 12 == ver and bch_ok(vb, 0x1F25, 18), 'version info'
    masks = [lambda x, y: (x + y) % 2 == 0, lambda x, y: y % 2 == 0, lambda x, y: x % 3 == 0, lambda x, y: (x + y) % 3 == 0,
             lambda x, y: (x // 3 + y // 2) % 2 == 0, lambda x, y: x * y % 2 + x * y % 3 == 0,
             lambda x, y: (x * y % 2 + x * y % 3) % 2 == 0, lambda x, y: ((x + y) % 2 + x * y % 3) % 2 == 0]
    bits = []
    right = size - 1
    while right >= 1:
        if right == 6:
            right = 5
        up = ((right + 1) & 2) == 0
        for v in range(size):
            y = size - 1 - v if up else v
            for j in range(2):
                x = right - j
                if not is_function(x, y, size, ver):
                    bits.append(int(g(x, y)) ^ int(masks[mask](x, y)))
        right -= 2
    nraw = len(bits) // 8
    words = [int(''.join(map(str, bits[i * 8:i * 8 + 8])), 2) for i in range(nraw)]
    nb, ec = BLK[ecl][ver], ECC[ecl][ver]
    nshort = nb - nraw % nb
    shortlen = nraw // nb
    blocks = [[] for _ in range(nb)]
    k = 0
    for i in range(shortlen + 1):
        for j in range(nb):
            if i == shortlen - ec and j < nshort:
                continue
            if k < len(words):
                blocks[j].append(words[k])
                k += 1
    data = []
    for j, bl in enumerate(blocks):
        assert all(poly_eval(bl, EXP[i]) == 0 for i in range(ec)), f'RS syndrome block {j}'
        data += bl[:len(bl) - ec]
    s = ''.join(f'{w:08b}' for w in data)
    assert s[:4] == '0100', 'byte mode'
    cb = 8 if ver <= 9 else 16
    n = int(s[4:4 + cb], 2)
    out = bytes(int(s[4 + cb + 8 * i:12 + cb + 8 * i], 2) for i in range(n)).decode('utf-8')
    return ver, ecl, mask, out


def capacity(ver, ecl):
    raw = (16 * ver + 128) * ver + 64
    if ver >= 2:
        a = ver // 7 + 2
        raw -= (25 * a - 10) * a - 55
        if ver >= 7:
            raw -= 36
    dcw = raw // 8 - ECC[ecl][ver] * BLK[ecl][ver]
    return (dcw * 8 - 4 - (8 if ver <= 9 else 16)) // 8


if __name__ == '__main__':
    for (v, e), want in KNOWN_BYTES.items():
        if e in ECC:
            got = capacity(v, e)
            print(f'capacity {v}-{e}: {got} (norme {want})', 'OK' if got == want else 'ÉCART')
    for c in json.load(open(sys.argv[1], encoding='utf-8')):
        try:
            ver, ecl, mask, text = decode(c)
            print(f"v{ver} {ecl} masque {mask} : {'OK' if text == c['text'] else 'TEXTE DIFFÉRENT'} ({len(c['text'])} car.)")
        except AssertionError as err:
            print(f"v{c['version']} ÉCHEC : {err}")
