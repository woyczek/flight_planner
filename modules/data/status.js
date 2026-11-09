// V3 data — l'état par zone du lanceur (SPEC § 5.9, V3_SPECIFICATION § 10.44, SOG-0071 temps 2) : la lecture de base/status (un travail du lanceur, une seule fois à la fois, refusé pendant une construction), les raisons traduites dans les quatre langues, la pastille de
// chaque zone de la liste (verte, orange avec sa raison au toucher, grise, rouge, bleue pendant que la page la traite). Le lanceur dit l'état, la page le dessine : aucun critère n'est calculé ici.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  catSource,
  esc,
  kind,
  lang,
  li,
  ROUTE,
  S,
  tt
} from './state.js';
import {
  renderBuild
} from './panels.js';

/** Le verbe base/status est-il connu du lanceur de ce poste (regen/verbs) ? Sans lui, aucune zone n'a d'état dessiné et « Mettre à jour » reste grisé. */
export const statusKnown = () => !!S.known?.includes('base/status');
/** Lit l'état des zones données (au plus 60, celles de la couverture) : l'état lu (M.statusOf) et gardé dans S.status, ou null (pas de lanceur, verbe inconnu, une construction en cours — le lanceur refuse —, réponse illisible) ; l'ancien état reste alors. Un seul appel à la fois : un appel
 *  pendant un autre rend le même résultat. Ne lève jamais. */
export function fetchStatus(ids) {
  if (!S.ctx.launcher || !statusKnown() || S.run) return Promise.resolve(null);
  if (S.statusP) return S.statusP;
  const me = S,
    zones = (ids || []).slice(0, 60);
  S.statusP = (async () => {
    let st = null;
    try {
      st = M.statusOf(await S.ctx.launcher.job(ROUTE, {
        set: 'base',
        verb: 'status',
        args: zones.length ? {
          zones
        } : {}
      }, {
        onProgress: () => {},
        signal: new AbortController().signal
      }));
    } catch {
      st = null;
    }
    if (S !== me) return null;
    S.statusP = null;
    if (st) {
      S.status = st;
      renderBuild();
    }
    return st;
  })();
  return S.statusP;
}
/** Relit l'état sans attendre (après une opération, à l'ouverture) : la page se redessine à la réponse. */
export function refreshStatus(ids) {
  fetchStatus(ids);
}
/** « 29 oct. 2026 » d'une date de cycle ; la valeur telle quelle si la date est illisible, '' si elle est vide. */
const dateOf = v => !v ? '' : typeof v === 'number' ? String(v) : M.dateText(v, lang()) || v;
/** Le nom d'une source datée dans une raison : celui du catalogue sans sa parenthèse, à défaut son identifiant en majuscules. */
const sourceName = id => (catSource(id)?.n?.[li()] || String(id || '').toUpperCase()).replace(/\s*\(.*\)\s*$/, '');
/** La phrase d'une raison, dans la langue de l'appli (TX.zr) ; un code inconnu dit seulement qu'il l'est. */
export function reasonText(r) {
  const row = M.own(TX.zr, r.code) || TX.zr.unknown;
  return tt(row, {
    set: r.set,
    cycle: dateOf(r.cycle),
    built: dateOf(r.built),
    current: dateOf(r.current),
    source: sourceName(r.source),
    count: r.count ?? '',
    names: r.names.join(', '),
    error: r.error,
    zip: r.zip
  }).replace(/\s+/g, ' ').trim();
}
/** L'état dessiné d'une zone de la base : celui du lanceur, ou « en cours » quand la page la traite ; null sans état connu. */
export function zoneState(id) {
  const running = !!S.run && S.run.set === 'base' && S.run.verb !== 'purge' && S.ids.includes(id);
  return M.drawnState(S.status, id, running);
}
/** Les raisons d'une zone, une phrase chacune. */
export const zoneReasons = id => (S.status?.zones && Object.hasOwn(S.status.zones, id) ? S.status.zones[id].reasons : []).map(reasonText);
/** Les avis d'une zone (jamais une raison d'être périmée) : « Zone sans points ni voies : la source ne les porte pas (openAIP) » ; une phrase chacun. */
export const zoneNotices = id => (S.status?.zones && Object.hasOwn(S.status.zones, id) ? S.status.zones[id].notices || [] : []).map(reasonText);
/** La pastille d'état d'une zone et, ouverte, ses raisons : la pastille d'une zone à reconstruire, jamais construite ou en échec est un bouton (le toucher dit pourquoi) ; vide sans état connu. */
export function zoneStateHtml(id) {
  const st = zoneState(id);
  if (!st) return '';
  const level = {
      'up-to-date': 'ok',
      stale: 'warn',
      failed: 'err'
    } [st] || null,
    reasons = st === 'up-to-date' || st === 'building' ? [] : zoneReasons(id),
    open = S.whyOpen.has(id) && reasons.length,
    label = tt(TX.zst[st]);
  return `${reasons.length ? `<button type="button" class="f-badge" data-act="zone-why" data-zone="${esc(id)}" data-zstate="${esc(st)}" aria-expanded="${open ? 'true' : 'false'}"${kind(level)}>${esc(label)}</button>` :
    `<span class="f-badge" data-zstate="${esc(st)}"${kind(level)}>${esc(label)}</span>`}
    ${open ? `<p class="f-muted d-zwhy" data-zone-why="${esc(id)}">${esc(reasons.join(' ; '))}</p>` : ''}${zoneNotices(id).map(n => `<p class="f-muted d-zwhy" data-zone-notice="${esc(id)}">${esc(n)}</p>`).join('')}`;
}
/** Le toucher d'une pastille : ouvre ou ferme les raisons de la zone. */
export function toggleWhy(id) {
  if (!id) return;
  if (S.whyOpen.has(id)) S.whyOpen.delete(id);
  else S.whyOpen.add(id);
  renderBuild();
}
