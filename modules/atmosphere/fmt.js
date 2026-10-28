// Formats de l'écran Météo : niveaux, températures, vents, heures, nombres, dans la langue de l'interface (ctx.t, ctx.lang),
// et les deux écritures du DOM qui n'ont lieu que si la valeur change (CLAUDE.md). Pas d'état, pas de réseau.

import {
  formatLevel
} from '../../frame/lib/route_text.js';
import {
  TX
} from './texts.js';

/** Échappe un texte pour du HTML. */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** Borne x entre a et b. */
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
/** Écrit un texte seulement s'il change. */
export const setText = (node, s) => {
  if (node && node.textContent !== s) node.textContent = s;
};
/** Écrit un attribut seulement s'il change. */
export const setAttr = (node, k, v) => {
  if (node && node.getAttribute(k) !== v) node.setAttribute(k, v);
};
/** Heure UTC « HH:MMZ » d'un instant (s). */
export const fmtHM = s => {
  const d = new Date(s * 1000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}Z`;
};
/** Niveau ou altitude arrondi à 100 ft (« FL270 », « 5 000 ft ») ; « — » sans valeur. */
export const fmtLvl = ft => ft == null ? '—' : formatLevel(Math.max(0, Math.round(ft / 100) * 100));

/** Les formats qui parlent la langue de l'interface : T(clé, valeurs) lit texts.js par ctx.t. */
export function createFmt(ctx) {
  const T = (key, v) => ctx.t(TX[key], v),
    lang = () => ctx.lang?.() || 'fr';
  /** Nombre localisé à d décimales ; « — » sans valeur. */
  const fmtNum = (x, d = 0) => x == null || !Number.isFinite(x) ? '—' : x.toLocaleString(lang(), {
    maximumFractionDigits: d,
    minimumFractionDigits: d
  });
  return {
    T,
    lang,
    fmtNum,
    /** Température « −12 °C ». */
    fmtT: t => t == null ? '—' : `${t < 0 ? '−' : ''}${Math.abs(Math.round(t))} °C`,
    /** Écart à l'atmosphère type « ISA +3 ». */
    fmtDev: d => d == null ? '—' : `ISA ${d >= 0 ? '+' : '−'}${Math.abs(Math.round(d))}`,
    /** Vent « 270/35 kt », « calme » sous 1 kt. */
    fmtWind: (d, kt) => d == null || kt == null ? '—' : kt < 1 ? T('calm') : `${String(Math.round(d / 10) * 10 || 360).padStart(3, '0')}/${Math.round(kt)} kt`,
    /** Composantes de face et de travers d'un vent. */
    fmtComp: c => c == null ? '—' : T(c.head >= 0 ? 'compHead' : 'compTail', {
      h: Math.abs(Math.round(c.head)),
      x: `${Math.abs(Math.round(c.cross))}${c.cross >= 0 ? T('right') : T('left')}`
    }),
    /** Phase du vol en mots. */
    phase: p => T({
      climb: 'phClimb',
      cruise: 'phCruise',
      descent: 'phDescent'
    } [p] || 'phCruise'),
    /** Givrage indicatif en mots (1 possible, 2 probable). */
    iceText: n => n ? T(n === 2 ? 'iceProbable' : 'icePossible') : '—',
    /** Heure UTC d'un instant, précédée du jour quand ce n'est pas aujourd'hui. */
    fmtWhen: t => {
      const d = new Date(t * 1000);
      return d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10) ? fmtHM(t) : `${d.toLocaleDateString(lang(), {
        weekday: 'short',
        day: 'numeric',
        timeZone: 'UTC'
      })} ${fmtHM(t)}`;
    }
  };
}
