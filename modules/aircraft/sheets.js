// V3 aircraft — la vue « Fiches » de l'application Maintenance (V3_SPECIFICATION § 10.34, lot A2, étape 3 ; SPEC.md § 4) :
// la liste des fiches de performances par famille, leur éditeur, les imports (fichier, texte collé, réponse de ChatGPT),
// l'aperçu champ par champ avant toute écriture, l'export .lnmperf et JSON, le retrait.
//
// Ce code vient de Fuel (modules/fuel/module.js, écran « Fiches » : renderSheets, onSheetsClick, renderEditor, review,
// applyReview…), déplacé et non réécrit : la logique des fiches est celle d'aerodb (AeroDBSheets, `aircraft().lib`), les
// écritures passent toutes par `aircraft().sheets.put(fiche, { source })` ; les globales de Fuel (S.sheets, S.A, S.body,
// S.edit, S.pending, S.queue, S.coTypes, tt…) sont ici l'état d'une fermeture, créée par module.js.
//
// Ajouts de ce module : l'origine et la date de chaque champ (`sheets.origins(id)`), la recherche de la liste.
//
// Interface : createSheetsView(host), host = { ctx, body() (l'élément où dessiner, null une fois démonté ou si la vue n'est
// pas affichée), gone() (vrai une fois démonté), back() (appelé au retour à la liste), changed() (appelé quand les fiches ou
// les types de la flotte ont changé : le module republie sa ligne d'état) } → { load, render(id?), onClick, onInput, onChange,
// counts, editing, stop }.
import {
  copyText
} from '../../frame/lib/clipboard.js'; // marche aussi en http (tablette servie par le poste)
import {
  keepScroll
} from '../../frame/lib/dom.js'; // un rendu ne bouge ni le défilement ni la frappe
import {
  TX,
  FIELD_TX,
  OPTION_TX,
  PATH_TX,
  SRC_TX
} from './sheets_texts.js';

/** Style de la vue (jetons et classes du cadre, quelques règles en plus ; repris des règles « fu- » de Fuel). */
// la grille des champs : deux colonnes au téléphone (150 px au moins par case : 96 px en faisait trois, libellés sur trois lignes,
// listes tronquées), chaque champ à sa hauteur (étirés à la rangée, les champs vides grandissaient : retour de l'utilisateur, 30/10) ;
// une case à cocher à sa taille (la largeur pleine des champs du cadre la prenait aussi : son libellé passait sur trois lignes) ; une
// ligne de la liste : le texte prend la largeur restante, sous 480 px les actions passent dessous, à droite (iPhone, cupertino, 30/10)
export const SHEETS_STYLE = `[data-module="aircraft"] .ac-g3{--f-min:150px;align-items:start}
[data-module="aircraft"] .ac-g3 .f-check input{width:auto;flex:none}
[data-module="aircraft"] .f-table .ac-txt{white-space:normal;overflow-wrap:anywhere;min-width:9em}
[data-module="aircraft"] .ac-hide{display:none}
[data-module="aircraft"] .ac-cat{margin:var(--sog-gap) 0 4px;font-size:1em;color:var(--sog-muted)}
[data-module="aircraft"] [data-sheets] .f-list .f-item>div:first-child{min-width:0}
[data-module="aircraft"] [data-sheets] .f-list .f-item>div:first-child>:is(a,b):first-child{display:inline-block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom}
[data-module="aircraft"] [data-sheets] .f-list .f-item>.f-row{justify-content:flex-end}
@container (max-width: 479px){[data-module="aircraft"] [data-sheets] .f-list .f-item>div:first-child{grid-column:1/-1} [data-module="aircraft"] [data-sheets] .f-list .f-item>.f-row{grid-column:1/3;grid-row:2} [data-module="aircraft"] [data-sheets] .f-list .f-item::after{grid-row:2}}
[data-module="aircraft"] .ac-origin{display:block}`;

/** Échappe un texte pour le HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
/** Nombre lu dans un champ (virgule décimale admise) ; null si vide ou illisible. */
const num = v => {
  const x = Number(String(v ?? '').trim().replace(/\s/g, '').replace(',', '.'));
  return String(v ?? '').trim() !== '' && Number.isFinite(x) ? x : null;
};
/** Copie d'une fiche sans ses clés de travail (« _… » : identifiants de ligne, marques d'origine). */
const plain = p => JSON.parse(JSON.stringify(p, (k, v) => k.startsWith('_') ? undefined : v));
/** Clé d'une ligne RPM (régime et altitude), comme celle de l'aperçu de la V2. */
const rpmKey = r => `${Math.round(Number(r.rpm) * 1000)}@${r.altFt ?? ''}`;
/** Table régime / débit modifiable : écran d'ordinateur seulement (sur téléphone, en lecture). */
const rpmEditable = () => matchMedia('(min-width: 761px)').matches;

/** Propose au pilote un fichier créé ici (export). */
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], {
    type
  }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Crée la vue « Fiches » (voir l'interface en tête de ce fichier). */
export function createSheetsView(host) {
  const ctx = host.ctx,
    tt = (row, v) => ctx.t(row, v),
    // état de la vue (celui de Fuel : S.A, S.sheets, S.coTypes, S.edit, S.pending, S.queue)
    st = {
      A: null,
      sheets: [],
      coTypes: [],
      edit: null,
      pending: null,
      queue: [],
      origins: {},
      originsId: '',
      q: '',
      loaded: false,
      seq: 0,
      stops: [],
      stopped: false
    },
    body = () => st.stopped ? null : host.body(),
    /** Vrai si la vue est démontée : la suite d'une attente est abandonnée. */
    gone = () => st.stopped || host.gone();

  /** Logique des fiches (lecture des formats, fusion, ChatGPT, .lnmperf) : celle d'aerodb (AeroDBSheets). */
  const SH = () => st.A?.lib || window.AeroDBSheets;

  /** Libellé traduit d'un champ de fiche (chemin) ; groupe compris si group. */
  function fieldLabel(path, group = false) {
    const f = SH().PROFILE_FIELDS.find(x => x[2] === path);
    if (!f) return PATH_TX[path] ? tt(PATH_TX[path]) : path;
    const tr = s => FIELD_TX[s] ? tt(FIELD_TX[s]) : s,
      label = f[1].split(' · ').map(tr).join(' · ');
    return group ? `${tr(f[0])} · ${label}` : label;
  }

  // ---------------------------------------------------------------- lecture
  /** Charge le texte du prompt de ChatGPT (celui de Fuel, une fois par page) : aerodb le lit dans window.PERF_PROMPT. */
  async function loadPrompt() {
    if (!window.PERF_PROMPT) await import(new URL('./perf_prompt.js?v=0', import.meta.url).href).catch(() => {});
  }
  /** Fiches du registre d'aerodb (les plus récentes d'abord) et types de la compagnie (flotte, référence) ; aucune sans aerodb. */
  async function readSheets() {
    const A = st.A,
      // les types de la compagnie sans fiche sont proposés « à compléter » (comme la V2) ; les deux lectures ensemble
      [list, co] = await Promise.all([A?.sheets ? A.sheets.list().catch(() => []) : [], A?.fleetTypes ? A.fleetTypes().catch(() => []) :
      []]);
    if (gone()) return;
    st.sheets = list;
    st.coTypes = co;
  }
  let loading = null;
  /** Lit le registre d'aerodb, règle la logique des fiches, lit les fiches et suit leurs changements ; une seule fois. */
  function load() {
    return loading ||= (async () => {
      await loadPrompt();
      st.A = ctx.aerodb?.aircraft ? await ctx.aerodb.aircraft().catch(() => null) : null;
      if (gone()) return;
      // logique des fiches d'aerodb : types, fiches et flotte réglés par aerodb ; ici la fiche active, la langue, les textes
      SH()?.configure?.({
        profiles: () => Object.fromEntries(st.sheets.map(p => [p.id, p])),
        active: () => st.edit || null,
        lang: () => ctx.lang(),
        t: row => ctx.t(row),
        tf: (row, vals) => ctx.t(row, vals)
      });
      await readSheets();
      if (gone()) return;
      st.loaded = true;
      // fiches changées ailleurs (synchronisation, autre onglet, Carburant) : relues, la liste redessinée si rien n'est ouvert
      st.stops.push(ctx.aerodb?.on?.('change', async e => {
        if (!e?.aircraft || gone()) return;
        st.A = await ctx.aerodb.aircraft().catch(() => st.A);
        await readSheets();
        if (gone()) return;
        host.changed?.();
        if (body() && !st.edit && !st.pending) keepScroll(body(), drawList);
      }));
      host.changed?.();
    })();
  }

  /** Enregistre une fiche par aerodb (champs changés tamponnés avec leur source, fichier aircraft/sheets/<id>.json et
   *  miroir V2 écrits par aerodb), puis relit la liste. */
  async function storeSheet(p, source = 'edit') {
    await st.A.sheets.put(plain(p), {
      source
    });
    if (gone()) return;
    await readSheets();
    if (gone()) return;
    host.changed?.();
    ctx.notify(tt(TX.saved), 'ok');
  }

  // ---------------------------------------------------------------- liste
  /** Types de la compagnie sans fiche (flotte, référence) : ceux que la liste propose « à compléter ». */
  function todoTypes() {
    const A = st.A || {},
      canon = c => String(A.canonical?.(c) || c || '').toUpperCase(),
      covered = new Set(st.sheets.flatMap(x => [x.icao, x.type, x.id].filter(Boolean).map(canon)));
    return (st.coTypes || []).filter(t => !covered.has(canon(t.type)));
  }
  /** Liste rangée comme la V2 : par catégorie (hélicoptères, turbopropulseurs, réacteurs, pistons, autres ; aerodb classify),
   *  les fiches, puis les types de la compagnie qui n'en ont pas (« à compléter ») ; par nom ; filtrée par la recherche. */
  function sheetGroups() {
    const A = st.A || {},
      catOf = c => A.classify?.(c)?.category || 'other',
      q = st.q.trim().toUpperCase(),
      hit = (...v) => !q || v.some(x => String(x ?? '').toUpperCase().includes(q)),
      rows = [...st.sheets.filter(s => hit(s.id, s.name, s.icao, s.type, s.registration, s.callsign)).map(sheet => ({
        sheet,
        cat: catOf(sheet.icao || sheet.type || sheet.id),
        name: String(sheet.name || sheet.id)
      })), ...todoTypes().filter(t => hit(t.type, A.label?.(t.type), ...(t.registrations || []))).map(todo => ({
        todo,
        cat: catOf(todo.type),
        name: String(A.label?.(todo.type) || todo.type)
      }))];
    return ['helico', 'turboprop', 'jet', 'piston', 'other'].map(cat => ({
      cat,
      rows: rows.filter(r => r.cat === cat).sort((a, b) => (!!a.todo - !!b.todo) || a.name.localeCompare(b.name, undefined, {
        numeric: true
      }))
    })).filter(g => g.rows.length);
  }
  /** Les rangées de la liste (groupes, fiches, types à compléter). */
  function rowsHtml() {
    const F = SH(),
      lang = ctx.lang(),
      groups = sheetGroups();
    if (!groups.length) return `<p class="f-card f-muted">${esc(tt(st.q.trim() ? TX.noHit : TX.noSheet))}</p>`;
    return groups.map(g => `<h3 class="ac-cat">${esc(tt(TX.sheetCats[g.cat]))}</h3>${g.rows.map(r => {
      if (r.todo) return `<div class="f-item" data-type="${esc(r.todo.type)}"><div><b>${esc(st.A.label?.(r.todo.type) || r.todo.type)}</b>
        <div class="f-muted">${esc(tt(TX.coType, { n: r.todo.registrations.length }))}</div></div>
        <div class="f-row"><button type="button" data-do="newfor">${esc(tt(TX.createSheet))}</button></div></div>`;
      const p = F.normalize(structuredClone(r.sheet)),
        miss = F.sheetMissingFamilies(F.sheetMissingPaths(p)).map(f => tt(TX.missingFamily[f])),
        when = F.profileWhen(p);
      return `<div class="f-item" data-id="${esc(p.id)}"><div><b>${esc(p.name || p.id)}</b> <span class="f-muted">${esc(p.icao || '')} · ${esc(p.unit)}</span>
        <div class="f-muted">${esc(F.profileSourceText(p))} · ${esc(miss.length ? tt(TX.missing, { list: miss.join(', ') }) : tt(TX.complete))}${when ? ` · ${esc(tt(TX.updated, { d: new Date(when).toLocaleDateString(lang) }))}` : ''}</div></div>
        <div class="f-row"><button type="button" data-do="edit">${esc(tt(TX.edit))}</button></div></div>`;
    }).join('')}`).join('');
  }
  /** Dessine la liste des fiches et les gestes d'import. */
  function drawList() {
    const b = body();
    if (!b) return;
    if (!st.loaded) return void(b.innerHTML = `<p class="f-muted">${esc(tt(TX.loading))}</p>`); // fiches pas encore là
    st.edit = null;
    st.pending = null;
    st.queue = [];
    if (!SH()) return void(b.innerHTML = `<p class="f-muted">${esc(tt(TX.noAero))}</p>`);
    b.innerHTML = `<div data-sheets-list><p class="f-muted">${esc(tt(TX.sheetsIntro))}</p>
    <div class="f-row" style="margin-bottom:var(--sog-gap)">
      <button type="button" class="primary" data-do="import">${esc(tt(TX.import))}</button>
      <button type="button" data-do="paste">${esc(tt(TX.paste))}</button>
      <button type="button" data-do="new">${esc(tt(TX.newSheet))}</button>
      <input type="file" data-file accept=".csv,.json,.lnmperf,.txt,.xml" multiple hidden>
    </div>
    <div class="f-card ac-hide" data-pastebox><label class="f-field">${esc(tt(TX.pasteAsk))}<textarea data-k="pastetext" rows="6"></textarea></label>
      <button type="button" class="primary" data-do="pasteread">${esc(tt(TX.read))}</button></div>
    <label class="f-field"><span class="f-sr">${esc(tt(TX.search))}</span><input type="search" data-k="q" value="${esc(st.q)}" placeholder="${esc(tt(TX.search))}" autocomplete="off"></label>
    <div class="f-list" data-list>${rowsHtml()}</div></div>`;
  }

  // ---------------------------------------------------------------- gestes
  /** Gestes de l'écran Fiches (liste, éditeur, aperçu des changements). */
  async function onClick(e) {
    const b = e.target.closest('[data-do]');
    if (!b || !body() || !st.loaded) return;
    const F = SH(),
      id = b.closest('[data-id]')?.dataset.id,
      p = st.edit;
    switch (b.dataset.do) {
      case 'import':
        return body().querySelector('[data-file]').click();
      case 'paste': {
        const box = body().querySelector('[data-pastebox]');
        box.classList.toggle('ac-hide');
        if (!box.classList.contains('ac-hide')) box.querySelector('textarea').focus();
        return;
      }
      case 'pasteread': {
        const txt = body().querySelector('[data-k="pastetext"]').value;
        if (txt.trim()) await importText(txt, tt(TX.pasted));
        return;
      }
      case 'new':
      case 'newfor': { // « Créer la fiche » d'un type de la compagnie : son code, sans le demander
        const code = (b.dataset.do === 'newfor' ? b.closest('[data-type]')?.dataset.type || '' : await ctx.askText(tt(TX.typeCode), {
          value: ''
        }) || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!code || gone() || !body()) return;
        const sb = F.simbriefRecordFor(code),
          model = st.A?.record?.(code)?.model, // nom du modèle (base des types) : « EC-145 » plutôt que « EC45 »
          np = sb ? F.profileFromSimbriefType(code, sb) : F.normalize({
            id: code,
            icao: code,
            name: model && st.A.displayName ? st.A.displayName(model).split(' — ')[0] : code
          });
        np.id = uniqueId(np.id || code);
        return review(null, F.normalize(np), {});
      }
      case 'edit':
        return editor(id);
      case 'back':
        drawList();
        return host.back?.();
      case 'rpmadd': {
        const d = readEditor(p, true);
        d.rpmFuelCurve.push({
          rpm: null,
          altFt: null,
          fuelFlowPerHour: null
        });
        return editor(p.id, F.normalize(d));
      }
      case 'rpmdel': {
        const d = readEditor(p, true);
        d.rpmFuelCurve.splice(+b.dataset.i, 1);
        return editor(p.id, d);
      }
      case 'save': {
        const out = readEditor(p);
        return review(st.sheets.find(x => x.id === p.id), out, {});
      }
      case 'apd': {
        const a = F.apdFor(p);
        if (!a) return ctx.notify(tt(TX.noApd), 'warn');
        const out = structuredClone(p),
          filled = new Set();
        for (const [path, x] of Object.entries(a.fields || {})) {
          const was = F.pathGet(p, path);
          if (was === null || was === undefined || was === '') filled.add(path);
          F.pathSet(out, path, x.v);
        }
        // une valeur déjà renseignée n'est remplacée que cochée par l'utilisateur
        return review(p, out, {
          checked: path => filled.has(path),
          src: 'EUROCONTROL',
          source: 'eurocontrol'
        });
      }
      case 'fill': {
        const other = st.sheets.find(x => x.id === body().querySelector('[data-k="fillfrom"]')?.value);
        if (!other) return;
        return review(p, F.fillProfileGaps(structuredClone(p), F.normalize(structuredClone(other))), {
          src: other.name || other.id,
          source: 'edit'
        });
      }
      case 'gpt':
      case 'gptmiss': {
        const txt = b.dataset.do === 'gpt' ? F.gptPrompt({
          id: p.id,
          p
        }) : F.gptMissingPrompt([{
          p,
          paths: F.sheetMissingPaths(p)
        }]);
        const box = body().querySelector('[data-k="gptprompt"]');
        box.value = txt;
        box.closest('label').classList.remove('ac-hide');
        // presse-papiers, sinon copie à l'ancienne, sinon la demande reste sélectionnée dans sa zone : « copiez-la »
        const how = await copyText(txt, {
          box
        });
        ctx.notify(tt(how === 'shown' ? TX.copyManual : TX.copied), how === 'shown' ? 'warn' : 'ok');
        return;
      }
      case 'gptread': {
        const txt = body().querySelector('[data-k="gptreply"]').value;
        if (!txt.trim()) return;
        try {
          const r = F.parseGptReply(txt, F.normalize(structuredClone(p)).icao),
            incoming = r.profile?.sheets ? r.profile.sheets.find(x => x.id === p.id) || r.profile.sheets[0] : r.profile;
          for (const w of r.warnings || []) ctx.notify(w, 'warn');
          return review(p, mergeInto(p, F.normalize(incoming)), {
            src: 'ChatGPT',
            source: 'chatgpt'
          });
        } catch (err) {
          return ctx.notify(String(err.message || err), 'err');
        }
      }
      case 'lnm':
        try {
          return download(`${p.id}.lnmperf`, F.toLnmperf(F.normalize(structuredClone(p))), 'application/xml');
        } catch (err) {
          return ctx.notify(String(err.message || err), 'err');
        }
      case 'json':
        return download(`${p.id}.json`, JSON.stringify(plain(p), null, 1), 'application/json');
      case 'del':
        if (!(await ctx.ask(tt(TX.removeAsk, {
            n: p.name || p.id
          })))) return;
        if (gone()) return;
        await st.A.sheets.remove(p.id);
        await readSheets();
        if (gone()) return;
        host.changed?.();
        return drawList();
      case 'apply':
        return applyReview();
      case 'cancel':
        return st.edit ? editor(st.edit.id) : drawList();
    }
  }
  /** Saisie : la recherche de la liste (les rangées seules sont redessinées, la frappe reste en place). */
  function onInput(e) {
    if (e.target.dataset?.k !== 'q' || !body()) return;
    st.q = e.target.value;
    const list = body().querySelector('[data-list]');
    if (list) list.innerHTML = rowsHtml();
  }
  /** Changement : le fichier choisi par « Importer ». */
  function onChange(e) {
    if (e.target.matches?.('[data-file]')) importFiles([...e.target.files]);
  }

  // ---------------------------------------------------------------- imports
  /** Identifiant libre dans la base (suffixe -2, -3… si pris). */
  function uniqueId(id) {
    let out = id,
      k = 2;
    while (st.sheets.some(x => x.id === out)) out = `${id}-${k++}`;
    return out;
  }
  /** Fiche entrante ramenée à la fiche existante p : même identifiant et nom, carburant dans l'unité de p, champs vides de
   *  l'entrante complétés par p (la réponse l'emporte champ par champ, l'utilisateur choisit ensuite). */
  function mergeInto(p, incoming) {
    const F = SH();
    let src = structuredClone(incoming);
    if (src.unit && p.unit && src.unit !== p.unit && ['kg', 'lb'].includes(src.unit) && ['kg', 'lb'].includes(p.unit)) src = F
      .fuelConvertedCopy(src, src.unit, p.unit, true);
    src.id = p.id;
    src.name = p.name || src.name;
    src.unit = p.unit;
    return F.fillProfileGaps(F.normalize(src), F.normalize(structuredClone(p)));
  }
  /** Fiches lues (fichier, texte, OFP) : une fiche de même identifiant passe par l'aperçu des changements, une nouvelle
   *  aussi (créée à l'application) ; une à la fois. */
  function proposeIncoming(list) {
    st.queue = list.slice(1);
    const np = list[0];
    if (!np) return drawList();
    const old = st.sheets.find(x => x.id === np.id);
    return review(old || null, old ? mergeInto(SH().normalize(structuredClone(old)), np) : np, {
      src: np.source?.format || np.source?.file || '',
      source: /lnm/i.test(np.source?.format || '') ? 'lnmperf' : np.calibration ? 'ofp' : 'import'
    });
  }
  /** Lit des fichiers choisis (CSV, JSON, .lnmperf, OFP) puis propose leurs fiches. */
  async function importFiles(files) {
    const all = [];
    for (const file of files) {
      const txt = await file.text();
      all.push(...readText(txt, file.name));
    }
    if (all.length && !gone()) proposeIncoming(all);
  }
  /** Lit un texte collé (fiche, CSV, .lnmperf, OFP, réponse ChatGPT) puis propose ses fiches. */
  async function importText(txt, name) {
    const list = readText(txt, name);
    if (list.length) proposeIncoming(list);
  }
  /** Fiches d'un texte, selon sa forme : XML .lnmperf, JSON (base, fiche, OFP SimBrief calibré), CSV de performances,
   *  sinon réponse ChatGPT ; notification du nombre lu ou de l'échec. */
  function readText(txt, name) {
    const F = SH(),
      s = String(txt || '').replace(/^﻿/, '').trim();
    let list = [];
    try {
      if (/^<\?xml|<AircraftPerf/i.test(s)) list = [F.parseLnmperf(s, name)];
      else if (/^[{[]/.test(s) && (() => {
          try {
            JSON.parse(s);
            return true;
          } catch {
            return false;
          }
        })()) {
        const o = JSON.parse(s);
        if (F.isSimbriefOfp(o)) {
          const p = F.profileFromOFP(o),
            c = F.extractOfpCalibration(o);
          if (c) F.applyCalibration(p, c);
          list = [p];
        } else list = F.profilesFromJson(o, name);
      } else if (/aircraft/i.test(s.split(/\r?\n/)[0]) && /icao/i.test(s.split(/\r?\n/)[0])) {
        try {
          list = F.parsePerformanceCsvEnriched(s, name);
        } catch {
          list = F.parsePerformanceCsv(s, name);
        }
      } else {
        const r = F.parseGptReply(s);
        for (const w of r.warnings || []) ctx.notify(w, 'warn');
        list = r.profile?.sheets || [r.profile];
      }
      list = list.filter(Boolean).map(p => F.normalize(p, name));
      ctx.notify(tt(TX.imported, {
        n: list.length,
        f: name
      }), list.length ? 'ok' : 'warn');
    } catch (e) {
      ctx.notify(tt(TX.unreadable, {
        f: name,
        e: e.message || e
      }), 'err');
    }
    return list;
  }

  // ---------------------------------------------------------------- éditeur
  /** Date d'un champ pour la ligne d'origine : jour et mois (l'année en plus si ce n'est pas la présente) ; vide sans date. */
  function whenText(at) {
    const ms = Date.parse(at || '');
    if (!Number.isFinite(ms) || ms < 86400000) return '';
    const d = new Date(ms);
    return d.toLocaleDateString(ctx.lang(), d.getFullYear() === new Date().getFullYear() ? {
      day: '2-digit',
      month: '2-digit'
    } : {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  }
  /** Origine d'une valeur : « lnmperf · 28/10 » (nom traduit de la source, puis la date). */
  function stampText(o) {
    const src = o?.source ? SRC_TX[o.source] ? tt(SRC_TX[o.source]) : String(o.source) : '',
      when = whenText(o?.at);
    return [src, when].filter(Boolean).join(' · ');
  }
  /** Ligne d'origine d'un champ renseigné (`<small>` grisé sous le champ), ses valeurs écartées en infobulle ; rien sans valeur. */
  function originHtml(p, path) {
    const F = SH(),
      v = F.pathGet(p, path),
      o = st.origins[path];
    if (!o || v === null || v === undefined || v === '') return '';
    const text = stampText(o);
    if (!text) return '';
    const kept = (o.kept || []).map(k => `${typeof k.value === 'object' ? JSON.stringify(k.value) : k.value} (${stampText(k)})`).join(' ; ');
    return `<small class="f-muted ac-origin" data-origin="${esc(path)}"${kept ? ` title="${esc(tt(TX.originKept, { l: kept }))}"` : ''}>${esc(text)}</small>`;
  }
  /** Éditeur d'une fiche : champs par groupe (libellés traduits), table RPM (modifiable sur écran d'ordinateur),
   *  compléments, ChatGPT, exports ; sous chaque champ renseigné, son origine et sa date. draft : fiche en cours de saisie
   *  (ligne RPM ajoutée ou retirée), sinon celle de la base. */
  async function editor(id, draft = null) {
    const F = SH(),
      raw = st.sheets.find(x => x.id === id);
    if (!raw) return drawList();
    if (!draft || st.originsId !== id) {
      const o = await Promise.resolve(st.A.sheets.origins?.(id)).catch(() => ({}));
      if (gone()) return;
      st.origins = o || {};
      st.originsId = id;
    }
    const b = body();
    if (!b) return;
    const p = st.edit = draft || F.normalize(structuredClone(raw)),
      rpmCell = (i, k, v) => `<td class="f-num"><input data-rpm="${i}" data-rk="${k}" inputmode="decimal" value="${esc(v ?? '')}" style="width:7em" aria-label="${esc(k)}"></td>`,
      groups = [...new Set(F.PROFILE_FIELDS.map(f => f[0]))],
      facts = F.catalogFacts(p), // ce que la base OACI donne de la cellule et de la propulsion
      fuelUnit = path => F.FUEL_PATHS.has(path) ? ` (${p.unit}${path.endsWith('fuelFlowPerHour') ? '/h' : ''})` : '',
      input = ([, , path, type]) => {
        const v = F.pathGet(p, path),
          lab = esc(fieldLabel(path) + fuelUnit(path)),
          org = originHtml(p, path);
        if (type === 'bool') return `<div class="f-field"><label class="f-check"><input type="checkbox" data-path="${path}" data-type="bool"${v ? ' checked' : ''}>${lab}</label>${org}</div>`;
        if (type.startsWith('select:')) {
          // cellule et propulsion : libellés traduits, case vide = « auto · valeur de la base OACI » quand elle la donne
          const deduced = facts[path],
            none = deduced ? `${tt(TX.auto)} · ${tt(OPTION_TX[deduced])}` : '';
          return `<label class="f-field">${lab}<select data-path="${path}" data-type="text"><option value="">${esc(none)}</option>${type.slice(7).split(',').map(o => `<option value="${esc(o)}"${String(v ?? '') === o ? ' selected' : ''}>${esc(OPTION_TX[o] ? tt(OPTION_TX[o]) : o)}</option>`).join('')}</select>${org}</label>`;
        }
        if (type === 'textarea') return `<label class="f-field">${lab}<textarea rows="2" data-path="${path}" data-type="text">${esc(v ?? '')}</textarea>${org}</label>`;
        return `<label class="f-field">${lab}<input data-path="${path}" data-type="${type}" value="${esc(v ?? '')}"${type === 'number' ? ' inputmode="decimal"' : ''}>${org}</label>`;
      },
      others = st.sheets.filter(x => x.id !== p.id);
    b.innerHTML = `<div class="f-row" style="margin-bottom:var(--sog-gap)"><button type="button" data-do="back">${esc(tt(TX.back))}</button><b>${esc(p.name || p.id)}</b><span class="f-muted">${esc(F.profileSourceText(p))}</span></div>
    <div class="f-card"><div class="f-row">
      <button type="button" data-do="apd">${esc(tt(TX.eurocontrol))}</button>
      ${others.length ? `<select data-k="fillfrom" aria-label="${esc(tt(TX.fillFrom))}">${others.map(o => `<option value="${esc(o.id)}"${(o.icao || '') === (p.icao || '-') ? ' selected' : ''}>${esc(o.name || o.id)}</option>`).join('')}</select><button type="button" data-do="fill">${esc(tt(TX.fillFrom))}</button>` : ''}
    </div></div>
    <details class="f-card"><summary>${esc(tt(TX.gpt))}</summary>
      <div class="f-row"><button type="button" data-do="gpt">${esc(tt(TX.gptPrompt))}</button><button type="button" data-do="gptmiss">${esc(tt(TX.gptMissing))}</button></div>
      <label class="f-field ac-hide">&nbsp;<textarea data-k="gptprompt" rows="4" readonly></textarea></label>
      <label class="f-field">${esc(tt(TX.gptReply))}<textarea data-k="gptreply" rows="4"></textarea></label>
      <button type="button" data-do="gptread">${esc(tt(TX.read))}</button>
    </details>
    ${groups.map((g, i) => `<details class="f-card"${i < 2 ? ' open' : ''}><summary>${esc(FIELD_TX[g] ? tt(FIELD_TX[g]) : g)}</summary><div class="f-grid ac-g3">${F.PROFILE_FIELDS.filter(f => f[0] === g).map(input).join('')}</div></details>`).join('')}
    ${rpmEditable() ? `<details class="f-card" open><summary>${esc(tt(TX.rpmTable))}</summary><div class="f-scroll"><table class="f-table"><thead><tr><th class="f-num">RPM</th><th class="f-num">ft</th><th class="f-num">${esc(p.unit)}/h min</th><th class="f-num">${esc(p.unit)}/h</th><th class="f-num">${esc(p.unit)}/h max</th><th></th></tr></thead><tbody>${p.rpmFuelCurve.map((r, i) => `<tr>${rpmCell(i, 'rpm', r.rpm)}${rpmCell(i, 'altFt', r.altFt)}${rpmCell(i, 'fuelFlowMin', r.fuelFlowMin)}${rpmCell(i, 'fuelFlowPerHour', r.fuelFlowPerHour)}${rpmCell(i, 'fuelFlowMax', r.fuelFlowMax)}<td><button type="button" data-do="rpmdel" data-i="${i}" aria-label="${esc(tt(TX.remove))}">✕</button></td></tr>`).join('')}</tbody></table></div><button type="button" data-do="rpmadd">${esc(tt(TX.rpmAdd))}</button></details>` : p.rpmFuelCurve.length ? `<details class="f-card"><summary>${esc(tt(TX.rpmTable))}</summary><div class="f-scroll"><table class="f-table"><thead><tr><th class="f-num">RPM</th><th class="f-num">ft</th><th class="f-num">${esc(p.unit)}/h</th></tr></thead><tbody>${p.rpmFuelCurve.map(r => `<tr><td class="f-num">${esc(r.rpm)}</td><td class="f-num">${esc(r.altFt ?? '')}</td><td class="f-num">${esc([r.fuelFlowMin, r.fuelFlowPerHour, r.fuelFlowMax].filter(x => x != null && x !== '').join(' / '))}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
    <div class="f-row"><button type="button" class="primary" data-do="save">${esc(tt(TX.save))}</button><button type="button" data-do="lnm">${esc(tt(TX.exportLnm))}</button><button type="button" data-do="json">${esc(tt(TX.exportJson))}</button><button type="button" data-do="del">${esc(tt(TX.remove))}</button></div>`;
  }
  /** Fiche de l'éditeur avec les valeurs des champs (nombres lus, vides → null). */
  function readEditor(p, keepEmpty = false) {
    const F = SH(),
      b = body(),
      out = structuredClone(p);
    // table RPM saisie (écran d'ordinateur) : chaque ligne reprend ses autres champs ; sans régime, retirée à
    // l'enregistrement
    if (b.querySelector('[data-rpm]')) {
      out.rpmFuelCurve = out.rpmFuelCurve.map(r => ({
        ...r
      }));
      for (const i of b.querySelectorAll('[data-rpm]')) {
        const row = out.rpmFuelCurve[+i.dataset.rpm],
          k = i.dataset.rk,
          v = num(i.value);
        if (v !== null || (row[k] !== undefined && row[k] !== null && row[k] !== '')) row[k] = v;
      }
      if (!keepEmpty) out.rpmFuelCurve = out.rpmFuelCurve.filter(r => r.rpm !== null);
    }
    for (const i of b.querySelectorAll('[data-path]')) {
      const t = i.dataset.type,
        v = t === 'bool' ? i.checked : t === 'number' ? num(i.value) : i.value.trim() || null;
      // case décochée d'un champ jamais renseigné : laissé vide (pas de « false » inventé)
      if (t === 'bool' && !v && F.pathGet(p, i.dataset.path) == null) continue;
      F.pathSet(out, i.dataset.path, v);
    }
    return F.normalize(out);
  }

  // ---------------------------------------------------------------- aperçu des changements
  /** Aperçu des changements before → after : une ligne cochable par champ et par ligne de table RPM ; o.checked(path) :
   *  coché d'office (tout sinon), o.src : origine affichée. Appliquer écrit la sélection (pickChanges). */
  function review(before, after, o = {}) {
    const F = SH(),
      b = body();
    if (!b) return;
    const diff = F.profileDiff(before, after, {}, o.src || ''),
      rows = diff.rows.filter(r => r.changed && !r.path.startsWith('source') && !r.path.startsWith('calibration') && r.path !==
        'description' || (r.changed && r.path === 'description' && before)),
      show = v => {
        if (v === undefined || v === null || v === '') return '—';
        try {
          if (typeof v === 'string' && v.startsWith('"')) v = JSON.parse(v);
        } catch {
          /* texte tel quel */
        }
        return esc(String(v));
      },
      // cellule d'une valeur : un nombre (ou une suite de nombres) aligné à droite sans retour à la ligne ; un texte (description,
      // nom) revient à la ligne dans sa colonne, sans pousser le tableau en défilement de côté
      cell = v => `<td class="${typeof v === 'number' || /^[-+\d\s.,/–%°]{0,24}$/.test(String(v ?? '')) ? 'f-num' : 'ac-txt'}">${show(v)}</td>`,
      box = (attr, on) => before ? `<td><input type="checkbox" ${attr}${on ? ' checked' : ''}></td>` : '<td></td>',
      ff = r => [r.fuelFlowMin, r.fuelFlowPerHour, r.fuelFlowMax].filter(x => x !== null && x !== undefined && x !== '').join(' / '),
      dropped = (before?.rpmFuelCurve || []).filter(r => r.rpm !== null && r.rpm !== '' && !(after.rpmFuelCurve || []).some(a => rpmKey(
          a) ===
        rpmKey(r)));
    st.pending = {
      source: o.source || 'edit',
      before,
      after,
      diff,
      gone: dropped
    };
    b.innerHTML = `<div class="f-card" data-review><h2>${esc(before ? tt(TX.review) : tt(TX.reviewNew, { n: after.name || after.id }))}${o.src ? ` <span class="f-muted">· ${esc(o.src)}</span>` : ''}</h2>
    ${rows.length || diff.curve.length || dropped.length ? `<div class="f-scroll"><table class="f-table"><thead><tr><th></th><th>${esc(tt(TX.field))}</th><th class="f-num">${esc(tt(TX.before))}</th><th class="f-num">${esc(tt(TX.after))}</th></tr></thead><tbody>
      ${rows.map(r => `<tr>${box(`data-path="${esc(r.path)}"`, !o.checked || o.checked(r.path))}<td>${esc(fieldLabel(r.path, true))}</td>${cell(r.old)}${cell(r.now)}</tr>`).join('')}
      ${diff.curve.map(c => `<tr>${box(`data-curve="${esc(c.key)}"`, true)}<td>RPM ${esc(c.label)} <span class="f-muted">(${esc(tt(c.kind === 'added' ? TX.added : TX.replaced))})</span></td><td class="f-num">${esc(c.old)}</td><td class="f-num">${esc(c.now)}</td></tr>`).join('')}
      ${dropped.map((r, i) => `<tr>${box(`data-gone="${i}"`, true)}<td>RPM ${esc(r.rpm)}${r.altFt !== null && r.altFt !== undefined && r.altFt !== '' ? ` @ ${esc(r.altFt)} ft` : ''} <span class="f-muted">(${esc(tt(TX.rpmGone))})</span></td><td class="f-num">${esc(ff(r))}</td><td class="f-num">—</td></tr>`).join('')}
    </tbody></table></div>` : `<p class="f-muted">${esc(tt(TX.reviewNone))}</p>`}
    <div class="f-row"><button type="button" class="primary" data-do="apply">${esc(tt(TX.apply))}</button><button type="button" data-do="cancel">${esc(tt(TX.cancel))}</button></div></div>`;
  }
  /** Écrit la sélection de l'aperçu (champs décochés gardés tels qu'avant), puis la fiche suivante de la file. */
  async function applyReview() {
    const F = SH(),
      b = body(),
      {
        before,
        after,
        diff
      } = st.pending,
      skip = new Set([...b.querySelectorAll('[data-path]')].filter(i => !i.checked).map(i => i.dataset.path)),
      skipCurve = new Set([...b.querySelectorAll('[data-curve]')].filter(i => !i.checked).map(i => i.dataset.curve)),
      out = before ? F.pickChanges(before, after, diff, {
        skip,
        skipCurve
      }) : after;
    // lignes RPM retirées mais décochées : remises
    for (const i of b.querySelectorAll('[data-gone]'))
      if (!i.checked) out.rpmFuelCurve = [...(out.rpmFuelCurve || []), structuredClone(st.pending.gone[+i.dataset.gone])];
    if (!before) out.id = uniqueId(out.id);
    await storeSheet(out, st.pending.source);
    if (gone()) return;
    st.pending = null;
    if (st.queue?.length) return proposeIncoming(st.queue);
    return st.edit && st.sheets.some(x => x.id === st.edit.id) ? editor(st.edit.id) : drawList();
  }

  // ---------------------------------------------------------------- interface
  /** Dessine la liste, ou l'éditeur de la fiche id (la liste si elle n'existe pas) ; les fiches sont lues au premier appel. */
  async function render(id) {
    const my = ++st.seq;
    if (!body()) return;
    if (!st.loaded) {
      drawList(); // « chargement… »
      await load();
      if (my !== st.seq || gone() || !body()) return;
    }
    if (id && st.sheets.some(x => x.id === id)) await editor(id);
    else drawList();
  }
  return {
    load,
    render,
    onClick,
    onInput,
    onChange,
    /** Nombre de fiches et de types de la compagnie sans fiche (la ligne d'état) ; ready faux tant que rien n'est lu. */
    counts: () => ({
      ready: st.loaded,
      sheets: st.sheets.length,
      todo: todoTypes().length
    }),
    /** Vrai si l'éditeur d'une fiche (ou l'aperçu de ses changements) est ouvert. */
    editing: () => !!(st.edit || st.pending),
    /** Arrête le suivi des fiches. */
    stop() {
      st.stopped = true;
      for (const f of st.stops) try {
        f?.();
      } catch {
        /* déjà arrêté */
      }
    }
  };
}
