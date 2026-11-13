// V3 — les photos d'un signalement envoyé depuis un appareil sans lanceur (SOG-0335, étape 2 ; relu par Sécurisation).
// Une photo choisie dans la photothèque est RÉDUITE sur l'appareil (canvas : 1 600 px au plus grand côté, WebP ou JPEG, 400 Ko au plus), donc ré-encodée : l'EXIF
// (la position GPS d'une photo de téléphone) n'est jamais recopié. Elle part en base64 dans UN DOCUMENT JSON à côté du signalement :
//   pilot/<trigramme>/signalements/<id>/<n>.json = { schema: 'sog-signalement-image/1', id, n, b64 }   (n de 1 à 3)
// Rien n'est cru de ce qui est écrit dans le document : le type est reconnu par la SIGNATURE des octets (PNG, JPEG, WebP ; jamais SVG, jamais le champ « type »),
// la longueur et l'alphabet du base64 sont vérifiés AVANT de le décoder, les dimensions lues dans l'en-tête AVANT de créer une image, et une image qui porte encore un
// bloc EXIF est refusée. Les mêmes contrôles servent à l'écriture (l'adaptateur de frame/app.js) et à la lecture (le poste de l'ergonome).
export const LIMITS = {
  bytes: 409600, // 400 Ko après réduction
  b64: 546136, // la longueur du base64 de 409 600 octets (4 × ceil(409 600 / 3))
  side: 1600, // le plus grand côté, en pixels
  max: 3, // images par signalement
  doc: 560000 // taille du texte d'un document-image (le base64 et son enveloppe)
};
export const SCHEMA = 'sog-signalement-image/1';
const B64 = /^[A-Za-z0-9+/]+={0,2}$/,
  ID = /^SIG-[0-9a-f]{10}$/;

const u16be = (b, i) => (b[i] << 8) | b[i + 1],
  u32be = (b, i) => (b[i] * 16777216) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3],
  u16le = (b, i) => b[i] | (b[i + 1] << 8),
  u24le = (b, i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16),
  ascii = (b, i, n) => String.fromCharCode(...b.subarray(i, i + n));

/** Le type par la signature des octets : 'png' | 'jpeg' | 'webp' | null (jamais SVG, GIF, HTML : rien d'autre n'est reconnu). */
export function sniff(b) {
  if (!(b instanceof Uint8Array) || b.length < 24) return null;
  if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG' && b[4] === 13 && b[5] === 10 && b[6] === 26 && b[7] === 10) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';
  return null;
}

/** Les dimensions { w, h } lues dans l'en-tête (sans rien décoder), ou null si l'en-tête est faux. */
export function dims(b, type) {
  try {
    if (type === 'png') {
      if (ascii(b, 12, 4) !== 'IHDR') return null;
      return {
        w: u32be(b, 16),
        h: u32be(b, 20)
      };
    }
    if (type === 'jpeg') {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) return null;
        const m = b[i + 1];
        if (m === 0xff) {
          i++;
          continue;
        }
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return {
          h: u16be(b, i + 5),
          w: u16be(b, i + 7)
        };
        if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) {
          i += 2;
          continue;
        }
        i += 2 + u16be(b, i + 2);
      }
      return null;
    }
    if (type === 'webp') {
      const k = ascii(b, 12, 4);
      if (k === 'VP8 ') return {
        w: u16le(b, 26) & 0x3fff,
        h: u16le(b, 28) & 0x3fff
      };
      if (k === 'VP8L') {
        if (b[20] !== 0x2f) return null;
        return {
          w: 1 + (b[21] | ((b[22] & 0x3f) << 8)),
          h: 1 + ((b[22] >> 6) | (b[23] << 2) | ((b[24] & 0x0f) << 10))
        };
      }
      if (k === 'VP8X') return {
        w: 1 + u24le(b, 24),
        h: 1 + u24le(b, 27)
      };
    }
  } catch {
    /* un en-tête tronqué : pas de dimensions */
  }
  return null;
}

/** Vrai si l'image porte un bloc de métadonnées EXIF (JPEG : segment APP1 « Exif », WebP : bloc EXIF, PNG : bloc eXIf) : une image réduite par canvas n'en a jamais. */
export function hasExif(b, type) {
  try {
    if (type === 'jpeg') {
      let i = 2;
      while (i + 4 < b.length && b[i] === 0xff) {
        const m = b[i + 1];
        if (m === 0xda || m === 0xd9) break; // le début des données de l'image
        if (m === 0xff) {
          i++;
          continue;
        }
        if (m === 0xe1 && ascii(b, i + 4, 4) === 'Exif') return true;
        i += 2 + u16be(b, i + 2);
      }
      return false;
    }
    if (type === 'webp') {
      let i = 12;
      while (i + 8 <= b.length) {
        if (ascii(b, i, 4) === 'EXIF') return true;
        i += 8 + u32le(b, i + 4) + (u32le(b, i + 4) & 1);
      }
      return false;
    }
    if (type === 'png') {
      let i = 8;
      while (i + 8 <= b.length) {
        const n = u32be(b, i);
        if (ascii(b, i + 4, 4) === 'eXIf') return true;
        i += 12 + n;
      }
      return false;
    }
  } catch {
    return true; // un fichier qu'on ne sait pas parcourir n'est pas cru
  }
  return false;
}
const u32le = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)) + b[i + 3] * 16777216;

export const toB64 = bytes => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Contrôle d'un document-image (à l'écriture ET à la lecture) : { ok: true, bytes, type, w, h } ou { ok: false, why }. `want` : { id, n } attendus (le chemin du document). */
export function checkDoc(doc, want = {}) {
  const bad = why => ({
    ok: false,
    why
  });
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return bad('shape');
  const keys = Object.keys(doc);
  if (keys.length !== 4 || !['schema', 'id', 'n', 'b64'].every(k => keys.includes(k))) return bad('shape');
  if (doc.schema !== SCHEMA || typeof doc.id !== 'string' || !ID.test(doc.id) || !Number.isInteger(doc.n) || doc.n < 1 || doc.n > LIMITS
    .max) return bad('shape');
  if (want.id && doc.id !== want.id) return bad('id');
  if (want.n && doc.n !== want.n) return bad('id');
  const s = doc.b64;
  // la longueur et l'alphabet AVANT de décoder
  if (typeof s !== 'string' || s.length < 32 || s.length > LIMITS.b64 || s.length % 4 !== 0 || !B64.test(s)) return bad('b64');
  let bytes;
  try {
    const bin = atob(s);
    bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
  } catch {
    return bad('b64');
  }
  if (bytes.length > LIMITS.bytes) return bad('size');
  const type = sniff(bytes);
  if (!type) return bad('type');
  const d = dims(bytes, type);
  if (!d || d.w < 1 || d.h < 1 || d.w > LIMITS.side || d.h > LIMITS.side) return bad('dims');
  if (hasExif(bytes, type)) return bad('exif');
  return {
    ok: true,
    bytes,
    type,
    w: d.w,
    h: d.h
  };
}

/** Les bornes d'une ÉCRITURE de l'adaptateur : le chemin dit ce que le document doit être (un signalement ou une image de ce signalement), le contenu est contrôlé. */
export function checkWrite(path, value, tri) {
  const base = `pilot/${tri}/signalements/`;
  if (!/^[A-Za-z0-9]{2,8}$/.test(tri || '') || typeof path !== 'string' || !path.startsWith(base)) return {
    ok: false,
    why: 'path'
  };
  const rest = path.slice(base.length);
  let m = /^(SIG-[0-9a-f]{10})\.json$/.exec(rest);
  if (m) {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text && text.length <= 8192 ? {
      ok: true
    } : {
      ok: false,
      why: 'size'
    };
  }
  m = /^(SIG-[0-9a-f]{10})\/([1-3])\.json$/.exec(rest);
  if (!m) return {
    ok: false,
    why: 'path'
  };
  const doc = typeof value === 'string' ? (() => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  })() : value;
  return checkDoc(doc, {
    id: m[1],
    n: Number(m[2])
  });
}

/** Réduit UNE photo (un File choisi) : { bytes, type, w, h } ou { why: 'unreadable' | 'too-big' }. Ré-encodée par un canvas (l'EXIF n'est pas recopié), le plus grand côté à 1 600 px
 *  au plus, WebP si l'appareil sait l'écrire (sinon JPEG), 400 Ko au plus : la qualité puis la taille baissent par paliers. L'orientation de la photo est appliquée (l'image sort droite). */
export async function reduce(file, env = globalThis) {
  let bmp;
  try {
    bmp = await env.createImageBitmap(file, {
      imageOrientation: 'from-image'
    });
  } catch {
    try {
      bmp = await env.createImageBitmap(file);
    } catch {
      return {
        why: 'unreadable'
      };
    }
  }
  const W = bmp.width,
    H = bmp.height;
  if (!(W > 0 && H > 0)) return {
    why: 'unreadable'
  };
  const encode = (canvas, mime, q) => new Promise(res => canvas.toBlob(res, mime, q));
  for (const side of [1600, 1280, 1024, 800]) {
    const k = Math.min(1, side / Math.max(W, H)),
      w = Math.max(1, Math.round(W * k)),
      h = Math.max(1, Math.round(H * k)),
      canvas = env.document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff'; // une transparence ne devient pas du noir
    g.fillRect(0, 0, w, h);
    g.drawImage(bmp, 0, 0, w, h);
    for (const q of [0.82, 0.68, 0.52, 0.4]) {
      for (const mime of ['image/webp', 'image/jpeg']) {
        const blob = await encode(canvas, mime, q);
        if (!blob || blob.type !== mime) continue; // l'appareil ne sait pas écrire ce format (un navigateur rend alors du PNG)
        const bytes = new Uint8Array(await blob.arrayBuffer());
        if (bytes.length <= LIMITS.bytes && sniff(bytes) && !hasExif(bytes, sniff(bytes))) {
          bmp.close?.();
          return {
            bytes,
            type: sniff(bytes),
            w,
            h
          };
        }
        break; // ce format est écrit mais trop gros à cette qualité : la qualité baisse (un JPEG n'est pas plus petit qu'un WebP)
      }
    }
  }
  bmp.close?.();
  return {
    why: 'too-big'
  };
}
