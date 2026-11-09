// V3 fuel — « zone manquante » (SOG-0142, SOG-0143) : partout où une zone de la base manque dans le chemin du pilote (un point de route
// inconnu, un terrain sans procédures), la même ligne en trois temps — ce qui manque (l'état de la zone), le geste (Données, la zone
// nommée), et les replis externes du poste dits tels (Little Navmap si ses bases sont sur ce poste, Navigraph, ChartFox : des liens ou un
// nom, jamais de données copiées). Trois éléments au plus (règle 13).
//
// API :
//   STATES : les états qui font une ligne — absent (zone non installée), stale (installée, fichier du cycle absent : à reconstruire),
//     empty (installée, sa source ne porte ni points ni voies) ; ok (la zone est là) n'en fait pas.
//   zoneHref(id) → l'adresse de Données sur la zone (application Maintenance ; la clé zone est lue par l'écran Données).
//   zoneAt(zones, p) → la zone d'une position (le plus petit cadre qui la contient, sinon le plus proche) ; null sans zones.
//   zoneState(aerodb, z, p) → Promise<'absent' | 'stale' | 'empty' | 'ok'> : en attendant les codes de base/status d'AeroDB, lu dans la
//     publication — pas publiée ; tous ses cycles plus anciens que celui en vigueur ; aucun point publié à 60 NM de p.
//   gapOf(aerodb, p, lang) → Promise<{ id, name, state } | null> : la zone d'une position et son état.
//   stateText(gap, tt) → la phrase de l'état ; gapHtml(gap, { tt, esc, icao, lnm }) → la ligne en trois temps ('' pour ok).

export const STATES = ['absent', 'stale', 'empty'];
export const TX = {
  absent: ['{z} : base non installée', '{z}: database not installed', '{z}: Datenbank nicht installiert', '{z}: base no instalada'],
  stale: ['{z} : base installée, fichier du cycle absent — à reconstruire',
    '{z}: database installed, the cycle’s file missing — to rebuild',
    '{z}: Datenbank installiert, Datei des Zyklus fehlt — neu aufzubauen',
    '{z}: base instalada, falta el archivo del ciclo — por reconstruir'
  ],
  empty: ['{z} : base installée, mais sa source ne porte ni points ni voies',
    '{z}: database installed, but its source carries no points or airways',
    '{z}: Datenbank installiert, aber ihre Quelle enthält weder Punkte noch Luftstraßen',
    '{z}: base instalada, pero su fuente no tiene puntos ni aerovías'
  ],
  add: ['Ajouter {z}', 'Add {z}', '{z} hinzufügen', 'Añadir {z}'],
  update: ['Mettre à jour {z}', 'Update {z}', '{z} aktualisieren', 'Actualizar {z}'],
  elsewhere: ['Ailleurs :', 'Elsewhere:', 'Anderswo:', 'En otro sitio:'],
  lnm: ['Little Navmap sur ce poste', 'Little Navmap on this computer', 'Little Navmap auf diesem Rechner',
    'Little Navmap en este equipo'
  ]
};

export const zoneHref = id => `?app=maintenance#data?zone=${encodeURIComponent(id)}`;

/** La zone d'une position (voir l'en-tête). */
export function zoneAt(zones, p) {
  if (!p || !Number.isFinite(+p.lat) || !Number.isFinite(+p.lon)) return null;
  let best = null;
  for (const z of zones || [])
    for (const [w, s, e, n] of z.frames || []) {
      const inside = +p.lon >= w && +p.lon <= e && +p.lat >= s && +p.lat <= n,
        d = inside ? (e - w) * (n - s) : 1e6 + Math.hypot(Math.max(w - p.lon, 0, p.lon - e), Math.max(s - p.lat, 0, p.lat - n));
      if (!best || d < best.d) best = {
        z,
        d
      };
    }
  return best?.z || null;
}

/** L'état d'une zone pour une position qu'elle devrait porter (voir l'en-tête). */
export async function zoneState(aerodb, z, p) {
  if (!z.published) return 'absent';
  const pub = await Promise.resolve().then(() => aerodb.publication()).catch(() => null),
    cur = window.AeroDB?.airacCycles?.(1)?.[0],
    cycles = Object.keys(pub?.base?.[z.id]?.cycles || {});
  if (cur && cycles.length && !cycles.some(c => c >= cur)) return 'stale'; // tous ses cycles plus anciens que celui en vigueur
  const near = await Promise.resolve().then(() => aerodb.points({
    lat: +p.lat,
    lon: +p.lon,
    radiusNm: 60
  })).catch(() => null);
  return Array.isArray(near) && !near.length ? 'empty' : 'ok';
}

/** La zone d'une position et son état (voir l'en-tête) ; null sans zones ou sans position. */
export async function gapOf(aerodb, p, lang = 'fr', zones = null) {
  const list = zones || await Promise.resolve().then(() => aerodb?.zones?.()).catch(() => null),
    z = Array.isArray(list) ? zoneAt(list, p) : null;
  if (!z) return null;
  const i = Math.max(0, ['fr', 'en', 'de', 'es'].indexOf(lang));
  return {
    id: z.id,
    name: z.names?.[i] || z.id,
    state: await zoneState(aerodb, z, p)
  };
}

/** La phrase de l'état d'une zone ; '' pour ok. */
export const stateText = (g, tt) => STATES.includes(g?.state) ? tt(TX[g.state], {
  z: g.name
}) : '';

/** La ligne en trois temps (voir l'en-tête) : ce qui manque, le geste (Ajouter ou Mettre à jour : Données sur la zone ; rien pour une
 *  source sans points ni voies), les replis externes ; '' pour une zone qui est là. `icao` : le terrain concerné (les cartes de Navigraph
 *  et de ChartFox s'ouvrent sur lui) ; `lnm` : les bases de Little Navmap sont sur ce poste (le lanceur le dit). */
export function gapHtml(g, {
  tt,
  esc,
  icao = '',
  lnm = false
}) {
  if (!STATES.includes(g?.state)) return '';
  const code = /^[A-Z]{4}$/.test(String(icao || '')) ? String(icao) : '',
    ext = a => `<a href="${esc(a[1])}" target="_blank" rel="noopener noreferrer" data-ext="${esc(a[0])}">${esc(a[0])}</a>`,
    outs = [lnm ? `<span data-ext="lnm">${esc(tt(TX.lnm))}</span>` : '', ext(['Navigraph', code ? `https://charts.navigraph.com/airport/${code}` : 'https://charts.navigraph.com/']),
      ext(['ChartFox', code ? `https://chartfox.org/${code}` : 'https://chartfox.org/'])
    ].filter(Boolean),
    gesture = g.state === 'absent' || g.state === 'stale' ? `<a class="fu-linkbtn" data-zonelink href="${esc(zoneHref(g.id))}">${esc(tt(g.state === 'absent' ? TX.add : TX.update, { z: g.name }))}</a>` : '';
  return `<div class="fu-zonegap" data-zonegap="${esc(g.id)}" data-zstate="${esc(g.state)}"><span class="f-warn" data-gapwhat>${esc(stateText(g, tt))}</span>${gesture}<span class="f-muted" data-gapelse>${esc(tt(TX.elsewhere))} ${outs.join(' · ')}</span></div>`;
}
