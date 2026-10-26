(() => {
  'use strict';
  // V3 aerodb — laboratoire des données (TEMPORAIRE) : lecture d'un ZIP EN FLUX, sans jamais garder l'archive ni une
  // entrée en mémoire. ZipStore.read (shared/zip_store.js) tient l'archive entière dans un Uint8Array puis inflate
  // chaque entrée dans un seul tampon ; ici le répertoire central est lu sur la FIN du fichier (File.slice), et une entrée
  // est un ReadableStream d'octets décompressés (File.slice().stream() → DecompressionStream « deflate-raw »).
  // Fonctionne dans un Worker (aucune référence à window, Blob.slice partout). Pas de ZIP64 (comme ZipStore).
  // API : AeroLabZip.entries(blob) → [{ name, size, compressedSize, method, local }] ;
  //       AeroLabZip.stream(blob, entry) → Promise<ReadableStream<Uint8Array>> ;
  //       AeroLabZip.supported() → vrai si DecompressionStream existe.
  const G = typeof window !== 'undefined' ? window : self;
  async function entries(blob) {
    const tail = Math.min(blob.size, 65557),
      buf = new Uint8Array(await blob.slice(blob.size - tail).arrayBuffer()),
      v = new DataView(buf.buffer);
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0; i--)
      if (v.getUint32(i, true) === 0x06054b50) {
        eocd = i;
        break;
      }
    if (eocd < 0) throw new Error('ZIP: end of archive not found');
    const count = v.getUint16(eocd + 10, true),
      dirSize = v.getUint32(eocd + 12, true),
      dirAt = v.getUint32(eocd + 16, true);
    if (dirAt === 0xffffffff) throw new Error('ZIP64 not supported');
    const dir = new Uint8Array(await blob.slice(dirAt, dirAt + dirSize).arrayBuffer()),
      d = new DataView(dir.buffer),
      dec = new TextDecoder('utf-8'),
      out = [];
    let p = 0;
    for (let n = 0; n < count; n++) {
      if (d.getUint32(p, true) !== 0x02014b50) throw new Error('ZIP: central directory unreadable');
      const nlen = d.getUint16(p + 28, true),
        xlen = d.getUint16(p + 30, true),
        clen = d.getUint16(p + 32, true),
        name = dec.decode(dir.subarray(p + 46, p + 46 + nlen));
      if (!name.endsWith('/')) out.push({
        name,
        method: d.getUint16(p + 10, true),
        compressedSize: d.getUint32(p + 20, true),
        size: d.getUint32(p + 24, true),
        local: d.getUint32(p + 42, true)
      });
      p += 46 + nlen + xlen + clen;
    }
    return out;
  }
  const supported = () => typeof G.DecompressionStream !== 'undefined';
  async function stream(blob, e) {
    const h = new DataView(await blob.slice(e.local, e.local + 30).arrayBuffer());
    if (h.getUint32(0, true) !== 0x04034b50) throw new Error('ZIP: local header unreadable');
    const start = e.local + 30 + h.getUint16(26, true) + h.getUint16(28, true),
      raw = blob.slice(start, start + e.compressedSize).stream();
    if (e.method === 0) return raw;
    if (e.method !== 8) throw new Error(`ZIP: compression ${e.method} not supported`);
    if (!supported()) throw new Error('DecompressionStream not available');
    return raw.pipeThrough(new G.DecompressionStream('deflate-raw'));
  }
  G.AeroLabZip = {
    entries,
    stream,
    supported
  };
})();
