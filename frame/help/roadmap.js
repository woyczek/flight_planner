(() => {
  'use strict';
  // V3 — feuille de route de l'application (écran #roadmap du cadre ; frame/help/SPEC.md § 5). Source : frame/help/roadmap.json
  // (schéma sog-roadmap/1, tenu par la session ergonomie) : note (ce qui est livré doit marcher, le reste n'est pas un
  // bug), états (done, doing, planned, later), applications, voies (une par module ou bloc) et leurs éléments.
  //   · sur écran : un tableau, une ligne par voie, quatre colonnes d'état, éléments en cartes courtes ;
  //   · sur téléphone (≤ 760 px) : une voie = une carte, éléments groupés par état (états vides omis) ;
  //   · couleur par état avec les seuls jetons du cadre ; hors ligne : le fichier est dans la liste du service worker.
  // Contexte donné par frame/app.js : { t, lang, root }.
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const ORDER = ['done', 'doing', 'planned', 'later'];
  const T = {
    title: ['Feuille de route', 'Roadmap', 'Fahrplan', 'Hoja de ruta'],
    updated: ['Mise à jour : {d}', 'Updated: {d}', 'Aktualisiert: {d}', 'Actualizado: {d}'],
    apps: ['Applications', 'Applications', 'Anwendungen', 'Aplicaciones'],
    lane: ['Voie', 'Lane', 'Bereich', 'Ámbito'],
    help: ['Aide', 'Help', 'Hilfe', 'Ayuda'],
    missing: ['La feuille de route n’est pas encore disponible sur cet appareil (hors ligne à la première visite ?).',
      'The roadmap is not available on this device yet (offline at the first visit?).',
      'Der Fahrplan ist auf diesem Gerät noch nicht verfügbar (beim ersten Besuch offline?).',
      'La hoja de ruta aún no está disponible en este dispositivo (¿sin conexión en la primera visita?).'
    ]
  };
  /** Ligne [fr, en, de, es] d'un texte du fichier ({ fr, en, de, es }) ; une langue absente reprend l'anglais. */
  const row = o => {
    if (typeof o === 'string') return o;
    const en = o?.en || o?.fr || '';
    return [o?.fr || '', en, o?.de || en, o?.es || en];
  };
  let docP = null;
  /** Feuille de route (JSON) ; null si elle est introuvable. */
  const load = c => docP ||= fetch(new URL('frame/help/roadmap.json', c.root), {
    cache: 'no-cache'
  }).then(r => r.ok ? r.json() : null).catch(() => null).then(d => (d || (docP = null), d));

  /** Dessine l'écran de la feuille de route dans view. */
  async function screen(view, c) {
    const {
      t
    } = c;
    const d = await load(c);
    if (!d?.lanes) {
      view.innerHTML = `<h1>${esc(t(T.title))}</h1><p class="f-card">${esc(t(T.missing))}</p>`;
      return;
    }
    const st = s => t(row(d.states?.[s] || s)),
      card = it => `<li class="f-rm-item" data-state="${esc(it.state)}">${esc(t(row(it)))}</li>`;
    const head = `<div class="f-rm-head" aria-hidden="true"><span></span>${ORDER.map(s => `<span data-state="${s}">${esc(st(s))}</span>`).join('')}</div>`;
    const lanes = d.lanes.map(l => {
      const app = (d.apps || []).find(a => a.id === l.app);
      return `<section class="f-rm-lane"><h2>${esc(t(row(l.label)))}${app ? ` <span class="f-muted">${esc(t(row(app.label)))}</span>` : ''}</h2>${ORDER.map(s => {
        const items = (l.items || []).filter(i => i.state === s);
        return `<div class="f-rm-col" data-state="${s}" ${items.length ? '' : 'data-empty'}><h3>${esc(st(s))}</h3><ul>${items.map(card).join('')}</ul></div>`;
      }).join('')}</section>`;
    }).join('');
    const apps = (d.apps || []).map(a => `<li class="f-rm-item" data-state="${esc(a.state)}"><b>${esc(t(row(a.label)))}</b> — ${esc(st(a.state))}</li>`).join('');
    view.innerHTML = `<h1>${esc(t(T.title))}</h1>
      ${d.note ? `<p class="f-card f-rm-note">${esc(t(row(d.note)))}</p>` : ''}
      <p class="f-muted">${esc(t(T.updated, { d: d.updated || '?' }))} · <a href="#help">${esc(t(T.help))}</a></p>
      ${apps ? `<h2>${esc(t(T.apps))}</h2><ul class="f-rm-apps">${apps}</ul>` : ''}
      <div class="f-rm">${head}${lanes}</div>`;
  }

  window.SogRoadmap = {
    screen,
    T
  };
})();
