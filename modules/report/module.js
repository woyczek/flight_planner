// V3 report — le compte rendu de mission de l'appli Pilote, monté par le cadre (frame/SPEC.md § 3.2 ;
// modules/report/SPEC.md, INTEGRATION.md). Trois pas, Vol · Mission · Résultat (un à la fois sur téléphone, côte à côte
// sur écran large), un bouton d'enregistrement collant en bas ; rien d'obligatoire : ce qui manque est dit au Résultat.
// Un CR = un enregistrement JSON, cr/reports/<année>/<n° de CR>.json (fusion record) : l'entrée du registre V2
// (shared/mission_core/model.js, schéma 2) plus schema, updated_at et by ; le pont du lanceur le rejoue dans
// cr/missions.yaml pour la V2 et CPCO. Brouillon sur l'appareil (cache/report/draft.json). Vocabulaire, modèle et
// famille recopiés de la V2 (vocab.js, model.js, families/*.js) ; ici seulement l'écran et ctx.
import * as V from './vocab.js';
import * as M from './model.js';
import HEMS from './families/hems.js';

export const meta = {
  id: 'report',
  apps: ['pilot'],
  level: 1,
  reads: ['cr/', 'pilot/', 'cache/report/'],
  writes: [{
    prefix: 'cr/reports/',
    merge: 'record'
  }, {
    prefix: 'cache/report/',
    policy: 'cache'
  }],
  files: ['vocab.js', 'model.js', 'families/hems.js']
};

const FAMILIES = {
    HEMS
  },
  DRAFT = 'cache/report/draft.json',
  SCHEMA = 'sog-report/1';

// ---------------------------------------------------------------- textes [fr, en, de, es]
const L = V.L;
const TX = {
  title: L('Compte rendu', 'Mission report', 'Einsatzbericht', 'Informe de misión'),
  steps: [L('Vol', 'Flight', 'Flug', 'Vuelo'), L('Mission', 'Mission', 'Einsatz', 'Misión'), L('Résultat', 'Result', 'Ergebnis',
    'Resultado')],
  next: L('Suivant →', 'Next →', 'Weiter →', 'Siguiente →'),
  save: L('Enregistrer', 'Save', 'Speichern', 'Guardar'),
  saveEdit: L('Enregistrer les modifications', 'Save changes', 'Änderungen speichern', 'Guardar cambios'),
  saved: L('CR {id} enregistré : il partira à la prochaine synchronisation.',
    'Report {id} saved: it will leave at the next synchronisation.',
    'Bericht {id} gespeichert: er geht bei der nächsten Synchronisation hinaus.',
    'Informe {id} guardado: saldrá en la próxima sincronización.'),
  newReport: L('Nouveau CR', 'New report', 'Neuer Bericht', 'Nuevo informe'),
  recent: L('Mes derniers CR', 'My last reports', 'Meine letzten Berichte', 'Mis últimos informes'),
  noRecent: L('Aucun CR enregistré.', 'No report saved.', 'Kein Bericht gespeichert.', 'Ningún informe guardado.'),
  editing: L('Modification de {id}', 'Editing {id}', 'Bearbeitung von {id}', 'Edición de {id}'),
  draft: L('Brouillon repris ({d}).', 'Draft restored ({d}).', 'Entwurf wiederhergestellt ({d}).', 'Borrador recuperado ({d}).'),
  current: L('Vol en cours (carburant / carte)', 'Current flight (fuel / maps)', 'Aktueller Flug (Kraftstoff / Karte)',
    'Vuelo actual (combustible / mapa)'),
  use: L('Utiliser', 'Use', 'Übernehmen', 'Usar'),
  filled: L('{n} champ(s) rempli(s) depuis {s}.', '{n} field(s) filled from {s}.', '{n} Feld(er) aus {s} ausgefüllt.',
    '{n} campo(s) rellenado(s) desde {s}.'),
  nothing: L('Rien à reprendre : les champs sont déjà remplis.', 'Nothing to take: the fields are already filled.',
    'Nichts zu übernehmen: die Felder sind schon ausgefüllt.', 'Nada que tomar: los campos ya están rellenados.'),
  more: L('Plus de champs', 'More fields', 'Weitere Felder', 'Más campos'),
  dep: L('Départ (OACI)', 'Departure (ICAO)', 'Abflug (ICAO)', 'Salida (OACI)'),
  arr: L('Arrivée (OACI)', 'Arrival (ICAO)', 'Ankunft (ICAO)', 'Llegada (OACI)'),
  family: L('Famille', 'Family', 'Familie', 'Familia'),
  familySoon: L('{f} (bientôt)', '{f} (soon)', '{f} (bald)', '{f} (pronto)'),
  crew: L('Équipage', 'Crew', 'Besatzung', 'Tripulación'),
  addCrew: L('+ Membre', '+ Member', '+ Mitglied', '+ Miembro'),
  remove: L('Retirer', 'Remove', 'Entfernen', 'Quitar'),
  fuel: L('Carburant', 'Fuel', 'Kraftstoff', 'Combustible'),
  missing: L('À compléter (non bloquant) : {l}.', 'To complete (not blocking): {l}.', 'Zu ergänzen (nicht blockierend): {l}.',
    'Por completar (no bloqueante): {l}.'),
  complete: L('Rien ne manque.', 'Nothing is missing.', 'Nichts fehlt.', 'No falta nada.'),
  issues: {
    dateInvalid: L('date invalide', 'invalid date', 'ungültiges Datum', 'fecha no válida'),
    future: L('date dans le futur', 'date in the future', 'Datum in der Zukunft', 'fecha futura'),
    invalid: L('heure invalide ({v})', 'invalid time ({v})', 'ungültige Uhrzeit ({v})', 'hora no válida ({v})'),
    order: L('heures dans le désordre ({v} avant {o})', 'times out of order ({v} before {o})',
      'Zeiten in falscher Reihenfolge ({v} vor {o})',
      'horas desordenadas ({v} antes de {o})'),
    span: L('chronologie de plus de 20 h', 'timeline longer than 20 h', 'Zeitleiste länger als 20 h', 'cronología de más de 20 h'),
    fuel: L('carburant final supérieur au départ', 'final fuel above the start', 'Endkraftstoff über dem Start',
      'combustible final superior al inicial')
  },
  need: {
    reg: L('immatriculation', 'registration', 'Kennzeichen', 'matrícula'),
    times: L('décollage et atterrissage', 'take-off and landing', 'Start und Landung', 'despegue y aterrizaje'),
    crew: L('équipage', 'crew', 'Besatzung', 'tripulación'),
    fuel: L('carburant départ et arrivée', 'fuel at start and landing', 'Kraftstoff Start und Landung', 'combustible inicial y final'),
    outcome: L('résultat', 'outcome', 'Ergebnis', 'resultado')
  },
  warnings: L('Vérifier : {l}.', 'Check: {l}.', 'Prüfen: {l}.', 'Comprobar: {l}.')
};
// champs communs du CR court (libellés de shared/mission_core/blocks.js)
const f = (path, label, type = 'text', extra = {}) => ({
  path,
  label,
  type,
  ...extra
});
const FIELDS = {
  date: f('metadata.date', L('Date', 'Date', 'Datum', 'Fecha'), 'date'),
  registration: f('aircraft.0.registration', L('Immatriculation', 'Registration', 'Kennzeichen', 'Matrícula'), 'text', {
    code: true
  }),
  type: f('aircraft.0.type', L('Type (OACI)', 'Type (ICAO)', 'Muster (ICAO)', 'Tipo (OACI)'), 'text', {
    code: true
  }),
  callsign: f('aircraft.0.callsign', L('Indicatif complet', 'Full callsign', 'Vollständiges Rufzeichen', 'Indicativo completo'), 'text', {
    code: true
  }),
  dep: f('navigation.dep', TX.dep, 'text', {
    code: true
  }),
  arr: f('navigation.arr', TX.arr, 'text', {
    code: true
  }),
  engineStart: f('timeline.engineStart', L('Mise en route', 'Engine start', 'Anlassen', 'Puesta en marcha'), 'time'),
  takeoff: f('timeline.takeoff', L('Décollage', 'Take-off', 'Start', 'Despegue'), 'time'),
  landing: f('timeline.landing', L('Atterrissage', 'Landing', 'Landung', 'Aterrizaje'), 'time'),
  shutdown: f('timeline.shutdown', L('Arrêt moteurs', 'Shutdown', 'Abstellen', 'Parada de motores'), 'time'),
  callsignPrefix: f('aircraft.0.callsignPrefix', L('Indicatif', 'Callsign', 'Rufzeichen', 'Indicativo'), 'text', {
    code: true
  }),
  callsignNumber: f('aircraft.0.callsignNumber', L('Numéro', 'Number', 'Nummer', 'Número')),
  callsignFpl: f('aircraft.0.callsignFpl', L('Indicatif plan de vol (7 car. max)', 'Flight plan callsign (7 chars max)',
    'Flugplan-Rufzeichen (max. 7 Zeichen)', 'Indicativo plan de vuelo (máx. 7 car.)'), 'text', {
    code: true
  }),
  baseDeparture: f('aircraft.0.baseDeparture', L('Base de départ', 'Departure base', 'Startbasis', 'Base de salida'), 'text', {
    code: true
  }),
  baseReturn: f('aircraft.0.baseReturn', L('Base de retour', 'Return base', 'Rückkehrbasis', 'Base de regreso'), 'text', {
    code: true
  }),
  landingAd: f('aircraft.0.landingAd', L('Terrain d’atterrissage réel (OACI)', 'Actual landing aerodrome (ICAO)',
    'Tatsächlicher Landeflugplatz (ICAO)', 'Aeródromo de aterrizaje real (OACI)'), 'text', {
    code: true
  }),
  altn: f('navigation.altn', L('Dégagement (ALTN)', 'Alternate (ALTN)', 'Ausweichflugplatz (ALTN)', 'Alternativo (ALTN)'), 'text', {
    code: true
  }),
  series: f('series', L('Série', 'Series', 'Serie', 'Serie'), 'select'),
  missionNumber: f('metadata.missionNumber', L('Mission (identifiant)', 'Mission (identifier)', 'Einsatz (Kennung)',
    'Misión (identificador)'), 'text', {
    code: true
  }),
  outcome: f('results.outcome', L('Résultat', 'Outcome', 'Ergebnis', 'Resultado'), 'select', {
    options: V.outcomes,
    blank: true
  }),
  observations: f('remarks.observations', L('Observations', 'Observations', 'Beobachtungen', 'Observaciones'), 'textarea'),
  fuelUnit: f('fuel.unit', L('Unité', 'Unit', 'Einheit', 'Unidad'), 'select', {
    options: V.fuelUnits
  }),
  fuelStart: f('fuel.start', L('FOB départ', 'FOB start', 'FOB Start', 'FOB inicial'), 'number'),
  fuelLanding: f('fuel.landing', L('À l’atterrissage', 'At landing', 'Bei der Landung', 'Al aterrizaje'), 'number')
};

// ---------------------------------------------------------------- état (un montage à la fois)
let S = null;

/** Échappe un texte pour le HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** Texte d'une ligne [fr, en, de, es] dans la langue de l'appli. */
const tt = (row, v) => S.ctx.t(row, v);
/** Aujourd'hui, AAAA-MM-JJ (heure locale). */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Valeur vide (chaîne vide, null, indéfinie) ? */
const empty = v => v === undefined || v === null || v === '';

// ---------------------------------------------------------------- données
/** Chemin d'un CR : cr/reports/<année de sa date>/<n° de CR>.json. */
const reportPath = m => `cr/reports/${(m.metadata.date || today()).slice(0, 4)}/${m.metadata.missionId}.json`;
/** Numéros de CR déjà pris : ceux de cr/reports/ (noms de fichiers) et ceux du registre V2 cr/missions.yaml. */
async function knownIds() {
  const ids = ((await S.ctx.data.list('cr/reports/')) || []).map(p => p.split('/').pop().replace(/\.json$/, '')),
    yaml = await S.ctx.data.get('cr/missions.yaml');
  if (typeof yaml === 'string')
    for (const m of yaml.matchAll(/missionId:\s*['"]?(CR[A-Z]-[A-Z0-9]+-\d+)/g)) ids.push(m[1]);
  return ids;
}
/** Mes derniers CR (les dix plus récents de cr/reports/, par nom de chemin : année puis numéro). */
async function recentReports() {
  const paths = ((await S.ctx.data.list('cr/reports/')) || []).filter(p => p.endsWith('.json')).sort().reverse().slice(0, 30),
    out = [];
  for (const p of paths) {
    const r = await S.ctx.data.get(p);
    if (r && (!S.ctx.identity.trigram || !r.by || r.by === S.ctx.identity.trigram)) out.push({
      path: p,
      r
    });
  }
  return out.sort((a, b) => String(b.r.updated_at || '').localeCompare(String(a.r.updated_at || ''))).slice(0, 10);
}
/** CR neuf : mission vide de la famille (première série, date du jour, catégorie de la famille, moi commandant de bord,
 *  identifiants réseau de l'identité) — le fresh() de la V2 sans le registre ni la météo. */
function freshMission(fam = 'HEMS') {
  const F = FAMILIES[fam],
    m = M.emptyMission(fam);
  m.series = F.series?.[0]?.value || '';
  m.metadata.date = today();
  m.aircraft[0].category = F.defaultCategory || '';
  const tri = S.ctx.identity.trigram || '';
  if (tri) m.crew = [{
    role: 'PIC',
    name: tri,
    aircraft: 1,
    notes: ''
  }];
  m.network.ivaoId = S.ctx.identity.ivao || '';
  m.network.vatsimId = S.ctx.identity.vatsim || '';
  return m;
}
/** Brouillon écrit sur l'appareil (après un temps calme) : la mission, son chemin s'il est déjà enregistré, les sources. */
function saveDraft() {
  clearTimeout(S.draftTimer);
  const s = S;
  s.draftTimer = setTimeout(() => s.ctx.data.put(DRAFT, {
    at: new Date().toISOString(),
    path: s.path,
    mission: s.m,
    sources: s.sources
  }, {
    policy: 'cache'
  }), 600);
}
/** Enregistre le CR : numéro attribué au premier enregistrement (V2 : crId, toutes familles), statistiques, auteur,
 *  enregistrement JSON daté ; le brouillon est effacé, l'écran passe en modification. */
async function save() {
  const m = S.m,
    tri = S.ctx.identity.trigram || '';
  if (!S.path) {
    m.metadata.missionId = V.crId({
      family: m.family,
      missionNumber: m.metadata.missionNumber,
      crIds: await knownIds()
    });
  }
  m.statistics = M.computeStatistics(m);
  if (tri) m.metadata.reportedBy = tri;
  const path = S.path || reportPath(m),
    prev = S.path ? (await S.ctx.data.get(path)) || {} : {};
  await S.ctx.data.put(path, {
    ...prev,
    ...structuredClone(m),
    schema: SCHEMA,
    updated_at: new Date().toISOString(),
    by: tri || prev.by || ''
  });
  S.path = path;
  await S.ctx.data.remove(DRAFT).catch(() => {});
  S.ctx.notify(tt(TX.saved, {
    id: m.metadata.missionId
  }), 'ok');
  render();
}

// ---------------------------------------------------------------- champs
/** Libellé d'une option ou d'un champ. */
const lab = x => Array.isArray(x) ? tt(x) : String(x ?? '');
/** Contrôle HTML d'un champ (définition V2 : path, label, type, options, blank) à la valeur v ; source affichée. */
function control(fd, v, prefix = '') {
  const path = prefix + fd.path,
    src = S.sources[path] ? `<span class="rp-src">${esc(S.sources[path])}</span>` : '',
    common = `data-path="${esc(path)}" aria-label="${esc(lab(fd.label))}"`,
    opts = fd.path === 'series' ? (FAMILIES[S.m.family]?.series || []) : fd.options || [];
  let input;
  if (fd.type === 'select') input = `<select ${common}>${fd.blank ? '<option value=""></option>' : ''}${opts.map(o => `<option value="${esc(o.value)}"${String(v ?? '') === String(o.value) ? ' selected' : ''}>${esc(lab(o.label))}</option>`).join('')}</select>`;
  else if (fd.type === 'textarea') input = `<textarea rows="3" ${common}>${esc(v ?? '')}</textarea>`;
  else input = `<input ${common} type="${fd.type === 'time' ? 'time' : fd.type === 'date' ? 'date' : 'text'}"${fd.type === 'number' ? ' inputmode="decimal"' : ''}${fd.code ? ' class="rp-code" autocapitalize="characters"' : ''} value="${esc(v ?? '')}">`;
  return `<label class="f-field${fd.full || fd.type === 'textarea' ? ' rp-full' : ''}"><span>${esc(lab(fd.label))} ${src}</span>${input}</label>`;
}
/** Grille de champs de la mission. */
const grid = list => `<div class="rp-grid">${list.map(fd => control(fd, M.get(S.m, fd.path))).join('')}</div>`;
/** Collection (destinations, équipage) : une ligne de champs par élément, ajout et retrait. */
function collection(col, title) {
  const items = M.get(S.m, col.path) || [];
  return `<div class="rp-col" data-col="${esc(col.path)}">${title ? `<h3>${esc(title)}</h3>` : ''}
    ${items.map((it, i) => `<div class="rp-item"><div class="rp-grid">${col.fields.map(fd => control(fd, it?.[fd.path], `${col.path}.${i}.`)).join('')}</div><button type="button" data-do="del" data-i="${i}">${esc(tt(TX.remove))}</button></div>`).join('')}
    <button type="button" data-do="add">${esc(col.add ? tt(col.add) : tt(TX.addCrew))}</button></div>`;
}
// équipage (bloc crew de la V2 : rôle, nom ; rôles de la famille)
const crewCol = () => ({
  path: 'crew',
  add: TX.addCrew,
  empty: () => ({
    role: '',
    name: '',
    aircraft: 1,
    notes: ''
  }),
  fields: [f('role', L('Rôle', 'Role', 'Rolle', 'Función'), 'select', {
    blank: true,
    options: V.crewRoles.filter(r => !FAMILIES[S.m.family]?.crewRoles || FAMILIES[S.m.family].crewRoles.includes(r.value))
  }), f('name', L('Nom / indicatif', 'Name / callsign', 'Name / Rufzeichen', 'Nombre / indicativo'), 'text', {
    code: true
  })]
});

// ---------------------------------------------------------------- écran
const STYLE = `
[data-module="report"] h1{font-size:1.25rem;margin:0 0 10px}
[data-module="report"] h2{font-size:1rem;margin:0 0 8px}
[data-module="report"] h3{font-size:.95rem;margin:8px 0 4px}
[data-module="report"] .rp-steps{display:flex;gap:6px;margin-bottom:var(--sog-gap)}
[data-module="report"] .rp-steps button{flex:1}
[data-module="report"] .rp-steps button[aria-current="step"]{background:var(--sog-accent);color:var(--sog-accent-ink);border-color:var(--sog-accent)}
[data-module="report"] .rp-steps .rp-ok::after{content:" ✓"}
[data-module="report"] .rp-grid{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr))}
[data-module="report"] .rp-grid .f-field{margin:0}
[data-module="report"] .rp-full{grid-column:1/-1}
[data-module="report"] .f-field input,[data-module="report"] .f-field select,[data-module="report"] .f-field textarea{width:100%;min-width:0}
[data-module="report"] .f-field>span{font-size:.9em}
[data-module="report"] .rp-code{text-transform:uppercase}
[data-module="report"] .rp-src{font-size:.75em;color:var(--sog-accent);margin-left:4px}
[data-module="report"] .rp-step[hidden]{display:none}
[data-module="report"] details.f-card>summary{min-height:var(--sog-touch);display:flex;align-items:center;cursor:pointer;font-weight:600}
[data-module="report"] .rp-item{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end;margin-bottom:8px}
[data-module="report"] .rp-bar{position:sticky;bottom:0;z-index:2;display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-color:var(--sog-accent);box-shadow:0 -4px 14px #0002}
[data-module="report"] .rp-bar .primary{flex:1;min-width:160px}
[data-module="report"] .rp-warn{color:var(--sog-warn)}
[data-module="report"] .rp-prefill{display:flex;gap:10px;align-items:center;justify-content:space-between;border-color:var(--sog-accent)}
[data-module="report"] .rp-recent button{width:100%;text-align:left;margin-bottom:6px}
@media (min-width: 980px){
  [data-module="report"] .rp-steps{display:none}
  [data-module="report"] .rp-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--sog-gap);align-items:start}
  [data-module="report"] .rp-step[hidden]{display:block}
  [data-module="report"] .rp-next{display:none}
}`;

/** Dessine tout l'écran (étapes, champs, barre d'enregistrement). */
function render() {
  const m = S.m,
    F = FAMILIES[m.family] || HEMS,
    step = S.step,
    stepBtn = (i, ok) => `<button type="button" data-step="${i}"${i === step ? ' aria-current="step"' : ''} class="${ok ? 'rp-ok' : ''}">${i + 1} ${esc(tt(TX.steps[i]))}</button>`,
    done = progress();
  S.body.innerHTML = `
    <div class="f-row" style="margin-bottom:8px"><span class="f-muted">${S.path ? esc(tt(TX.editing, { id: m.metadata.missionId })) : esc(m.metadata.missionId || '')}</span>
      <button type="button" data-do="new">${esc(tt(TX.newReport))}</button></div>
    <details class="f-card rp-recent" data-recent><summary>${esc(tt(TX.recent))}</summary><div data-recentlist></div></details>
    <nav class="rp-steps">${[0, 1, 2].map(i => stepBtn(i, done[i])).join('')}</nav>
    <div class="rp-cols">
      <section class="rp-step" data-s="0"${step === 0 ? '' : ' hidden'}>
        <div data-prefill></div>
        <div class="f-card"><h2>${esc(tt(TX.steps[0]))}</h2>
          ${grid([FIELDS.date, FIELDS.registration, FIELDS.type, FIELDS.callsign, FIELDS.dep, FIELDS.arr])}
          <h3>${esc(lab(L('Heures', 'Times', 'Zeiten', 'Horas')))}</h3>
          ${grid([FIELDS.engineStart, FIELDS.takeoff, FIELDS.landing, FIELDS.shutdown])}</div>
        <details class="f-card"><summary>${esc(tt(TX.more))}</summary>${grid([FIELDS.callsignPrefix, FIELDS.callsignNumber, FIELDS.callsignFpl, FIELDS.baseDeparture, FIELDS.baseReturn, FIELDS.landingAd, FIELDS.altn])}</details>
        <div class="f-row rp-next"><button type="button" data-step="1">${esc(tt(TX.next))}</button></div>
      </section>
      <section class="rp-step" data-s="1"${step === 1 ? '' : ' hidden'}>
        <div class="f-card"><h2>${esc(tt(TX.steps[1]))}</h2>
          <div class="rp-grid"><label class="f-field"><span>${esc(tt(TX.family))}</span><select data-family>${Object.entries(V.familyLabels).map(([k, l]) => `<option value="${k}"${k === m.family ? ' selected' : ''}${FAMILIES[k] ? '' : ' disabled'}>${esc(FAMILIES[k] ? tt(l) : tt(TX.familySoon, { f: tt(l) }))}</option>`).join('')}</select></label>
          ${control(FIELDS.series, m.series)}${control(FIELDS.missionNumber, m.metadata.missionNumber)}</div></div>
        ${(F.blocks || []).map((b, i) => `<details class="f-card"${i === 0 ? ' open' : ''}><summary>${esc(tt(b.title))}</summary>${b.collection ? collection(b.collection) : grid(b.fields)}</details>`).join('')}
        <div class="f-row rp-next"><button type="button" data-step="2">${esc(tt(TX.next))}</button></div>
      </section>
      <section class="rp-step" data-s="2"${step === 2 ? '' : ' hidden'}>
        <div class="f-card"><h2>${esc(tt(TX.steps[2]))}</h2>${grid([FIELDS.outcome, FIELDS.observations])}</div>
        <div class="f-card">${collection(crewCol(), tt(TX.crew))}</div>
        <div class="f-card"><h2>${esc(tt(TX.fuel))}</h2>${grid([FIELDS.fuelUnit, FIELDS.fuelStart, FIELDS.fuelLanding])}</div>
        <div class="f-card" data-check></div>
      </section>
    </div>
    <div class="f-card rp-bar"><button type="button" class="primary" data-do="save">${esc(tt(S.path ? TX.saveEdit : TX.save))}</button></div>`;
  check();
  prefillCard();
  const rd = S.body.querySelector('[data-recent]');
  rd.ontoggle = () => rd.open && showRecent();
}
/** Avancement des trois pas (repères ✓ de la V2) : vol = immatriculation et décollage + atterrissage ; mission = série ;
 *  résultat = résultat. */
function progress() {
  const m = S.m,
    a = m.aircraft?.[0] || {},
    t = m.timeline || {};
  return [!!(a.registration || a.type && a.callsign) && !!(t.takeoff && t.landing), !!m.series, !!m.results?.outcome];
}
/** Ce qui manque (non bloquant) et les contrôles de cohérence de la V2, au pas Résultat. */
function check() {
  const box = S.body?.querySelector('[data-check]');
  if (!box) return;
  const m = S.m,
    a = m.aircraft?.[0] || {},
    t = m.timeline || {},
    need = [];
  if (!a.registration) need.push(tt(TX.need.reg));
  if (!t.takeoff || !t.landing) need.push(tt(TX.need.times));
  if (!(m.crew || []).some(c => c.name)) need.push(tt(TX.need.crew));
  if (empty(m.fuel?.start) || empty(m.fuel?.landing)) need.push(tt(TX.need.fuel));
  if (!m.results?.outcome) need.push(tt(TX.need.outcome));
  const issues = M.checkMission(m).map(i => tt(TX.issues[i.kind] || TX.issues.invalid, {
    v: i.value,
    o: i.other
  }));
  box.innerHTML = `<p class="f-muted">${esc(need.length ? tt(TX.missing, { l: need.join(', ') }) : tt(TX.complete))}</p>${issues.length ? `<p class="rp-warn">${esc(tt(TX.warnings, { l: issues.join(' ; ') }))}</p>` : ''}`;
}
/** Carte « Vol en cours » : le vol partagé par carburant et carte (pilot/<trigramme>/current_flight.json), s'il a un
 *  appareil ou une route ; « Utiliser » remplit les champs vides. */
async function prefillCard() {
  const box = S.body?.querySelector('[data-prefill]');
  if (!box) return;
  const cf = await S.ctx.data.get(`pilot/${S.ctx.identity.trigram || 'ANON'}/current_flight.json`);
  S.current = cf && (cf.aircraft?.registration || cf.aircraft?.type || cf.route?.dep) ? cf : null;
  if (!S.current || !S.body) return box.innerHTML = '';
  const a = cf.aircraft || {},
    r = cf.route || {};
  box.innerHTML = `<div class="f-card rp-prefill"><div><b>${esc(tt(TX.current))}</b><div class="f-muted">${esc([a.registration, a.type, [r.dep, r.arr].filter(Boolean).join(' → ')].filter(Boolean).join(' · '))}</div></div>
    <button type="button" class="primary" data-do="current">${esc(tt(TX.use))}</button></div>`;
}
/** Remplit les champs vides depuis des valeurs { chemin: valeur } ; source notée par champ ; nombre de champs remplis. */
function fill(values, source) {
  let n = 0;
  for (const [path, v] of Object.entries(values)) {
    if (empty(v) || !empty(M.get(S.m, path))) continue;
    M.set(S.m, path, v);
    S.sources[path] = source;
    n++;
  }
  S.ctx.notify(n ? tt(TX.filled, {
    n,
    s: source
  }) : tt(TX.nothing), n ? 'ok' : 'info');
  saveDraft();
  render();
}
/** Mes derniers CR, à rouvrir pour modification. */
async function showRecent() {
  const box = S.body.querySelector('[data-recentlist]'),
    list = await recentReports();
  box.innerHTML = list.length ? list.map(({
    path,
    r
  }) => `<button type="button" data-open="${esc(path)}">${esc(r.metadata?.missionId || path)} · ${esc(r.metadata?.date || '')} · ${esc(r.aircraft?.[0]?.registration || '')} ${esc(r.family || '')}</button>`).join('') : `<p class="f-muted">${esc(tt(TX.noRecent))}</p>`;
}
/** Valeur saisie d'un contrôle (nombre pour les champs numériques, majuscules pour les codes). */
function readControl(el) {
  const path = el.dataset.path;
  let v = el.value;
  if (el.classList.contains('rp-code')) v = v.toUpperCase();
  const fd = Object.values(FIELDS).find(x => x.path === path) || (FAMILIES[S.m.family]?.blocks || []).flatMap(b => b.fields || []).find(x =>
    x.path === path);
  if (fd?.type === 'number' || /\.(patients|aircraft)$/.test(path)) v = M.num(v);
  return [path, v];
}
/** Saisie : la mission suit le champ, la source d'un champ retouché s'efface, brouillon et repères mis à jour. */
function onInput(e) {
  const el = e.target;
  if (el.dataset.family !== undefined) {
    const fam = el.value;
    if (FAMILIES[fam] && fam !== S.m.family) {
      S.m.family = fam;
      S.m.series = FAMILIES[fam].series?.[0]?.value || '';
      saveDraft();
      render();
    }
    return;
  }
  if (!el.dataset.path) return;
  const [path, v] = readControl(el);
  M.set(S.m, path, v);
  delete S.sources[path];
  saveDraft();
  check();
  const done = progress();
  S.body.querySelectorAll('.rp-steps button').forEach((b, i) => b.classList.toggle('rp-ok', done[i]));
}
/** Gestes : pas, enregistrement, nouveau CR, vol en cours, collections, CR récent. */
async function onClick(e) {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.step) {
    S.step = +b.dataset.step;
    render();
    return scrollTo(0, 0);
  }
  if (b.dataset.open) {
    const r = await S.ctx.data.get(b.dataset.open);
    if (!r) return;
    const {
      schema,
      updated_at,
      by,
      ...mission
    } = r;
    S.m = M.fillDefaults(mission, M.emptyMission(mission.family));
    S.path = b.dataset.open;
    S.sources = {};
    S.step = 0;
    return render();
  }
  const col = b.closest('[data-col]')?.dataset.col;
  switch (b.dataset.do) {
    case 'save':
      return save();
    case 'new':
      S.m = freshMission(S.m.family);
      S.path = null;
      S.sources = {};
      S.step = 0;
      await S.ctx.data.remove(DRAFT).catch(() => {});
      return render();
    case 'current': {
      const cf = S.current || {},
        a = cf.aircraft || {},
        r = cf.route || {};
      return fill({
        'aircraft.0.registration': a.registration,
        'aircraft.0.type': a.type,
        'navigation.dep': r.dep,
        'navigation.arr': r.arr,
        'navigation.altn': r.altn,
        'navigation.distanceNm': r.distanceNm,
        'navigation.altitude': cf.level?.ft ? `FL${String(Math.round(cf.level.ft / 100)).padStart(3, '0')}` : ''
      }, tt(TX.current));
    }
    case 'add': {
      const def = col === 'crew' ? crewCol() : (FAMILIES[S.m.family]?.blocks || []).map(x => x.collection).find(c => c?.path === col);
      const list = M.get(S.m, col) || [];
      list.push(def.empty());
      M.set(S.m, col, list);
      saveDraft();
      return render();
    }
    case 'del': {
      const list = M.get(S.m, col) || [];
      list.splice(+b.dataset.i, 1);
      M.set(S.m, col, list);
      saveDraft();
      return render();
    }
  }
}

export async function mount(el, ctx) {
  S = {
    el,
    ctx,
    step: 0,
    sources: {},
    path: null
  };
  el.innerHTML = `<style>${STYLE}</style><h1>${esc(tt(TX.title))}</h1><div data-body></div>`;
  S.body = el.querySelector('[data-body]');
  const d = await ctx.data.get(DRAFT);
  if (d?.mission?.family && FAMILIES[d.mission.family]) {
    S.m = M.fillDefaults(d.mission, M.emptyMission(d.mission.family));
    S.path = d.path || null;
    S.sources = d.sources || {};
    ctx.notify(tt(TX.draft, {
      d: new Date(d.at).toLocaleString(ctx.lang())
    }), 'info');
  } else S.m = freshMission('HEMS');
  S.body.addEventListener('input', onInput);
  S.body.addEventListener('change', onInput);
  S.body.addEventListener('click', onClick);
  render();
}

export function unmount() {
  if (!S) return;
  // un brouillon en attente part quand même (son minuteur garde l'état)
  S.body = null;
  S = null;
}
