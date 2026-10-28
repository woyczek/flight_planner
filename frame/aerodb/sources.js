(() => {
  'use strict';
  // V3 aerodb — écran « Sources » (écran de service du cadre, #sources, niveau Complet : frame/app.js APP.screens, bouton de la
  // carte Administration des réglages ; frame/aerodb/SPEC.md § 5 sexies). Une ligne par source de données aéronautiques que la
  // suite utilise, envisage ou a écartée (catalogue.js, avec airac.js) : son lien, ce qu'elle donne, sa licence, son statut, le cycle AIRAC
  // en vigueur pour celles qui en dépendent. Un simple lien qui s'ouvre dans un nouvel onglet : aucune récupération, aucun
  // analyseur, aucune publication, aucun fetch (la politique de contenu n'a besoin d'aucun hôte pour cet écran). Il a remplacé le
  // laboratoire des données le 28 octobre 2026 (décision de l'utilisateur).
  // Contexte (frame/app.js renderScreen) : { t, lang, … } ; l'écran ne se sert que de t et lang.
  const BASE = document.currentScript.src;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  let cssDone = false;
  const T = {
    back: ['Réglages › Administration', 'Settings › Administration', 'Einstellungen › Verwaltung', 'Ajustes › Administración'],
    title: ['Sources', 'Sources', 'Quellen', 'Fuentes'],
    intro: [
      'Les sources des données aéronautiques que la suite utilise, envisage ou a écartées, avec leur licence. Chaque lien s’ouvre dans un nouvel onglet : cet écran ne télécharge rien.',
      'The sources of aeronautical data the suite uses, considers or has set aside, with their licence. Each link opens in a new tab: this screen downloads nothing.',
      'Die Quellen der Luftfahrtdaten, die die Suite nutzt, erwägt oder zurückgestellt hat, mit ihrer Lizenz. Jeder Link öffnet sich in einem neuen Tab: dieser Bildschirm lädt nichts herunter.',
      'Las fuentes de datos aeronáuticos que la suite utiliza, considera o ha descartado, con su licencia. Cada enlace se abre en una pestaña nueva: esta pantalla no descarga nada.'
    ],
    cycle: ['Cycle AIRAC en vigueur : {c} (depuis le {d}) ; suivant : {n} (le {e}).',
      'AIRAC cycle in force: {c} (since {d}); next: {n} ({e}).',
      'Gültiger AIRAC-Zyklus: {c} (seit {d}); nächster: {n} ({e}).',
      'Ciclo AIRAC vigente: {c} (desde el {d}); siguiente: {n} (el {e}).'
    ],
    used: ['Utilisée', 'Used', 'Genutzt', 'Utilizada'],
    candidate: ['Candidate', 'Candidate', 'In Erwägung', 'Candidata'],
    abandoned: ['Abandonnée', 'Set aside', 'Zurückgestellt', 'Descartada'],
    groupUsed: ['Utilisées', 'Used', 'Genutzt', 'Utilizadas'],
    groupCandidate: ['Candidates', 'Candidates', 'In Erwägung', 'Candidatas'],
    groupAbandoned: ['Abandonnées', 'Set aside', 'Zurückgestellt', 'Descartadas'],
    gives: ['Donne : {g}', 'Gives: {g}', 'Liefert: {g}', 'Da: {g}'],
    lic: ['Licence : {l}', 'Licence: {l}', 'Lizenz: {l}', 'Licencia: {l}'],
    how: ['Comment : {h}', 'How: {h}', 'Wie: {h}', 'Cómo: {h}'],
    cycled: ['Cycle {c}', 'Cycle {c}', 'Zyklus {c}', 'Ciclo {c}'],
    open: ['Ouvrir', 'Open', 'Öffnen', 'Abrir'],
    openTitle: ['Ouvrir {s} dans un nouvel onglet', 'Open {s} in a new tab', '{s} in einem neuen Tab öffnen',
      'Abrir {s} en una pestaña nueva'
    ]
  };
  const GROUP = {
    used: 'groupUsed',
    candidate: 'groupCandidate',
    abandoned: 'groupAbandoned'
  };

  function css() {
    if (cssDone) return;
    cssDone = true;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = new URL('sources.css?v=0', BASE).href;
    document.head.append(l);
  }

  function screen(box, ctx) {
    css();
    const S = window.AeroSources,
      li = ['fr', 'en', 'de', 'es'].indexOf(ctx.lang ? ctx.lang() : 'fr'),
      L = a => a[li < 0 ? 0 : li],
      t = (a, p) => ctx.t(a, p),
      cyc = S.cycleOf(),
      day = iso => new Date(`${iso}T00:00:00Z`).toLocaleDateString(ctx.lang ? ctx.lang() : 'fr', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      });
    box.dataset.screen = 'sources';
    const row = s => {
      const url = S.urlOf(s, cyc.id),
        name = L(s.n);
      return `<li class="src-row" data-src="${esc(s.id)}" data-status="${esc(s.status)}">
        <h3>${esc(name)} <span class="src-status" data-status="${esc(s.status)}">${esc(t(T[s.status]))}</span>${s.cycled ? ` <span class="f-muted">${esc(t(T.cycled, { c: cyc.id }))}</span>` : ''}</h3>
        <p>${esc(t(T.gives, { g: L(s.gives) }))}</p>
        <p class="f-muted">${esc(t(T.lic, { l: L(s.lic) }))}</p>
        ${s.how ? `<p class="f-muted">${esc(t(T.how, { h: L(s.how) }))}</p>` : ''}
        <p><a class="f-btn" data-open href="${esc(url)}" target="_blank" rel="noopener noreferrer" title="${esc(t(T.openTitle, { s: name }))}">${esc(t(T.open))}</a>
        <span class="src-url">${esc(url)}</span></p></li>`;
    };
    box.innerHTML = `<p><a data-src-back href="#settings">${esc(t(T.back))}</a></p><h1>${esc(t(T.title))}</h1>
      <p class="f-muted">${esc(t(T.intro))}</p>
      <p data-cycle>${esc(t(T.cycle, { c: cyc.id, d: day(cyc.date), n: cyc.next.id, e: day(cyc.next.date) }))}</p>
      ${S.ORDER.map(st => (list => list.length ? `<div class="f-card" data-group="${st}"><h2>${esc(t(T[GROUP[st]]))}</h2>
        <ul class="src-list">${list.map(row).join('')}</ul></div>` : '')(S.SOURCES.filter(s => s.status === st))).join('')}`;
  }
  window.AeroSourcesScreen = {
    screen,
    T
  };
  (window.SogScreens ||= {}).sources = window.AeroSourcesScreen;
})();
