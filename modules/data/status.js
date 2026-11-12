// V3 data — l'état par zone du lanceur (SPEC § 5.9, V3_SPECIFICATION § 10.44, SOG-0071 temps 2) : la lecture de base/status (un travail du lanceur, une seule fois à la fois, refusé pendant une construction), les raisons traduites dans les quatre langues, la pastille de
// chaque zone de la liste (verte, orange avec sa raison au toucher, grise, rouge, bleue pendant que la page la traite). Le lanceur dit l'état, la page le dessine : aucun critère n'est calculé ici.
import * as M from './model.js';
import {
  TX
} from './texts.js';
import {
  busyNow,
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
  uploadHtml,
  uploadOff
} from './upload.js';
import {
  buildZones,
  gateOf,
  personalPicked,
  renderBuild,
  sourcesWhy
} from './panels.js';

/** Le verbe base/status est-il connu du lanceur de ce poste (regen/verbs) ? Sans lui, aucune zone n'a d'état dessiné et « Mettre à jour » reste grisé. */
export const statusKnown = () => !!S.known?.includes('base/status');
/** Lit l'état des zones données, de 60 au plus par appel (le lanceur n'en lit pas plus : MAX_ZONES) et, au-delà, par tranches l'une après l'autre (il tient UN travail à la fois), fusionnées en un seul état (M.statusOf) gardé dans S.status ; ou null (pas de lanceur, verbe inconnu,
 *  une construction en cours — le lanceur refuse —, une tranche illisible). SOG-0180 : une couverture de 78 zones n'était lue que sur les 60 premières — les autres n'avaient jamais d'état, donc jamais de construction proposée. L'ancien état reste
 *  tant qu'une lecture n'a pas abouti ; une lecture en cours pendant un autre appel rend le même résultat. Ne lève jamais. */
export function fetchStatus(ids) {
  if (!S.ctx.launcher || !statusKnown() || S.run) return Promise.resolve(null);
  const me = S,
    parts = ids?.length ? M.chunksOf(ids) : [
      []
    ],
    key = JSON.stringify([ids || [], S.certified ===
      true
    ]); // la même demande : la lecture en cours ; une autre (la case « usage personnel » a changé) : elle attend la fin de celle-là
  if (S.statusP) return S.statusKey === key ? S.statusP : S.statusP.then(() => S !== me ? null : fetchStatus(ids));
  S.statusKey = key;
  S.statusP = (async () => {
    let st = null;
    try {
      for (const zones of parts) {
        const part = M.statusOf(await S.ctx.launcher.job(ROUTE, {
          set: 'base',
          verb: 'status',
          // `personal` : exactement ce que la construction envoie (la coche unique « Je certifie… » cochée : les sources personnelles de ces zones ; décochée : aucune) — sans lui une zone construite avec LFV, NATS, ENAIRE ou AirNav se disait « à reconstruire » pour toujours (inputs-changed)
          args: zones.length ? {
            zones,
            personal: personalPicked(zones)
          } : {}
        }, {
          onProgress: () => {},
          signal: new AbortController().signal
        }));
        if (!part) {
          st = null;
          break;
        }
        st = st ? {
          ...st,
          zones: {
            ...st.zones,
            ...part.zones
          }
        } : part;
      }
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
export const zoneNotices = id => (S.status?.zones && Object.hasOwn(S.status.zones, id) ? S.status.zones[id].notices || [] : []).map(
  reasonText);
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
  const dot = `<i class="f-dot" aria-hidden="true"${kind(level)}></i>`;
  return `${reasons.length ? `<button type="button" class="d-st" data-act="zone-why" data-zone="${esc(id)}" data-zstate="${esc(st)}" aria-expanded="${open ? 'true' : 'false'}">${dot}${esc(label)}</button>` :
    `<span class="d-st" data-zstate="${esc(st)}">${dot}${esc(label)}</span>`}
    ${open ? `<p class="f-muted d-zwhy" data-zone-why="${esc(id)}">${esc(reasons.join(' ; '))}</p>` : ''}${zoneNotices(id).map(n => `<p class="f-muted d-zwhy" data-zone-notice="${esc(id)}">${esc(n)}</p>`).join('')}`;
}
/** Les genres du bilan, dans l'ordre où la phrase d'état les dit : à jour, à reconstruire, en échec, attendent un fichier, sans état. */
export const ZONE_KEYS = ['upToDate', 'rebuild', 'failed', 'waiting', 'unknown'];
/** Le bilan des zones de la couverture d'après l'état du lanceur (SOG-0180) : { groups } — les identifiants par genre (ZONE_KEYS), dans l'ordre de la couverture ; null sans état connu (la phrase d'état le dit). Le genre ouvert qui se vide se referme.
 *  Une zone sans état du lanceur est comptée « sans état » : jamais cachée. */
export function balance() {
  if (!S.status || !statusKnown()) return {
    groups: null
  };
  const groups = M.balanceOf(S.status, buildZones().ids);
  if (S.zoneFilter && !groups[S.zoneFilter]?.length) S.zoneFilter = null; // plus aucune zone de ce genre : la liste se referme
  return {
    groups
  };
}
/** Le toucher d'un nombre de la phrase d'état : la liste de ses zones se déplie sur place, sous la phrase ; le même nombre la referme, un autre la remplace. Rien n'est coché, rien ne défile : la sélection est celle de la liste de la couverture. */
export function setZoneFilter(key) {
  const k = ZONE_KEYS.includes(key) ? key : null;
  S.zoneFilter = k && S.zoneFilter !== k ? k : null;
  renderBuild();
}
/** La page des abonnements du NASR de la FAA (le lien direct des trois jeux : FIX, AWY, NAV). */
const NASR_URL = 'https://www.faa.gov/air_traffic/flight_info/aeronav/aero_data/NASR_Subscription/';
/** Un lien https en texte sûr : `<a>` ouvert dans un autre onglet seulement si l'adresse est en https:// (sinon le texte seul). */
const linkHtml = (url, label) => M.isHttps(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>` : esc(label);
/** Le pas-à-pas d'une source que l'on dépose soi-même (SOG-0189, `AeroCatalogue.stepsOf`) sur la ligne de la zone qui l'attend : ① le lien DIRECT de la page (et, si elle ne répond plus, l'accueil du site), ② chaque fichier à prendre (son nom exact, son lien direct s'il en a un, ce qu'il apporte), ③ le bouton de la ligne ; '' sans pas-à-pas (une source que le lanceur télécharge) ou sans le catalogue. */
function stepsHtml(id, z) {
  const r = z.reasons.find(x => x.source),
    steps = r && typeof S.d?.cat?.stepsOf === 'function' ? S.d.cat.stepsOf(r.source, r.cycle || undefined) : null;
  if (!steps) return '';
  const T = TX.steps,
    [pre, post] = tt(T.file, {
      f: '\u0000'
    }).split('\u0000'),
    files = (Array.isArray(steps.files) ? steps.files : []).slice(0, 6).map(f => `<li data-step-file><span>${esc(pre)}${f.url ? linkHtml(f.url, String(f.name)) : `<code>${esc(String(f.name))}</code>`}${esc(post ?? '')}</span>${Array.isArray(f.gives) ? ` <span class="f-muted">${esc(String(f.gives[li()] ?? f.gives[0] ?? ''))}</span>` : ''}</li>`).join('');
  return `<ol class="d-zsteps" data-pickup-steps="${esc(id)}"><li data-step-page>${tt(T.page, { l: linkHtml(steps.page?.url, tt(T.pageName)) })}${steps.page?.home ? ` <span class="f-muted">${tt(T.home, { l: linkHtml(steps.page.home, tt(T.homeName)) })}</span>` : ''}</li>${files}<li data-step-then>${esc(tt(T.then))}</li></ol>`;
}
/** Ce que la dernière prise ou le dernier envoi de fichier a dit de cette zone, écrit sur sa ligne tant qu'une autre tentative ne l'a pas remplacé (une notification s'efface) : ce qui a été reçu, ce qui manque ou a été refusé ; '' sans message. */
function zoneMsgHtml(id) {
  const m = S.zoneMsg.get(id);
  return m ? `<div class="f-muted d-zmsg" data-zone-msg="${esc(id)}" data-level="${esc(m.level)}">${m.lines.map(l => `<p data-line>${esc(l)}</p>`).join('')}</div>` : '';
}
/** Ce qu'une zone dit et propose SUR sa ligne (SOG-0180) : une zone qui attend un fichier que seul l'utilisateur dépose le dit (sa première raison) avec « Prendre le fichier » (la prise lance ensuite la construction de la zone) ; une zone en échec a « Réessayer » (la construction de cette zone seule) ;
 *  rien pour les autres. Les boutons sont gris pendant une opération. */
export function zoneActionHtml(id) {
  const st = zoneState(id),
    z = S.status?.zones && Object.hasOwn(S.status.zones, id) ? S.status.zones[id] : null;
  if (!z || !st) return '';
  const busy = busyNow(),
    msg = zoneMsgHtml(id);
  // un téléchargement de cette zone qui a échoué (SOG-0180) : ce que sa source a répondu, et « Réessayer » rejoue son téléchargement seul (puis sa construction)
  const ff = S.result?.set === 'base' && S.result.verb === 'fetch' ? (S.result.out?.failed || []).filter(f => f.zone === id) : [];
  const nasr = ff.some(f => f.source === 'faa' || f.source ===
    'faaclass'); // la FAA refuse : « Choisir le fichier… » et le lien direct des trois jeux (SOG-0180)
  if (ff.length) return `<p class="d-zact" data-zone-action="${esc(id)}" data-fetch-failed><span class="f-muted">${esc(sourcesWhy(ff.map(f => ({
    source: f.source,
    code: f.error,
    status: f.status ?? null
  }))))}</span> <button type="button" data-verb="retry-fetch" data-zone="${esc(id)}"${busy || !S.ctx.launcher ? ' disabled' : ''}>${esc(tt(TX.upd.retry))}</button>${nasr ? ` <button type="button" data-act="zone-upload" data-zone="${esc(id)}"${uploadOff() ? ' disabled' : ''}>${esc(tt(TX.up.choose))}</button>` : ''}</p>${msg}${nasr ? `<p class="f-muted" data-nasr-hint>${tt(TX.up.nasr, { l: linkHtml(NASR_URL, tt(TX.up.nasrPage)) })}</p>${uploadHtml(id)}` : ''}`;
  if (st === 'failed') return `<p class="d-zact" data-zone-action="${esc(id)}"><button type="button" data-verb="retry-zone" data-zone="${esc(id)}"${busy || !S.ctx.launcher ? ' disabled' : ''}>${esc(tt(TX.upd.retry))}</button></p>${msg}`;
  // la zone attend un fichier, ou une prise ou un envoi vient de lui dire ce qui manque : « Choisir le fichier… » reste sur sa ligne
  const byHand = !z.buildable || !!msg;
  if ((st === 'stale' || st === 'never-built') && byHand) {
    const g = gateOf('base', 1, [M.PICKUP.verb]).verbs[M.PICKUP.verb],
      off = busy || g.disabled,
      grey = busy ? 'busy' : g.reason; // un bouton gris dit pourquoi, à côté de lui
    return `<p class="d-zact" data-zone-action="${esc(id)}" data-waiting><span class="f-muted">${esc(zoneReasons(id)[0] || tt(TX.zst[st]))}</span> <button type="button" data-verb="pickup" data-zones="${esc(id)}"${off ? ' disabled' : ''}>${esc(tt(TX.pickup))}</button> <button type="button" data-act="zone-upload" data-zone="${esc(id)}"${uploadOff() ? ' disabled' : ''}>${esc(tt(TX.up.choose))}</button>${off && grey ? ` <span class="f-muted" data-zone-grey="${esc(id)}">${esc(tt(TX.greyReason[grey]))}</span>` : ''}</p>${uploadHtml(id)}${msg}${stepsHtml(id, z)}`;
  }
  return '';
}
/** Le toucher d'une pastille : ouvre ou ferme les raisons de la zone. */
export function toggleWhy(id) {
  if (!id) return;
  if (S.whyOpen.has(id)) S.whyOpen.delete(id);
  else S.whyOpen.add(id);
  renderBuild();
}
