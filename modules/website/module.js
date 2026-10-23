// V3 website — « Site » de l'appli Pilote (niveau 2), monté par le cadre (frame/SPEC.md § 3.2 ;
// modules/website/SPEC.md, INTEGRATION.md) : le site de la compagnie, sans API, par collage. Trois cartes :
//   · Mon journal des vols : la page « Log des vols » collée (HTML du presse-papiers d'abord, texte sinon) → mes lignes
//     (trigramme) dans pilot/<trigramme>/site_log.json, après l'aperçu de ce qui change ;
//   · Flotte de la compagnie : la page « Flotte » collée → airline/fleet.json (règles de fusion de la V2), après aperçu ;
//   · « Lire depuis le lanceur » sur ces deux cartes : la page du site par ctx.net (GET, relais du lanceur), mêmes
//     analyseurs, même aperçu ; site injoignable d'ici : « collage seulement » ;
//   · Compagnie : airline/settings.json (nom, adresse du site, pages), modifiable sur écran d'ordinateur, en lecture sur
//     téléphone ; le cadre l'expose aux modules en ctx.airline.
// Jamais de POST vers le site, jamais la connexion du pilote, aucune adresse dans le code. « Inscrire le vol » (report)
// est servi par frame/lib/website.js. Calcul pur dans model.js.
import * as W from './model.js';

export const meta = {
  id: 'website',
  apps: ['pilot'],
  level: 2,
  reads: ['airline/', 'pilot/'],
  writes: [{
    prefix: 'airline/settings.json',
    merge: 'record'
  }, {
    prefix: 'airline/fleet.json',
    merge: 'record'
  }, {
    prefix: 'pilot/',
    merge: 'record'
  }],
  files: ['model.js']
};

const SETTINGS = 'airline/settings.json',
  FLEET = 'airline/fleet.json';

// ---------------------------------------------------------------- textes [fr, en, de, es]
const TX = {
  title: ['Site de la compagnie', 'Airline website', 'Website der Fluggesellschaft', 'Sitio de la aerolínea'],
  log: ['Mon journal des vols', 'My flight log', 'Mein Flugbuch', 'Mi diario de vuelos'],
  logHelp: [
    'Sur le site, page « Log des vols » : tout sélectionner, copier, puis coller ici. Seules vos lignes (trigramme) sont gardées.',
    'On the website, “Log des vols” page: select all, copy, then paste here. Only your rows (trigram) are kept.',
    'Auf der Website, Seite „Log des vols“: alles markieren, kopieren, hier einfügen. Nur Ihre Zeilen (Trigramm) werden behalten.',
    'En el sitio, página «Log des vols»: seleccionar todo, copiar y pegar aquí. Solo se conservan sus filas (trigrama).'
  ],
  fleet: ['Flotte de la compagnie', 'Airline fleet', 'Flotte der Fluggesellschaft', 'Flota de la aerolínea'],
  fleetHelp: ['Sur le site, page « Flotte » : tout sélectionner, copier, puis coller ici.',
    'On the website, “Flotte” page: select all, copy, then paste here.',
    'Auf der Website, Seite „Flotte“: alles markieren, kopieren, hier einfügen.',
    'En el sitio, página «Flotte»: seleccionar todo, copiar y pegar aquí.'
  ],
  openPage: ['Ouvrir la page ↗', 'Open the page ↗', 'Seite öffnen ↗', 'Abrir la página ↗'],
  fetchSite: ['Lire depuis le lanceur', 'Read through the launcher', 'Über den Starter lesen', 'Leer a través del lanzador'],
  pasteOnly: ['Le site n’est pas joignable d’ici (pas de lanceur, ou site refusé) : collage seulement.',
    'The website cannot be reached from here (no launcher, or website refused): paste only.',
    'Die Website ist von hier nicht erreichbar (kein Starter oder Website abgelehnt): nur Einfügen.',
    'El sitio no es accesible desde aquí (sin lanzador o sitio rechazado): solo pegar.'
  ],
  offline: ['Hors ligne : rien n’a été demandé.', 'Offline: nothing was requested.', 'Offline: nichts wurde angefragt.',
    'Sin conexión: no se pidió nada.'
  ],
  siteError: ['Le site a répondu {s} : collez la page.', 'The website answered {s}: paste the page.',
    'Die Website antwortete {s}: Seite einfügen.',
    'El sitio respondió {s}: pegue la página.'
  ],
  clipboard: ['Coller depuis le presse-papiers', 'Paste from the clipboard', 'Aus der Zwischenablage einfügen',
    'Pegar desde el portapapeles'
  ],
  read: ['Lire', 'Read', 'Lesen', 'Leer'],
  apply: ['Enregistrer', 'Save', 'Speichern', 'Guardar'],
  cancel: ['Annuler', 'Cancel', 'Abbrechen', 'Cancelar'],
  logPreview: ['{a} nouvelle(s) ligne(s), {c} modifiée(s), {s} inchangée(s) ; {o} ligne(s) d’autres pilotes ignorée(s).',
    '{a} new row(s), {c} changed, {s} unchanged; {o} row(s) of other pilots ignored.',
    '{a} neue Zeile(n), {c} geändert, {s} unverändert; {o} Zeile(n) anderer Piloten ignoriert.',
    '{a} fila(s) nueva(s), {c} modificada(s), {s} sin cambios; {o} fila(s) de otros pilotos ignorada(s).'
  ],
  fleetPreview: ['{a} appareil(s) nouveau(x), {u} sur la page dont {c} modifié(s), {k} gardé(s) hors de la page.',
    '{a} new aircraft, {u} on the page of which {c} changed, {k} kept outside the page.',
    '{a} neue(s) Luftfahrzeug(e), {u} auf der Seite, davon {c} geändert, {k} außerhalb der Seite behalten.',
    '{a} aeronave(s) nueva(s), {u} en la página de las que {c} cambian, {k} conservada(s) fuera de la página.'
  ],
  nothing: ['Rien de lisible : copiez la page entière du site.', 'Nothing readable: copy the whole page of the website.',
    'Nichts lesbar: die ganze Seite der Website kopieren.', 'Nada legible: copie la página entera del sitio.'
  ],
  noTrigram: ['Trigramme à régler (⚙) : il choisit vos lignes du journal.', 'Trigram to set (⚙): it picks your rows of the log.',
    'Trigramm einstellen (⚙): es wählt Ihre Zeilen im Flugbuch.', 'Trigrama por ajustar (⚙): elige sus filas del diario.'
  ],
  savedLog: ['Journal enregistré : {n} vol(s).', 'Log saved: {n} flight(s).', 'Flugbuch gespeichert: {n} Flug/Flüge.',
    'Diario guardado: {n} vuelo(s).'
  ],
  savedFleet: ['Flotte enregistrée : {n} appareil(s).', 'Fleet saved: {n} aircraft.', 'Flotte gespeichert: {n} Luftfahrzeug(e).',
    'Flota guardada: {n} aeronave(s).'
  ],
  kept: ['Gardé : {n} vol(s) au journal, mis à jour {d}.', 'Kept: {n} flight(s) in the log, updated {d}.',
    'Gespeichert: {n} Flug/Flüge, aktualisiert {d}.',
    'Guardado: {n} vuelo(s), actualizado {d}.'
  ],
  keptFleet: ['Gardée : {n} appareil(s), mise à jour {d}.', 'Kept: {n} aircraft, updated {d}.',
    'Gespeichert: {n} Luftfahrzeug(e), aktualisiert {d}.',
    'Guardada: {n} aeronave(s), actualizada {d}.'
  ],
  airline: ['Compagnie', 'Airline', 'Fluggesellschaft', 'Aerolínea'],
  name: ['Nom', 'Name', 'Name', 'Nombre'],
  site: ['Adresse du site', 'Website address', 'Website-Adresse', 'Dirección del sitio'],
  pages: {
    recordFlight: ['Page « Enregistrer mon vol »', '“Record my flight” page', 'Seite „Flug eintragen“', 'Página «Registrar mi vuelo»'],
    log: ['Page du journal des vols', 'Flight log page', 'Flugbuch-Seite', 'Página del diario de vuelos'],
    fleet: ['Page de la flotte', 'Fleet page', 'Flotten-Seite', 'Página de la flota'],
    aircraft: ['Page d’un appareil ({id})', 'Aircraft page ({id})', 'Luftfahrzeug-Seite ({id})', 'Página de una aeronave ({id})']
  },
  pathHint: ['Chemin sous le site (/log_vols.php) ou adresse complète.', 'Path under the website (/log_vols.php) or full address.',
    'Pfad unter der Website (/log_vols.php) oder vollständige Adresse.', 'Ruta bajo el sitio (/log_vols.php) o dirección completa.'
  ],
  saveAirline: ['Enregistrer la compagnie', 'Save the airline', 'Fluggesellschaft speichern', 'Guardar la aerolínea'],
  savedAirline: ['Compagnie enregistrée : elle partira à la prochaine synchronisation.',
    'Airline saved: it will leave at the next synchronisation.',
    'Fluggesellschaft gespeichert: sie geht bei der nächsten Synchronisation hinaus.',
    'Aerolínea guardada: saldrá en la próxima sincronización.'
  ],
  readOnly: ['Se modifie sur un écran d’ordinateur.', 'Edited on a computer screen.', 'Wird an einem Computerbildschirm bearbeitet.',
    'Se modifica en una pantalla de ordenador.'
  ],
  unset: ['non réglé', 'not set', 'nicht eingestellt', 'sin ajustar'],
  clipboardDenied: ['Presse-papiers refusé : collez dans la zone (Ctrl+V).', 'Clipboard refused: paste into the box (Ctrl+V).',
    'Zwischenablage verweigert: in das Feld einfügen (Strg+V).', 'Portapapeles denegado: pegue en el recuadro (Ctrl+V).'
  ]
};

let S = null;

/** Échappe un texte pour le HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** Texte d'une ligne [fr, en, de, es]. */
const tt = (row, v) => S.ctx.t(row, v);
/** Trigramme de l'identité, majuscules. */
const tri = () => String(S.ctx.identity.trigram || '').trim().toUpperCase();
/** Chemin de mon journal du site. */
const logPath = () => `pilot/${tri()}/site_log.json`;
/** Écran d'ordinateur (la carte Compagnie s'y modifie). */
const wide = () => matchMedia('(min-width: 980px)').matches;
/** Date lisible. */
const when = iso => iso ? new Date(iso).toLocaleString(S.ctx.lang()) : '—';

// ---------------------------------------------------------------- écran
// placement seulement (primitives et jetons du cadre : frame/design/INTEGRATION.md) : aperçu borné en hauteur
const STYLE = `
[data-module="website"] .f-callout .f-scroll{max-height:260px;overflow-y:auto}`;

/** Carte de collage d'une page du site (kind : log | fleet) : aide, lien vers la page, zone, boutons, aperçu. */
function pasteCard(kind) {
  const isLog = kind === 'log',
    url = W.pageUrl(S.airline, isLog ? 'log' : 'fleet'),
    doc = isLog ? S.logDoc : S.fleetDoc,
    kept = isLog ? tt(TX.kept, {
      n: doc?.entries?.length || 0,
      d: when(doc?.updated_at)
    }) : tt(TX.keptFleet, {
      n: doc?.aircraft?.length || 0,
      d: when(doc?.updated_at)
    }),
    pv = S.preview?.kind === kind ? S.preview : null;
  return `<div class="f-card" data-kind="${kind}"><h2>${esc(tt(isLog ? TX.log : TX.fleet))}</h2>
    <p class="f-muted">${esc(tt(isLog ? TX.logHelp : TX.fleetHelp))}${url ? ` <a href="${esc(url)}" target="_blank" rel="noopener">${esc(tt(TX.openPage))}</a>` : ''}</p>
    ${isLog && !tri() ? `<p class="f-warn">${esc(tt(TX.noTrigram))}</p>` : ''}
    <p class="f-muted">${esc(kept)}</p>
    <label class="f-field"><textarea rows="4" data-paste="${kind}" aria-label="${esc(tt(isLog ? TX.log : TX.fleet))}"></textarea></label>
    <div class="f-row">${url && S.canFetch ? `<button type="button" data-do="fetch">${esc(tt(TX.fetchSite))}</button>` : ''}<button type="button" data-do="clip">${esc(tt(TX.clipboard))}</button><button type="button" class="primary" data-do="read">${esc(tt(TX.read))}</button></div>
    ${url && !S.canFetch ? `<p class="f-muted">${esc(tt(TX.pasteOnly))}</p>` : ''}
    ${pv ? `<div class="f-callout"><p>${esc(pv.summary)}</p>${pv.rows.length ? `<div class="f-scroll"><table class="f-table"><tbody>${pv.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ''}
      <div class="f-row" style="margin-top:8px"><button type="button" class="primary" data-do="apply">${esc(tt(TX.apply))}</button><button type="button" data-do="cancel">${esc(tt(TX.cancel))}</button></div></div>` : ''}
  </div>`;
}
/** Carte Compagnie : formulaire sur écran d'ordinateur, lecture seule sur téléphone. */
function airlineCard() {
  const a = S.airline,
    keys = ['recordFlight', 'log', 'fleet', 'aircraft'];
  if (!wide()) return `<div class="f-card"><h2>${esc(tt(TX.airline))}</h2><dl class="f-dl">
      <dt>${esc(tt(TX.name))}</dt><dd>${esc(a.name || tt(TX.unset))}</dd><dt>${esc(tt(TX.site))}</dt><dd>${esc(a.site || tt(TX.unset))}</dd>
      ${keys.map(k => `<dt>${esc(tt(TX.pages[k], { id: '{id}' }))}</dt><dd>${esc(a.pages[k] || tt(TX.unset))}</dd>`).join('')}</dl>
      <p class="f-muted">${esc(tt(TX.readOnly))}</p></div>`;
  const fld = (k, label, v, hint = '') => `<label class="f-field"><span>${esc(label)}</span><input data-a="${k}" value="${esc(v)}"${hint ? ` placeholder="${esc(hint)}"` : ''}></label>`;
  return `<div class="f-card"><h2>${esc(tt(TX.airline))}</h2><div class="f-grid" style="--f-min:220px">
      ${fld('name', tt(TX.name), a.name)}${fld('site', tt(TX.site), a.site, 'https://…')}
      ${keys.map(k => fld(`pages.${k}`, tt(TX.pages[k], { id: '{id}' }), a.pages[k], '/…')).join('')}</div>
      <p class="f-muted">${esc(tt(TX.pathHint))}</p>
      <button type="button" class="primary" data-do="airline">${esc(tt(TX.saveAirline))}</button></div>`;
}
/** Dessine les trois cartes. */
function render() {
  if (!S?.body) return;
  S.body.innerHTML = `<div class="f-cols" style="--f-cols:2"><div>${pasteCard('log')}${pasteCard('fleet')}</div><div>${airlineCard()}</div></div>`;
  for (const ta of S.body.querySelectorAll('[data-paste]')) {
    if (S.text[ta.dataset.paste]) ta.value = S.text[ta.dataset.paste];
    ta.onpaste = e => {
      // HTML de la page (tableaux, liens) quand le presse-papiers en a : meilleur que le texte
      const html = e.clipboardData?.getData('text/html');
      S.html[ta.dataset.paste] = html || '';
      setTimeout(() => S.text[ta.dataset.paste] = ta.value, 0);
    };
    ta.oninput = () => {
      S.text[ta.dataset.paste] = ta.value;
      if (!ta.value) S.html[ta.dataset.paste] = '';
    };
  }
}
/** Lit le presse-papiers (HTML d'abord, texte sinon) dans la zone de la carte. */
async function fromClipboard(kind) {
  try {
    let html = '',
      text = '';
    if (navigator.clipboard?.read) {
      for (const item of await navigator.clipboard.read()) {
        if (item.types.includes('text/html')) html = await (await item.getType('text/html')).text();
        if (item.types.includes('text/plain')) text = await (await item.getType('text/plain')).text();
      }
    } else text = await navigator.clipboard.readText();
    S.html[kind] = html;
    S.text[kind] = text || html;
    render();
    return read(kind);
  } catch {
    S.ctx.notify(tt(TX.clipboardDenied), 'warn');
  }
}
/** Lit la page du site (journal ou flotte) par ctx.net — GET seulement, sans connexion : le lanceur la relaie ; sans
 *  lanceur, le navigateur ne peut pas la lire (autre origine) — puis la passe aux mêmes analyseurs que le collage, avec
 *  le même aperçu. Site injoignable d'ici : le bouton disparaît (« collage seulement ») pour la session. */
async function fromSite(kind) {
  const url = W.pageUrl(S.airline, kind === 'log' ? 'log' : 'fleet');
  if (!url) return;
  const r = await S.ctx.net.fetch(url, {
    headers: {
      accept: 'text/html'
    }
  });
  // hors ligne pour de bon : on garde le bouton ; 503 sans réseau coupé (refus, CORS) ou injoignable : collage seulement
  if (r.headers.get('x-sog-offline') && S.ctx.net.online?.() === false) return S.ctx.notify(tt(TX.offline), 'warn');
  if (r.headers.get('x-sog-unreachable') || r.headers.get('x-sog-offline')) {
    S.canFetch = false;
    S.ctx.notify(tt(TX.pasteOnly), 'warn');
    return render();
  }
  if (!r.ok) return S.ctx.notify(tt(TX.siteError, {
    s: r.status
  }), 'warn');
  const html = await r.text();
  S.html[kind] = html;
  S.text[kind] = '';
  read(kind);
}
/** Analyse le collage d'une carte et prépare l'aperçu de ce qui change (rien n'est écrit). */
function read(kind) {
  const src = S.html[kind] || S.text[kind] || '';
  try {
    if (kind === 'log') {
      if (!tri()) return S.ctx.notify(tt(TX.noTrigram), 'warn');
      const rows = W.parseLog(src);
      if (!rows.length) return S.ctx.notify(tt(TX.nothing), 'warn');
      const m = W.mergeLog(S.logDoc?.entries, rows, tri());
      S.preview = {
        kind,
        result: m,
        summary: tt(TX.logPreview, {
          a: m.added,
          c: m.changed,
          s: m.same,
          o: m.others
        }),
        rows: m.news.slice(0, 30).map(r => [r.date, r.time, r.callsign, r.registration, [r.dep, r.arr].filter(Boolean).join(' → '), r
          .mission
        ])
      };
    } else {
      const page = W.parseFleet(src);
      if (!page.length) return S.ctx.notify(tt(TX.nothing), 'warn');
      const m = W.mergeFleet(S.fleetDoc?.aircraft, page),
        old = new Set((S.fleetDoc?.aircraft || []).map(a => a.registration));
      S.preview = {
        kind,
        result: m,
        summary: tt(TX.fleetPreview, {
          a: m.added,
          u: m.updated + m.added,
          c: m.changed.length,
          k: m.kept
        }),
        rows: m.aircraft.filter(a => !old.has(a.registration) || m.changed.includes(a.registration)).slice(0, 30).map(a => [a
          .registration, a.type,
          a.operator, a.base, a.location
        ])
      };
    }
  } catch (e) {
    return S.ctx.notify(String(e.message || e), 'err');
  }
  render();
}
/** Écrit ce que l'aperçu montre : mon journal (pilot/<trigramme>/site_log.json) ou la flotte (airline/fleet.json). */
async function apply() {
  const p = S.preview;
  if (!p) return;
  const at = new Date().toISOString();
  if (p.kind === 'log') {
    S.logDoc = {
      schema: 1,
      updated_at: at,
      by: 'website',
      entries: p.result.entries
    };
    await S.ctx.data.put(logPath(), S.logDoc);
    S.ctx.notify(tt(TX.savedLog, {
      n: p.result.entries.length
    }), 'ok');
  } else {
    S.fleetDoc = {
      schema: 1,
      updated_at: at,
      by: tri() || 'website',
      aircraft: p.result.aircraft
    };
    await S.ctx.data.put(FLEET, S.fleetDoc);
    S.ctx.notify(tt(TX.savedFleet, {
      n: p.result.aircraft.length
    }), 'ok');
  }
  S.preview = null;
  S.text[p.kind] = '';
  S.html[p.kind] = '';
  render();
}
/** Enregistre la compagnie (champs de la carte), normalisée. */
async function saveAirline() {
  const v = {
    pages: {}
  };
  for (const i of S.body.querySelectorAll('[data-a]')) {
    const k = i.dataset.a;
    k.startsWith('pages.') ? v.pages[k.slice(6)] = i.value : v[k] = i.value;
  }
  S.airline = W.airlineSettings(v);
  await S.ctx.data.put(SETTINGS, {
    ...((await S.ctx.data.get(SETTINGS)) || {}),
    ...S.airline,
    schema: 1,
    updated_at: new Date().toISOString(),
    by: tri()
  });
  S.ctx.notify(tt(TX.savedAirline), 'ok');
  render();
}
/** Gestes des cartes. */
function onClick(e) {
  const b = e.target.closest('button');
  if (!b) return;
  const kind = b.closest('[data-kind]')?.dataset.kind;
  switch (b.dataset.do) {
    case 'clip':
      return fromClipboard(kind);
    case 'fetch':
      return fromSite(kind);
    case 'read':
      return read(kind);
    case 'apply':
      return apply();
    case 'cancel':
      S.preview = null;
      return render();
    case 'airline':
      return saveAirline();
  }
}

export async function mount(el, ctx) {
  S = {
    el,
    ctx,
    text: {},
    html: {},
    preview: null,
    canFetch: !!ctx.net // le premier refus du site le coupe pour la session
  };
  el.innerHTML = `<style>${STYLE}</style><h1>${esc(tt(TX.title))}</h1><div data-body></div>`;
  S.body = el.querySelector('[data-body]');
  S.body.addEventListener('click', onClick);
  S.airline = W.airlineSettings((await ctx.data.get(SETTINGS)) || ctx.airline || {});
  S.logDoc = tri() ? await ctx.data.get(logPath()) : null;
  S.fleetDoc = await ctx.data.get(FLEET);
  render();
  // passage écran ↔ téléphone : carte Compagnie redessinée
  S.mq = matchMedia('(min-width: 980px)');
  S.onMq = () => render();
  S.mq.addEventListener('change', S.onMq);
}

export function unmount() {
  if (!S) return;
  S.mq?.removeEventListener('change', S.onMq);
  S.body = null;
  S = null;
}
