(() => {
  'use strict';
  // V3 aerodb — le cycle AIRAC, en un seul endroit (SPEC § 4 « Cycle names », contrat du module Données, 28 octobre 2026).
  // Stocké et échangé par sa date d'effet « AAAA-MM-JJ » (dossiers sia/base/<zone>/2026-10-01/, proc/2026-10-01/, réponses de
  // l'API) ; montré par son identifiant « AANN » (« 2610 ») par le module qui le montre. Cycles de 28 jours depuis AIRAC 2401 =
  // 25 janvier 2024 (2601 = 22 janvier 2026, la même suite) ; le numéro est le rang de la date d'effet dans son année. Le lecteur
  // d'aerodb (airacCycles), le catalogue et les outils Python (tools/proc_ead.py lib_cycle) suivent la même suite : un cas K le
  // vérifie. Aucune donnée, aucun appel réseau ; marche dans une page et dans un Worker.
  // API : AeroAirac.{ cycleOf(date) → { id, date, num, year, next: { id, date }, prev: { id, date } }, cycleDate(id) → 'AAAA-MM-JJ',
  //   idOf(date) → 'AANN', next(date), prev(date) → 'AAAA-MM-JJ', inForce(dates, now) → la date en vigueur parmi des cycles publiés,
  //   ANCHOR }.
  const DAY = 864e5,
    CYCLE = 28 * DAY,
    ANCHOR = Date.UTC(2024, 0, 25); // AIRAC 2401
  const p2 = n => String(n).padStart(2, '0');
  const iso = ms => new Date(ms).toISOString().slice(0, 10);
  /** Instant (ms) d'une date « AAAA-MM-JJ », d'un Date ou d'un nombre ; minuit UTC du jour. */
  const dayOf = when => {
    const t = typeof when === 'string' ? Date.parse(`${when.slice(0, 10)}T00:00:00Z`) : +(when ?? Date.now()),
      d = new Date(t);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  };
  /** Début (ms) du cycle en vigueur à cette date. */
  const startOf = when => ANCHOR + Math.floor((dayOf(when) - ANCHOR) / CYCLE) * CYCLE;
  /** { id, date, num, year } du cycle qui commence à ms. */
  const mk = ms => {
    const y = new Date(ms).getUTCFullYear(),
      num = Math.floor((ms - Date.UTC(y, 0, 1)) / CYCLE) + 1;
    return {
      id: p2(y % 100) + p2(num),
      date: iso(ms),
      num,
      year: y
    };
  };
  /** Cycle en vigueur à la date (aujourd'hui par défaut), avec le suivant et le précédent. */
  function cycleOf(when = Date.now()) {
    const ms = startOf(when),
      short = c => ({
        id: c.id,
        date: c.date
      });
    return {
      ...mk(ms),
      next: short(mk(ms + CYCLE)),
      prev: short(mk(ms - CYCLE))
    };
  }
  /** Date d'effet « AAAA-MM-JJ » d'un cycle « AANN » ; '' s'il n'existe pas. */
  function cycleDate(id) {
    const m = /^(\d\d)(\d\d)$/.exec(String(id || ''));
    if (!m) return '';
    const y = 2000 + +m[1],
      first = startOf(Date.UTC(y, 0, 1)) < Date.UTC(y, 0, 1) ? startOf(Date.UTC(y, 0, 1)) + CYCLE : startOf(Date.UTC(y, 0, 1)),
      ms = first + (+m[2] - 1) * CYCLE;
    return +m[2] >= 1 && new Date(ms).getUTCFullYear() === y ? iso(ms) : '';
  }
  const idOf = when => mk(startOf(when)).id;
  const next = when => iso(startOf(when) + CYCLE);
  const prev = when => iso(startOf(when) - CYCLE);
  /** Parmi des dates de cycles publiés, celle à lire : la plus récente déjà en vigueur, sinon la plus ancienne (publiée d'avance). */
  function inForce(dates, when = Date.now()) {
    const list = [...new Set(dates || [])].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort(),
      today = iso(dayOf(when)),
      past = list.filter(d => d <= today);
    return past.length ? past[past.length - 1] : list[0] || null;
  }
  const api = {
    cycleOf,
    cycleDate,
    idOf,
    next,
    prev,
    inForce,
    ANCHOR: iso(ANCHOR)
  };
  if (typeof window !== 'undefined') window.AeroAirac = api;
  else self.AeroAirac = api;
})();
