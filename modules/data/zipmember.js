// V3 data — la lecture d'UN membre d'une archive zip choisie par l'utilisateur, sans charger l'archive (SOG-0262, lot B ; le CD DIRCAM du SIA, `info_aero_dircam.zip`, pèse 1,3 Go et l'ENR 5.7 du MIAM n'en est qu'un membre). On lit la fin du fichier (l'enregistrement de fin du
// répertoire central, zip64 compris), puis le répertoire central, puis l'entrée locale du seul membre voulu, que l'on découpe dans le File (`slice`) et, s'il est compressé (deflate), décompresse en flux (`DecompressionStream('deflate-raw')`). Tout ce que contient l'archive est une
// entrée non fiable : bornes sur le nombre d'entrées, la taille du répertoire, celle du membre et celle qu'il se dit avoir (une bombe est coupée à la taille annoncée), contrôle de la somme CRC-32, aucune lecture au-delà du fichier ; toute anomalie lève une `ZipError` à code fermé,
// jamais autre chose. Rien d'écrit, rien d'envoyé d'ici : l'appelant décide de la suite.

/** L'ENR 5.7 du MIAM dans le CD DIRCAM du SIA (chemin dans l'archive, tel que le catalogue le dit). */
export const DIRCAM_MEMBER = 'PDF/MIAM/MIAM_OACI_ENR 5.7.pdf';
/** Les bornes : membre (annoncé et réellement lu), répertoire central, nombre d'entrées, longueur d'un nom. */
export const LIMITS = Object.freeze({
  member: 128 * 1024 * 1024,
  directory: 64 * 1024 * 1024,
  entries: 200000,
  name: 1024
});
/** Les motifs d'échec (liste fermée) : pas une archive zip, archive tronquée ou incohérente, archive en plusieurs volumes, chiffrée ou d'un mode de compression inconnu, trop grande, ou le membre n'y est pas. */
export const ZIP_CODES = Object.freeze(['not-zip', 'truncated', 'unsupported', 'too-large', 'no-member', 'corrupt']);
/** Une erreur de lecture d'archive : `code` est l'un de ZIP_CODES. */
export class ZipError extends Error {
  constructor(code) {
    super(code);
    this.code = ZIP_CODES.includes(code) ? code : 'corrupt';
  }
}
const SIG_EOCD = 0x06054b50,
  SIG_LOC64 = 0x07064b50,
  SIG_EOCD64 = 0x06064b50,
  SIG_CEN = 0x02014b50,
  SIG_LOCAL = 0x04034b50;
/** Lit les octets [from, to) du fichier : un ArrayBuffer ; une plage hors du fichier est une archive tronquée. */
async function bytes(file, from, to) {
  if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < from || to > file.size) throw new ZipError(
    'truncated');
  try {
    return await file.slice(from, to).arrayBuffer();
  } catch {
    throw new ZipError('truncated');
  }
}
/** Un entier de 64 bits lu en nombre sûr (au-delà de 2^53 : archive refusée). */
function u64(dv, at) {
  const v = dv.getBigUint64(at, true);
  if (v > BigInt(Number.MAX_SAFE_INTEGER)) throw new ZipError('corrupt');
  return Number(v);
}
/** L'enregistrement de fin du répertoire central : { entries, size, offset } (zip64 suivi s'il est annoncé). */
async function endRecord(file) {
  if (file.size < 22) throw new ZipError(file.size >= 4 ? 'truncated' : 'not-zip');
  const from = Math.max(0, file.size - 65557),
    tail = await bytes(file, from, file.size),
    dv = new DataView(tail);
  let at = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--)
    if (dv.getUint32(i, true) === SIG_EOCD && i + 22 + dv.getUint16(i + 20, true) <= tail.byteLength) {
      at = i;
      break;
    }
  if (at < 0) {
    const head = new DataView(await bytes(file, 0, 4));
    throw new ZipError(head.getUint32(0, true) === SIG_LOCAL ? 'truncated' : 'not-zip');
  }
  if (dv.getUint16(at + 4, true) !== 0 || dv.getUint16(at + 6, true) !== 0) throw new ZipError('unsupported');
  let entries = dv.getUint16(at + 10, true),
    size = dv.getUint32(at + 12, true),
    offset = dv.getUint32(at + 16, true);
  if (entries === 0xffff || size === 0xffffffff || offset === 0xffffffff) {
    const loc = from + at - 20;
    if (loc < 0) throw new ZipError('corrupt');
    const l = new DataView(await bytes(file, loc, loc + 20));
    if (l.getUint32(0, true) !== SIG_LOC64) throw new ZipError('corrupt');
    const rec = u64(l, 8),
      r = new DataView(await bytes(file, rec, rec + 56));
    if (r.getUint32(0, true) !== SIG_EOCD64) throw new ZipError('corrupt');
    entries = u64(r, 32);
    size = u64(r, 40);
    offset = u64(r, 48);
  }
  if (entries > LIMITS.entries || size > LIMITS.directory || offset + size > file.size || size < entries * 46) throw new ZipError(size >
    LIMITS.directory || entries > LIMITS.entries ? 'too-large' : 'corrupt');
  return {
    entries,
    size,
    offset
  };
}
/** Les champs de l'extra zip64 d'une entrée (identifiant 1) : { usize, csize, offset } quand l'entrée les a mis à 0xFFFFFFFF dans son en-tête. */
function zip64Extra(dv, from, len, need) {
  let p = from;
  while (p + 4 <= from + len) {
    const id = dv.getUint16(p, true),
      n = dv.getUint16(p + 2, true);
    if (p + 4 + n > from + len) throw new ZipError('corrupt');
    if (id === 1) {
      let q = p + 4;
      const out = {},
        end = p + 4 + n;
      for (const k of ['usize', 'csize', 'offset'])
        if (need[k]) {
          if (q + 8 > end) throw new ZipError('corrupt');
          out[k] = u64(dv, q);
          q += 8;
        }
      return out;
    }
    p += 4 + n;
  }
  return {};
}
/** Cherche UN membre dans le répertoire central : { name, method, flags, crc, csize, usize, offset } ou null. Une entrée illisible est une archive incohérente (jamais ignorée en silence). */
async function findEntry(file, wanted) {
  const end = await endRecord(file),
    dv = new DataView(await bytes(file, end.offset, end.offset + end.size)),
    dec = new TextDecoder('utf-8');
  let p = 0,
    found = null;
  for (let i = 0; i < end.entries; i++) {
    if (p + 46 > end.size || dv.getUint32(p, true) !== SIG_CEN) throw new ZipError('corrupt');
    const nl = dv.getUint16(p + 28, true),
      el = dv.getUint16(p + 30, true),
      cl = dv.getUint16(p + 32, true),
      next = p + 46 + nl + el + cl;
    if (nl > LIMITS.name || next > end.size) throw new ZipError('corrupt');
    const name = dec.decode(new Uint8Array(dv.buffer, p + 46, nl));
    if (name === wanted) {
      const e = {
        name,
        flags: dv.getUint16(p + 8, true),
        method: dv.getUint16(p + 10, true),
        crc: dv.getUint32(p + 16, true),
        csize: dv.getUint32(p + 20, true),
        usize: dv.getUint32(p + 24, true),
        offset: dv.getUint32(p + 42, true)
      };
      const z = zip64Extra(dv, p + 46 + nl, el, {
        usize: e.usize === 0xffffffff,
        csize: e.csize === 0xffffffff,
        offset: e.offset === 0xffffffff
      });
      Object.assign(e, z);
      if (found) throw new ZipError('corrupt'); // deux membres de ce nom : on ne devine pas lequel
      found = e;
    }
    p = next;
  }
  return found;
}
/** La table de la somme CRC-32 (polynôme 0xEDB88320). */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
/** La somme CRC-32 d'une suite d'octets, reprise de `crc` (0 au début). */
function crc32(crc, u8) {
  let c = ~crc >>> 0;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}
/** Le contenu d'un membre : `data` (la tranche compressée du File) lu à plat, ou décompressé en flux ; jamais plus de `usize` octets (une bombe est coupée), somme CRC-32 contrôlée. Rend un Blob. */
async function content(data, e, signal) {
  const parts = [];
  let total = 0,
    crc = 0;
  const take = chunk => {
    total += chunk.length;
    if (total > e.usize || total > LIMITS.member) throw new ZipError('too-large');
    crc = crc32(crc, chunk);
    parts.push(chunk);
  };
  if (e.method === 0) {
    if (e.csize !== e.usize) throw new ZipError('corrupt');
    take(new Uint8Array(await data.arrayBuffer()));
  } else {
    if (typeof DecompressionStream === 'undefined') throw new ZipError('unsupported');
    const reader = data.stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    try {
      for (;;) {
        if (signal?.aborted) throw new ZipError('truncated');
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        take(value);
      }
    } catch (x) {
      await reader.cancel().catch(() => {});
      throw x instanceof ZipError ? x : new ZipError('corrupt'); // un flux deflate illisible
    }
  }
  if (total !== e.usize || crc !== e.crc) throw new ZipError('corrupt');
  return new Blob(parts, {
    type: 'application/octet-stream'
  });
}
/** Lit le membre `wanted` de l'archive `file` (un File ou un Blob) sans la charger : { name (le dernier élément du chemin), blob } ; lève une ZipError (`code` dans ZIP_CODES) sinon. */
export async function readMember(file, wanted = DIRCAM_MEMBER, signal = undefined) {
  if (typeof Blob === 'undefined' || !(file instanceof Blob)) throw new ZipError('not-zip');
  const e = await findEntry(file, wanted);
  if (!e) throw new ZipError('no-member');
  if (e.flags & 1 || (e.method !== 0 && e.method !== 8)) throw new ZipError(
    'unsupported'); // chiffré, ou une compression que le navigateur ne lit pas
  if (e.usize > LIMITS.member || e.csize > LIMITS.member + 1024 * 1024) throw new ZipError('too-large');
  const local = new DataView(await bytes(file, e.offset, e.offset + 30));
  if (local.getUint32(0, true) !== SIG_LOCAL) throw new ZipError('corrupt');
  const start = e.offset + 30 + local.getUint16(26, true) + local.getUint16(28, true),
    after = start + e.csize;
  if (after > file.size) throw new ZipError('truncated');
  const blob = await content(file.slice(start, after), e, signal);
  return {
    name: e.name.split('/').pop(),
    blob
  };
}
