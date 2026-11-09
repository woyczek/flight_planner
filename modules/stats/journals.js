// V3 stats — la lecture des journaux Fuel Phase Monitor par les écrans (SOG-0052, § 10.37 A) : un fichier choisi sur l'appareil
// (.csv, .csv.gz décompressé dans la page), ou un journal du dossier Output du poste lu par le lanceur (travail stats/output
// d'AeroDB, tools/regen/stats.py). Partagé par Maintenance › Appareils (« Proposer depuis les mesures ») et le compte rendu
// (« Mesures »). Rien n'est gardé ni envoyé : le texte passe à phases.js et s'oublie.
//
// API :
//   journalText(file) → Promise<string> : le texte d'un fichier choisi ; 64 Mo au plus ; .gz par DecompressionStream.
//   outputJob(launcher, args) → Promise<object | null> : le résultat du travail stats/output ({ ok, … }), null sans lanceur ou sans
//     réponse ; args : { action: 'status' } | { action: 'read', name } | { action: 'set', folder } | { action: 'clear' }.
//   outputFiles(result) → [{ name, size, mtime }] : la liste d'un `status`, bornée (200, noms sûrs).

const MAX = 64 * 1024 * 1024;

/** Le texte d'un journal choisi (voir l'en-tête). */
export async function journalText(f) {
  if (!f || f.size > MAX) throw Error('too large');
  if (!/\.gz$/i.test(f.name || '')) return f.text();
  if (typeof DecompressionStream !== 'function') throw Error('gzip unsupported');
  return new Response(f.stream().pipeThrough(new DecompressionStream('gzip'))).text();
}

/** Un appel du travail stats/output du lanceur (voir l'en-tête). */
export async function outputJob(launcher, args) {
  if (typeof launcher?.job !== 'function') return null;
  try {
    const r = await launcher.job('regen/job', {
      set: 'stats',
      verb: 'output',
      args
    });
    return r?.result && typeof r.result === 'object' ? r.result : null;
  } catch {
    return null;
  }
}

/** Les journaux d'un résultat `status`, bornés : 200 au plus, noms sûrs, taille et date numériques ou null. */
export function outputFiles(r) {
  return (Array.isArray(r?.files) ? r.files : []).slice(0, 200).filter(f => f && typeof f.name === 'string' && /^[\w .()-]{1,160}$/.test(f
    .name)).map(f => ({
    name: f.name,
    size: Number.isFinite(+f.size) ? +f.size : null,
    mtime: Number.isFinite(+f.mtime) ? +f.mtime : null
  }));
}
