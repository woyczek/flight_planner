// V3 missions — le brouillon d'une mission de l'atelier (SOG-0486 ; l'utilisateur : « Ne jamais enregistrer, même après beaucoup
// d'étapes, c'est gênant. Conserver une mission en brouillon, et la proposer en tête de liste du registre. »). L'atelier
// (editor_view.js) garde la mission en cours SUR CET APPAREIL à chaque changement : un fichier de la politique `cache` du cadre
// (cache/missions/, jamais synchronisé, jamais publié), un par mission — la clé est l'identifiant de la mission modifiée, ou « new »
// pour une mission créée ou copiée pas encore enregistrée (un seul à la fois). « Enregistrer » en fait la mission et l'efface.
// Le fichier est sur l'appareil, mais il reste une entrée NON FIABLE : lu borné (taille, forme, clé à forme fermée), son texte relu
// comme l'atelier relit un fichier de mission (schéma CORE, ni alias ni document démesuré), sinon ignoré, sans erreur.
//
// API :
//   LIMITS : les bornes (texte 256 Ko, fichier, brouillons listés, fichiers lus) ; KEY : la forme d'une clé ; PREFIX : le dossier.
//   keyOf(mode, id) → la clé du brouillon d'une séance de l'atelier : l'identifiant de la mission en mode « edit » (s'il a la forme
//     de KEY), « new » en création et en copie ; '' sinon (rien ne s'écrit).
//   draftPath(key) → 'cache/missions/draft_<CLE>.json' | null.
//   draftOf({ key, mode, title, text }, now) → ce qui s'écrit : { version: 1, updated_at, key, mode, title, text } | null (clé, mode
//     ou texte hors forme, texte au-delà de 256 Ko).
//   readDraft(value, Y) → { key, mode, id, title, updated_at, text, doc } | null : la valeur lue (le cadre la rend analysée, ou un
//     texte), bornée et validée ; `doc` : le texte relu par js-yaml (Y), schéma CORE.
//   listDrafts(ctx, Y?) → [{ key, mode, id, title, updated_at }] : les brouillons lisibles de l'appareil, le plus récent d'abord, dix
//     au plus (un fichier illisible est écarté sans bruit).
//   pruneDrafts(ctx, keepKey) → le nombre de brouillons effacés : au-delà de LIMITS.keep (40) brouillons sur l'appareil, les plus anciens
//     s'effacent (jamais celui de `keepKey`, que l'atelier vient d'écrire) ; appelé au moment où l'atelier écrit le sien.
//   dropDraft(ctx, key) → vrai si le brouillon a été effacé (ou n'existait pas) ; une clé hors forme : faux, rien n'est touché.
import * as ED from './editor.js';

export const LIMITS = Object.freeze({
  text: 262144, // 256 Ko : le texte YAML de la mission
  file: 270336, // le fichier entier : le texte et son enveloppe
  list: 10, // les brouillons proposés
  scan: 40, // les fichiers du dossier lus pour les trouver, au plus
  keep: 40 // les brouillons gardés sur l'appareil : au-delà, les plus anciens s'effacent (pruneDrafts)
});
export const KEY = /^(new|[A-Z0-9-]{1,24})$/;
export const PREFIX = 'cache/missions/';
const PATH = /^cache\/missions\/draft_(new|[A-Z0-9-]{1,24})\.json$/,
  MODES = ['new', 'dup', 'edit'];

/** La taille d'un texte en octets (UTF-8). */
const bytes = t => new TextEncoder().encode(t).length;

/** Vrai quand la clé et le mode vont ensemble : « new » pour une création ou une copie, un identifiant pour une modification. */
const paired = (key, mode) => MODES.includes(mode) && KEY.test(key) && (key === 'new') === (mode !== 'edit');

/** La clé du brouillon d'une séance (voir l'en-tête). */
export function keyOf(mode, id) {
  if (mode === 'new' || mode === 'dup') return 'new';
  const k = typeof id === 'string' ? id : '';
  return mode === 'edit' && k !== 'new' && KEY.test(k) ? k : '';
}

/** Le chemin du brouillon d'une clé ; null pour une clé hors forme. */
export function draftPath(key) {
  return typeof key === 'string' && KEY.test(key) ? `${PREFIX}draft_${key}.json` : null;
}

/** Ce qui s'écrit pour une séance (voir l'en-tête) ; null quand la clé, le mode ou le texte ne sont pas dans leur forme. */
export function draftOf(e, now = new Date().toISOString()) {
  const key = typeof e?.key === 'string' ? e.key : '',
    mode = typeof e?.mode === 'string' ? e.mode : '',
    text = e?.text;
  if (!paired(key, mode) || typeof text !== 'string' || !text || bytes(text) > LIMITS.text) return null;
  return {
    version: 1,
    updated_at: now,
    key,
    mode,
    title: ED.cut(e.title, 200),
    text
  };
}

/** Lit un brouillon (voir l'en-tête) : la taille d'abord, puis l'enveloppe, puis le texte relu ; tout écart → null, jamais d'exception. */
export function readDraft(value, Y) {
  try {
    let d = value;
    if (typeof d === 'string') {
      if (d.length > LIMITS.file) return null;
      d = JSON.parse(d);
    }
    if (!d || typeof d !== 'object' || Array.isArray(d) || JSON.stringify(d).length > LIMITS.file) return null;
    const key = typeof d.key === 'string' ? d.key : '',
      mode = typeof d.mode === 'string' ? d.mode : '',
      text = d.text;
    if (d.version !== 1 || !paired(key, mode) || typeof text !== 'string' || !text || bytes(text) > LIMITS.text || !Y?.load) return null;
    const doc = Y.load(text, {
      schema: Y.CORE_SCHEMA
    });
    if (!doc || typeof doc !== 'object' || Array.isArray(doc) || ED.shapeOf(doc)) return null;
    const at = typeof d.updated_at === 'string' ? Date.parse(d.updated_at) : NaN,
      cadre = ED.cadreOf(doc);
    return {
      key,
      mode,
      id: cadre.id,
      title: cadre.title, // le titre du TEXTE (celui que l'atelier rouvrira), pas celui de l'enveloppe
      updated_at: Number.isFinite(at) ? new Date(at).toISOString() : '',
      text,
      doc
    };
  } catch {
    return null;
  }
}

/** Vrai quand la taille connue d'un fichier (`bytes` d'une ligne de `data.cached`) dépasse la borne d'un brouillon : le fichier n'est
 *  alors pas lu. Une taille inconnue ne dit pas « trop gros » (readDraft borne ensuite le texte lu). */
const tooBig = bytes => Number(bytes) > LIMITS.file;

/** La taille que l'appareil connaît d'UN fichier (`data.cached(chemin)`, sans lire le fichier) ; null quand elle n'est pas connue. Sert au
 *  repli `data.list`, qui ne rend que des chemins : le même filtre de taille que la voie principale, avant de lire. */
async function sizeOf(data, path) {
  const rows = await Promise.resolve().then(() => data.cached?.(path)).catch(() => null);
  return Array.isArray(rows) ? rows.find(r => r?.path === path)?.bytes ?? null : null;
}

/** Les brouillons de l'appareil (voir l'en-tête) : ce que l'appareil garde (`data.cached`, sans réseau ; `data.list` d'un cadre plus
 *  ancien), les fichiers trop gros écartés avant d'être lus — par les deux voies : le repli `data.list` interroge la taille de chaque
 *  fichier (`sizeOf`) avant de le lire. */
export async function listDrafts(ctx, Y = globalThis.jsyaml) {
  const data = ctx?.data;
  if (!data) return [];
  if (!Y) {
    await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href).catch(() => null);
    Y = globalThis.jsyaml;
  }
  const kept = await Promise.resolve().then(() => data.cached?.(PREFIX)).catch(() => null),
    paths = Array.isArray(kept) ? kept.filter(r => !tooBig(r?.bytes)).map(r => r?.path) : await Promise.resolve().then(
      () => data.list(PREFIX)).catch(() => null),
    todo = (Array.isArray(paths) ? paths : []).filter(p => typeof p === 'string' && PATH.test(p)).slice(0, LIMITS.scan),
    out = [];
  for (const p of todo) {
    if (!Array.isArray(kept) && tooBig(await sizeOf(data, p)))
      continue; // le repli : la taille avant la lecture, comme la voie principale
    const d = readDraft(await Promise.resolve().then(() => data.get(p)).catch(() => null), Y);
    if (d && draftPath(d.key) === p) out.push({
      key: d.key,
      mode: d.mode,
      id: d.id,
      title: d.title,
      updated_at: d.updated_at
    });
  }
  return out.sort((a, b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0)).slice(0, LIMITS.list);
}

/** Borne le nombre de brouillons de l'appareil (SOG-0486, retouche de Sécurisation) : au-delà de LIMITS.keep, les plus anciens sont
 *  effacés, jamais celui de `keepKey` (celui que l'atelier vient d'écrire). L'âge est celui de la copie locale (`at` de `data.cached`) ;
 *  sans lui (repli `data.list`), la date `updated_at` du fichier, une date illisible comptant pour la plus ancienne. Rien n'est lu tant que
 *  le compte ne dépasse pas la borne. Rend le nombre de brouillons effacés. */
export async function pruneDrafts(ctx, keepKey) {
  const data = ctx?.data;
  if (!data) return 0;
  const kept = await Promise.resolve().then(() => data.cached?.(PREFIX)).catch(() => null),
    rows = Array.isArray(kept) ? kept.map(r => ({
      path: r?.path,
      at: Number(r?.at) || 0
    })) : (await Promise.resolve().then(() => data.list(PREFIX)).catch(() => null) || []).map(p => ({
      path: p,
      at: null
    })),
    mine = draftPath(keepKey),
    all = rows.filter(r => typeof r.path === 'string' && PATH.test(r.path));
  if (all.length <= LIMITS.keep) return 0;
  for (const r of all) {
    if (r.at !== null) continue;
    const d = await Promise.resolve().then(() => data.get(r.path)).catch(() => null);
    let at = NaN;
    try {
      const env = typeof d === 'string' && d.length <= LIMITS.file ? JSON.parse(d) : d;
      at = Date.parse(env?.updated_at);
    } catch {
      /* illisible : la plus ancienne */
    }
    r.at = Number.isFinite(at) ? at : 0;
  }
  const old = all.filter(r => r.path !== mine).sort((a, b) => a.at - b.at).slice(0, all.length - LIMITS.keep);
  let n = 0;
  for (const r of old) {
    const key = r.path.slice(PREFIX.length + 'draft_'.length, -'.json'.length);
    if (await dropDraft(ctx, key)) n++;
  }
  return n;
}

/** Efface le brouillon d'une clé (voir l'en-tête). */
export async function dropDraft(ctx, key) {
  const path = draftPath(key);
  if (!path || !ctx?.data) return false;
  return Promise.resolve().then(() => ctx.data.remove(path, {
    module: 'missions'
  })).then(() => true, () => false);
}
