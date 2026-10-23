(() => {
  'use strict';
  // V3 — générateur de code QR en JavaScript pur, sans dépendance (propriétaire : settings ; frame/settings/SPEC.md § 5) :
  // mode octets (UTF-8), versions 1 à 40, correction L / M / Q / H, masque choisi par la pénalité de la norme
  // (ISO/IEC 18004). Sert au lien de configuration d'un pilote, scanné avec son téléphone.
  // API : window.SogQR = { encode(texte, { ecl: 'M', minVersion: 1 }) → { version, size, ecl, mask, dark(x, y) },
  //   svg(texte, { ecl, border: 4, scale: 4 }) → balise <svg> (modules sombres sur fond blanc, quel que soit le thème) }.
  const ECL = {
    L: [0, 1],
    M: [1, 0],
    Q: [2, 3],
    H: [3, 2]
  }; // niveau → [rang dans les tables, bits du format]
  // codes de correction par bloc et nombre de blocs, par niveau (L, M, Q, H) puis par version (indice 0 inutilisé)
  const ECC_PER_BLOCK = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30,
      30, 30, 30, 30, 30, 30, 30, 30
    ],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
      28, 28, 28, 28, 28, 28, 28, 28
    ],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30,
      30, 30, 30, 30, 30, 30, 30, 30
    ],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
      30, 30, 30, 30, 30, 30, 30, 30
    ]
  ];
  const BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21,
      22, 24, 25
    ],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38,
      40, 43, 45, 47, 49
    ],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51,
      53, 56, 59, 62, 65, 68
    ],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60,
      63, 66, 70, 74, 77, 81
    ]
  ];

  /** Modules de données d'une version (tout sauf les motifs fixes, format et version compris). */
  function rawModules(ver) {
    let n = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const a = Math.floor(ver / 7) + 2;
      n -= (25 * a - 10) * a - 55;
      if (ver >= 7) n -= 36;
    }
    return n;
  }
  /** Mots de données (hors correction) d'une version à un niveau. */
  const dataCodewords = (ver, e) => Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[e][ver] * BLOCKS[e][ver];

  // ---- Reed-Solomon sur GF(256), polynôme 0x11D
  /** Produit dans GF(256). */
  function mul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
  }
  /** Diviseur (générateur) de degré n, coefficients du plus fort au plus faible, le premier (1) omis. */
  function divisor(n) {
    const r = new Array(n).fill(0);
    r[n - 1] = 1;
    let root = 1;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        r[j] = mul(r[j], root);
        if (j + 1 < n) r[j] ^= r[j + 1];
      }
      root = mul(root, 2);
    }
    return r;
  }
  /** Reste de la division des données par le diviseur : les mots de correction. */
  function remainder(data, div) {
    const r = div.map(() => 0);
    for (const b of data) {
      const f = b ^ r.shift();
      r.push(0);
      div.forEach((c, i) => r[i] ^= mul(c, f));
    }
    return r;
  }
  /** Données découpées en blocs, correction ajoutée, puis entrelacées (mot par mot, bloc par bloc). */
  function interleave(data, ver, e) {
    const nb = BLOCKS[e][ver],
      ecLen = ECC_PER_BLOCK[e][ver],
      raw = Math.floor(rawModules(ver) / 8),
      nShort = nb - raw % nb,
      shortLen = Math.floor(raw / nb),
      div = divisor(ecLen),
      blocks = [];
    for (let i = 0, k = 0; i < nb; i++) {
      const d = data.slice(k, k + shortLen - ecLen + (i < nShort ? 0 : 1));
      k += d.length;
      const ec = remainder(d, div);
      if (i < nShort) d.push(0); // place vide des blocs courts, sautée à l'entrelacement
      blocks.push(d.concat(ec));
    }
    const out = [];
    for (let i = 0; i < blocks[0].length; i++)
      blocks.forEach((b, j) => {
        if (i !== shortLen - ecLen || j >= nShort) out.push(b[i]);
      });
    return out;
  }

  /** Positions des centres des motifs d'alignement d'une version. */
  function alignments(ver) {
    if (ver === 1) return [];
    const n = Math.floor(ver / 7) + 2,
      step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2,
      r = [6];
    for (let p = ver * 4 + 10; r.length < n; p -= step) r.splice(1, 0, p);
    return r;
  }

  /** Code QR d'un texte : { version, size, ecl, mask, dark(x, y) } ; erreur s'il est trop long. */
  function encode(text, o = {}) {
    const bytes = [...new TextEncoder().encode(String(text))];
    let level = ECL[o.ecl] ? o.ecl : 'M',
      ver = Math.max(1, Math.min(40, o.minVersion || 1));
    const bitsNeeded = v => 4 + (v <= 9 ? 8 : 16) + bytes.length * 8;
    for (;; ver++) {
      if (ver > 40) {
        if (level === 'L') throw new Error('QR: text too long');
        level = 'L'; // trop long en M : on tente en L avant de refuser
        ver = 1;
      }
      if (bitsNeeded(ver) <= dataCodewords(ver, ECL[level][0]) * 8) break;
    }
    const e = ECL[level][0];
    // flux de bits : mode octets (0100), longueur, octets, terminaison, octets de bourrage
    const bits = [];
    const put = (v, n) => {
      for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1);
    };
    put(4, 4);
    put(bytes.length, ver <= 9 ? 8 : 16);
    bytes.forEach(b => put(b, 8));
    const cap = dataCodewords(ver, e) * 8;
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
    const words = interleave(data, ver, e);

    const size = ver * 4 + 17,
      mod = Array.from({
        length: size
      }, () => new Array(size).fill(false)),
      fixed = Array.from({
        length: size
      }, () => new Array(size).fill(false));
    const set = (x, y, d) => {
      mod[y][x] = d;
      fixed[y][x] = true;
    };
    // motifs fixes : rythme, repères des coins, alignement, version
    for (let i = 0; i < size; i++) {
      set(6, i, i % 2 === 0);
      set(i, 6, i % 2 === 0);
    }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          const d = Math.max(Math.abs(dx), Math.abs(dy)),
            x = cx + dx,
            y = cy + dy;
          if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
        }
    };
    finder(3, 3);
    finder(size - 4, 3);
    finder(3, size - 4);
    const al = alignments(ver),
      na = al.length;
    for (let i = 0; i < na; i++)
      for (let j = 0; j < na; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) continue;
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    const drawFormat = mask => {
      const d = (ECL[level][1] << 3) | mask;
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412,
        bit = i => ((b >>> i) & 1) !== 0;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6));
      set(8, 8, bit(7));
      set(7, 8, bit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
      set(8, size - 8, true); // module sombre fixe
    };
    drawFormat(0); // réserve les places du format
    if (ver >= 7) {
      let r = ver;
      for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
      const b = (ver << 12) | r;
      for (let i = 0; i < 18; i++) {
        const d = ((b >>> i) & 1) !== 0,
          a = size - 11 + i % 3,
          c = Math.floor(i / 3);
        set(a, c, d);
        set(c, a, d);
      }
    }
    // mots de code en zigzag, par paires de colonnes, de droite à gauche
    let k = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < size; v++)
        for (let j = 0; j < 2; j++) {
          const x = right - j,
            y = ((right + 1) & 2) === 0 ? size - 1 - v : v;
          if (!fixed[y][x] && k < words.length * 8) {
            mod[y][x] = ((words[k >>> 3] >>> (7 - (k & 7))) & 1) !== 0;
            k++;
          }
        }
    }
    // masque : les huit essayés, la plus faible pénalité gardée
    const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
      (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0
    ];
    const apply = m => {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++)
          if (!fixed[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x];
    };
    let best = 0,
      low = Infinity;
    for (let m = 0; m < 8; m++) {
      apply(m);
      drawFormat(m);
      const p = penalty(mod, size);
      if (p < low) {
        low = p;
        best = m;
      }
      apply(m); // le même masque, deux fois : retour à l'état d'avant
    }
    apply(best);
    drawFormat(best);
    return {
      version: ver,
      size,
      ecl: level,
      mask: best,
      dark: (x, y) => mod[y][x]
    };
  }
  /** Pénalité d'un dessin (règles N1 à N4 de la norme). */
  function penalty(mod, size) {
    let p = 0;
    const lines = [];
    for (let i = 0; i < size; i++) {
      lines.push(mod[i].map(d => d ? '1' : '0').join(''));
      lines.push(mod.map(r => r[i] ? '1' : '0').join(''));
    }
    for (const l of lines) {
      for (const run of l.match(/0{5,}|1{5,}/g) || []) p += run.length - 2; // N1 : suites de cinq ou plus
      // N3 : motif des repères (1011101) bordé de quatre clairs d'un côté
      for (let i = l.indexOf('1011101'); i >= 0; i = l.indexOf('1011101', i + 1)) {
        const before = l.slice(Math.max(0, i - 4), i),
          after = l.slice(i + 7, i + 11);
        if ((i < 4 || before === '0000') || (i + 11 > l.length || after === '0000')) p += 40;
      }
    }
    let dark = 0;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (mod[y][x]) dark++;
        if (x < size - 1 && y < size - 1) {
          const c = mod[y][x];
          if (mod[y][x + 1] === c && mod[y + 1][x] === c && mod[y + 1][x + 1] === c) p += 3; // N2 : carrés 2×2
        }
      }
    const total = size * size;
    p += Math.ceil(Math.abs(dark * 20 - total * 10) / total - 1) * 10; // N4 : équilibre clair / sombre
    return p;
  }
  /** Balise SVG d'un code QR : modules sombres en un chemin, marge claire de border modules, fond blanc. */
  function svg(text, o = {}) {
    const q = encode(text, o),
      b = o.border ?? 4,
      n = q.size + 2 * b,
      s = o.scale || 4;
    let d = '';
    for (let y = 0; y < q.size; y++)
      for (let x = 0; x < q.size; x++)
        if (q.dark(x, y)) d += `M${x + b},${y + b}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" width="${n * s}" height="${n * s}" shape-rendering="crispEdges" role="img"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }

  window.SogQR = {
    encode,
    svg,
    _rs: {
      divisor,
      remainder
    }, // pour le banc
    _dataCodewords: dataCodewords
  };
})();
