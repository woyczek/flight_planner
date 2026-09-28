(() => {
  'use strict';
  // Composant de framework « ZipStore » : archives ZIP écrites et lues dans le navigateur, sans dépendance.
  //   · ZipStore.build([{ name, data, date }], { compress }) → Blob (application/zip) ; data : Uint8Array,
  //     ArrayBuffer, Blob ou texte ; compress : « deflate » via CompressionStream quand le navigateur le permet
  //     (Chrome, Edge, Firefox récents), sinon stocké ; noms en UTF-8 (bit 11) ; dates DOS locales.
  //   · ZipStore.read(blob | ArrayBuffer | Uint8Array) → [{ name, size, date, method, bytes(), text() }] ;
  //     entrées stockées ou « deflate » (DecompressionStream) ; pas de ZIP64 (archives de moins de 4 Go).
  //   · ZipStore.sha256(data) → empreinte hexadécimale (crypto.subtle).
  // Utilisé par la sauvegarde totale (Paramètres › Maintenance) et l'extraction de l'export SIA.
  const enc = new TextEncoder();
  const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  /** CRC-32 (ZIP) d'un tableau d'octets. */
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  /** Octets d'une donnée (texte, Blob, ArrayBuffer, Uint8Array). */
  async function toBytes(data) {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (typeof Blob !== 'undefined' && data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
    return enc.encode(String(data ?? ''));
  }
  /** Passe des octets dans un flux de (dé)compression ; null si le navigateur ne le propose pas. */
  async function pipe(bytes, Stream, format) {
    if (typeof Stream === 'undefined') return null;
    try {
      const out = new Blob([bytes]).stream().pipeThrough(new Stream(format));
      return new Uint8Array(await new Response(out).arrayBuffer());
    } catch {
      return null;
    }
  }
  /** Date et heure DOS (heure locale) d'un instant. */
  function dosTime(d) {
    const x = d instanceof Date && !isNaN(d) ? d : new Date();
    const year = Math.min(2107, Math.max(1980, x.getFullYear()));
    return {
      time: (x.getHours() << 11) | (x.getMinutes() << 5) | (x.getSeconds() >> 1),
      date: ((year - 1980) << 9) | ((x.getMonth() + 1) << 5) | x.getDate()
    };
  }
  /** Archive ZIP (Blob) des fichiers [{ name, data, date }] ; compress : true (défaut) → deflate si possible. */
  async function build(files, { compress = true } = {}) {
    const parts = [], central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(String(f.name).replace(/\\/g, '/').replace(/^\/+/, '')),
        raw = await toBytes(f.data),
        crc = crc32(raw);
      let method = 0, body = raw;
      if (compress && raw.length > 64) {
        const z = await pipe(raw, window.CompressionStream, 'deflate-raw');
        if (z && z.length < raw.length) { method = 8; body = z; }
      }
      const { time, date } = dosTime(f.date ? new Date(f.date) : new Date());
      const head = new DataView(new ArrayBuffer(30));
      head.setUint32(0, 0x04034b50, true); head.setUint16(4, 20, true); head.setUint16(6, 0x0800, true);
      head.setUint16(8, method, true); head.setUint16(10, time, true); head.setUint16(12, date, true);
      head.setUint32(14, crc, true); head.setUint32(18, body.length, true); head.setUint32(22, raw.length, true);
      head.setUint16(26, name.length, true); head.setUint16(28, 0, true);
      parts.push(new Uint8Array(head.buffer), name, body);
      const dir = new DataView(new ArrayBuffer(46));
      dir.setUint32(0, 0x02014b50, true); dir.setUint16(4, 20, true); dir.setUint16(6, 20, true);
      dir.setUint16(8, 0x0800, true); dir.setUint16(10, method, true); dir.setUint16(12, time, true);
      dir.setUint16(14, date, true); dir.setUint32(16, crc, true); dir.setUint32(20, body.length, true);
      dir.setUint32(24, raw.length, true); dir.setUint16(28, name.length, true);
      dir.setUint32(42, offset, true);
      central.push(new Uint8Array(dir.buffer), name);
      offset += 30 + name.length + body.length;
    }
    const size = central.reduce((n, a) => n + a.length, 0),
      end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, size, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }
  /** Entrées d'une archive ZIP : [{ name, size, compressedSize, date, method, bytes(), text() }]. */
  async function read(input) {
    const data = await toBytes(input),
      view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let eocd = -1;
    for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--)
      if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('ZIP illisible (fin d’archive introuvable)');
    const count = view.getUint16(eocd + 10, true);
    let p = view.getUint32(eocd + 16, true);
    const dec = new TextDecoder('utf-8'), out = [];
    for (let n = 0; n < count; n++) {
      if (view.getUint32(p, true) !== 0x02014b50) throw new Error('ZIP illisible (répertoire central)');
      const method = view.getUint16(p + 10, true), time = view.getUint16(p + 12, true), day = view.getUint16(p + 14, true),
        csize = view.getUint32(p + 20, true), usize = view.getUint32(p + 24, true),
        nlen = view.getUint16(p + 28, true), xlen = view.getUint16(p + 30, true), clen = view.getUint16(p + 32, true),
        local = view.getUint32(p + 42, true),
        name = dec.decode(data.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + xlen + clen;
      if (name.endsWith('/')) continue;
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true),
        raw = data.subarray(start, start + csize);
      const bytes = async () => {
        if (method === 0) return raw;
        if (method !== 8) throw new Error(`Compression ZIP non prise en charge (${method}) : ${name}`);
        const z = await pipe(raw, window.DecompressionStream, 'deflate-raw');
        if (!z) throw new Error('Ce navigateur ne sait pas décompresser les ZIP (DecompressionStream).');
        return z;
      };
      out.push({
        name,
        size: usize,
        compressedSize: csize,
        method,
        date: new Date(1980 + (day >> 9), ((day >> 5) & 15) - 1, day & 31, time >> 11, (time >> 5) & 63, (time & 31) * 2),
        bytes,
        text: async () => dec.decode(await bytes())
      });
    }
    return out;
  }
  /** Empreinte SHA-256 (hexadécimal) ; '' si crypto.subtle est indisponible (page hors contexte sécurisé). */
  async function sha256(input) {
    try {
      const d = await crypto.subtle.digest('SHA-256', await toBytes(input));
      return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return '';
    }
  }
  window.ZipStore = { build, read, sha256, crc32, toBytes };
})();
