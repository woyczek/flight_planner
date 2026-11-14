// V3 frame/lib (propriétaire : frame ; tout module s'en sert) — heures de l'appli Pilote : toutes en UTC avec le suffixe Z
// (« 16:30Z ») ; l'heure locale de l'appareil, entre parenthèses, seulement à côté du départ, de l'arrivée prévue et de
// la mise en route (fmtZLocal). Code pur : ni page, ni stockage, ni réseau.
//
// API (iso : date ISO, nombre de millisecondes ou Date ; illisible ou vide → '') :
//   fmtZ(iso) → « 16:30Z » ;
//   fmtZLocal(iso) → « 16:30Z (18:30) », l'heure locale de l'appareil entre parenthèses (« 16:30Z » seul si elle est
//     la même, appareil réglé en UTC) ;
//   fmtDateZ(iso, lang) → « 23/10/2026 16:30Z » : la date UTC dans l'écriture de la langue (fr, en, de, es ; fr par
//     défaut), puis l'heure UTC.
//   fmtDayZ(iso) → « 29/10 16:53Z » : le jour et le mois UTC (jj/mm, sans année, la même écriture dans toutes les langues), puis
//     l'heure UTC : « lu le … » de la ligne des procédures de Carburant.

const two = n => String(n).padStart(2, '0');
/** Date lue, ou null. */
function dateOf(iso) {
  if (iso === null || iso === undefined || iso === '') return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  return Number.isFinite(d.getTime()) ? d : null;
}
/** « 16:30Z ». */
export function fmtZ(iso) {
  const d = dateOf(iso);
  return d ? `${two(d.getUTCHours())}:${two(d.getUTCMinutes())}Z` : '';
}
/** « 16:30Z (18:30) » : l'heure UTC, puis l'heure locale de l'appareil. */
export function fmtZLocal(iso) {
  const d = dateOf(iso);
  if (!d) return '';
  const z = fmtZ(d),
    local = `${two(d.getHours())}:${two(d.getMinutes())}`;
  return local === z.slice(0, 5) ? z : `${z} (${local})`;
}
const LOCALES = {
  fr: 'fr-FR',
  en: 'en-GB',
  de: 'de-DE',
  es: 'es-ES'
};
/** « 23/10/2026 16:30Z » : la date UTC dans l'écriture de la langue, puis l'heure UTC. */
export function fmtDateZ(iso, lang = 'fr') {
  const d = dateOf(iso);
  if (!d) return '';
  const day = d.toLocaleDateString(LOCALES[lang] || LOCALES.fr, {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return `${day} ${fmtZ(d)}`;
}
/** « 29/10 16:53Z » : jour et mois UTC (jj/mm), puis l'heure UTC ; '' si la date est illisible ou vide. */
export function fmtDayZ(iso) {
  const d = dateOf(iso);
  return d ? `${two(d.getUTCDate())}/${two(d.getUTCMonth() + 1)} ${fmtZ(d)}` : '';
}

const MOMENT = {
  fr: {
    on: (d, h) => `${d} à ${h}`,
    today: h => `aujourd’hui à ${h}`,
    hour: (hh, mm) => `${hh} h ${mm}`
  },
  en: {
    on: (d, h) => `${d} at ${h}`,
    today: h => `today at ${h}`,
    hour: (hh, mm) => `${hh}:${mm}`
  },
  de: {
    on: (d, h) => `${d} um ${h}`,
    today: h => `heute um ${h}`,
    hour: (hh, mm) => `${hh}:${mm}`
  },
  es: {
    on: (d, h) => `${d} a las ${h}`,
    today: h => `hoy a las ${h}`,
    hour: (hh, mm) => `${hh}:${mm}`
  }
};
/** « 14/11 à 12 h 10 » (fr), « aujourd’hui à 12 h 10 » le jour même : l'instant à l'heure de l'APPAREIL (l'utilisateur lit sa montre), dans l'écriture de la langue ; '' si la date est illisible. now : l'instant d'« aujourd'hui »
 *  (la date locale de l'appareil). L'instant UTC reste celui des tris : seule la lecture change. */
export function fmtMoment(iso, lang = 'fr', now = Date.now()) {
  const d = dateOf(iso);
  if (!d) return '';
  const m = MOMENT[lang] || MOMENT.fr,
    n = new Date(now),
    h = m.hour(two(d.getHours()), two(d.getMinutes()));
  if (d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()) return m.today(h);
  const day = lang === 'de' ? `${two(d.getDate())}.${two(d.getMonth() + 1)}.` : `${two(d.getDate())}/${two(d.getMonth() + 1)}`;
  return m.on(day, h);
}
