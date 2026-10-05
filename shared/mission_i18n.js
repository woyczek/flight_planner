// Brief de mission dans la langue du lecteur. Le générateur (prompt, réglage « Traductions ») ajoute au YAML un bloc
//   i18n: { en: { title, summary, detailed_description, objectives, notes, risks, events, tracks, maps }, de: …, es: … }
// mêmes clés que le texte français ; notes et risks dans le même ordre ; events et tracks par identifiant (exercice :
// bloc exercise de l'organisation, ou ancien format tracks / injects). Ce module superpose la traduction au texte
// français, champ par champ : ce qui n'est pas traduit reste en français, rien n'est jamais perdu.
//
// API : MissionI18n.localize(yaml, lang) → copie traduite (le yaml lui-même s'il n'y a rien à traduire) ;
//       MissionI18n.here(yaml) → même chose dans la langue de la page ; MissionI18n.languages(yaml) → langues présentes.
(() => {
  'use strict';
  const arr = v => Array.isArray(v) ? v : v == null || v === '' ? [] : [v];
  const merge = (base, tr) => tr && typeof tr === 'object' ? {
    ...base,
    ...tr
  } : base;

  /** Brief traduit dans lang : titre, résumé, description, objectifs, notes, risques, textes d'exercice. */
  function localize(y, lang) {
    const tr = y?.i18n?.[lang];
    if (!y || !tr || typeof tr !== 'object' || lang === 'fr') return y;
    const out = {
      ...y
    };
    for (const k of ['title', 'summary', 'detailed_description'])
      if (typeof tr[k] === 'string' && tr[k].trim()) out[k] = tr[k];
    if (tr.objectives && typeof tr.objectives === 'object') out.objectives = merge(y.objectives || {}, tr.objectives);
    if (Array.isArray(tr.notes)) out.notes = arr(y.notes).map((n, i) => tr.notes[i] ?? n);
    if (Array.isArray(tr.risks)) out.risks = arr(y.risks).map((r, i) => merge(r, tr.risks[i]));
    const ev = tr.events || {},
      tk = tr.tracks || {};
    if (y.exercise) out.exercise = {
      ...y.exercise,
      events: arr(y.exercise.events).map(e => merge(e, ev[e?.id])),
      tracks: arr(y.exercise.tracks).map(t => merge(t, tk[t?.id]))
    };
    if (Array.isArray(y.injects)) out.injects = y.injects.map(e => merge(e, ev[e?.id]));
    if (Array.isArray(y.tracks)) out.tracks = y.tracks.map(t => merge(t, tk[t?.id]));
    // légendes des cartes : par id de carte, sinon par nom de fichier
    if (tr.maps && Array.isArray(y.maps)) out.maps = y.maps.map(m => {
      const d = tr.maps[m?.id] ?? tr.maps[m?.filename];
      return typeof d === 'string' ? {
        ...m,
        description: d
      } : m;
    });
    return out;
  }
  const lang = () => window.RepositoryNav?.getLanguage?.() || window.RepositoryKit?.lang?.() || 'fr';

  window.MissionI18n = {
    localize,
    here: y => localize(y, lang()),
    languages: y => Object.keys(y?.i18n || {}).filter(k => y.i18n[k] && typeof y.i18n[k] === 'object')
  };
})();
