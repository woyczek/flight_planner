// V3 missions — le veilleur de la mission en vol (SOG-0617, lot 1 « la mission vit pendant le vol »). Le cadre l'importe une fois par
// page, dans TOUTES les applis (meta.watch de module.js), et appelle start(ctx) avec un contexte de module qui vit autant que la page
// (aucun démontage ne coupe ses abonnements), plus ctx.go(adresse) et ctx.has(module).
//
// Ce qu'il fait, et rien d'autre :
//   · il suit le vol courant de ce pilote, pilot/<TRI>/current_flight.json (une entrée non fiable : écrite par Carburant et la Carte, d'un
//     autre appareil aussi) ; tant qu'un vol DÉMARRÉ nomme une mission, il lit cette mission (le registre, puis son fichier, au schéma
//     CORE, jamais à ancres) et la confie au juge des tiroirs (drawers_run.js, à la session Création : follow / unfollow) — le juge tourne
//     alors sur chaque écran, avec les règles, les tolérances et le carnet de la fiche (on déplace l'endroit où ça tourne, pas le jugement) ;
//   · un tiroir qui s'ouvre alors que le bloc « Suite de la mission » n'est PAS à l'écran (le juge le dit par onArrive) : la note « Un
//     message de la mission est arrivé. » avec « Ouvrir », SANS le titre (une enveloppe : le titre se lit en l'ouvrant ; décision de
//     l'ergonome avec la maquette de SOG-0619), qui reste jusqu'au toucher ; le bloc à l'écran, son enveloppe suffit et rien n'est levé.
//     « Ouvrir » mène au seul endroit de la mission en vol : dans l'appli Pilote, le volet de la puce de Carburant (#fuel?focus=mission) ;
//     ailleurs, sa fiche (#missions?open=<id>) ;
//   · la ligne du bloc d'état « Mission {id} en cours › {titre du dernier tiroir ouvert, ou « Brief »} » : cache/missions/status.json,
//     `flight: true` (le cadre la range juste après « Vol en cours › Carte »), écrite quand elle change, vidée quand le vol finit.
// Le titre d'un message n'est dit qu'une fois LU, son enveloppe ouverte (onState du juge ne rend que ceux-là, SOG-0619) : la ligne ne dit
// rien de ce qui reste à venir, ni d'un message arrivé et pas encore ouvert.

// Aucun import statique (L60, le poids de la page : V3 Frame, 25/11) : sur une page sans vol, le veilleur ne charge rien. La règle du
// trigramme (frame/lib/mission.js) vient quand l'appareil a un trigramme ; le juge des tiroirs (drawers_run.js, et ce qu'il tire) seulement
// pour un vol DÉMARRÉ qui nomme une mission — par le MÊME texte d'import que drawers_view.js : un seul exemplaire une fois chargé.
let MS = null,
  DR = null;
/** frame/lib/mission.js, chargé une fois. */
const ms = async () => MS ||= await import('../../frame/lib/mission.js');
/** Le juge des tiroirs, chargé une fois. */
const dr = async () => DR ||= await import('./drawers_run.js');

export const TX = {
  line: ['Mission {id} en cours › {t}', 'Mission {id} in progress › {t}', 'Einsatz {id} läuft › {t}', 'Misión {id} en curso › {t}'],
  brief: ['Brief', 'Brief', 'Briefing', 'Briefing'],
  // SOG-0617 / SOG-0619 : la note d'un tiroir ouvert hors de l'écran du bloc — une enveloppe, sans titre
  arrived: ['Un message de la mission est arrivé.', 'A message from the mission has arrived.',
    'Eine Nachricht der Mission ist eingetroffen.',
    'Ha llegado un mensaje de la misión.'
  ],
  open: ['Ouvrir', 'Open', 'Öffnen', 'Abrir']
};

const LANGS = ['fr', 'en', 'de', 'es'];
const STATUS = 'cache/missions/status.json';
const REGISTRY = 'missions/mission_registry.yaml';
const WAIT_MS = 8000; // un fichier pas encore sur l'appareil : attendu huit secondes au plus, comme la fiche
const TITLE_CUT = 120; // le titre d'un tiroir sur la ligne d'état, 120 signes au plus

let W = null; // { ctx, id, path, unwatch, line } : le veilleur de cette page

/** Le point d'entrée du cadre (voir l'en-tête). Ne lève jamais : un fichier illisible laisse le veilleur en attente du suivant. */
export async function start(ctx) {
  if (W || !ctx?.data) return;
  // sans trigramme, ni vol à suivre ni module chargé
  if (typeof ctx.identity?.trigram !== 'string' || !ctx.identity.trigram.trim()) return;
  const tri = (await ms()).triOf(ctx.identity.trigram), // la règle du trigramme, écrite une fois (frame/lib/mission.js, SOG-0468 : N253)
    path = tri ? `pilot/${tri}/current_flight.json` : '';
  W = {
    ctx,
    id: '',
    path,
    line: null
  };
  if (!path) return;
  W.unwatch = ctx.data.watch?.('pilot/', paths => [].concat(paths || []).includes(path) && follow().catch(() => {}));
  await follow().catch(() => {});
}

/** Le vol relu : la mission de son vol démarré suivie, l'ancienne arrêtée, la ligne d'état vidée sans vol démarré. */
async function follow() {
  const w = W,
    f = await get(w.ctx, w.path),
    started = typeof f?.started?.at === 'string' && Number.isFinite(Date.parse(f.started.at)),
    id = started ? MS.midOf(f.mission) : ''; // la forme d'un identifiant de mission, celle de la suite
  if (W !== w || id === w.id) return;
  if (w.id && DR) DR.unfollow(w.id);
  w.id = id;
  if (!id) return void write(w, []);
  const mission = await missionOf(w.ctx, id);
  if (W !== w || w.id !== id) return;
  if (!mission) return void write(w, []); // une mission que l'appareil ne lit pas : ni juge ni ligne (rien n'est inventé)
  const D = await dr(); // le juge, chargé maintenant : un vol démarré nomme une mission lue
  if (W !== w || w.id !== id) return;
  D.follow({
    ctx: w.ctx,
    id,
    mission,
    onArrive: () => W === w && w.id === id && arrived(w, id),
    onState: st => W === w && w.id === id && write(w, lineOf(w, id, st))
  });
}

/** La note d'arrivée (voir l'en-tête) : une par mission (sa clé), remplacée par la suivante ; elle reste jusqu'au toucher (une action). */
function arrived(w, id) {
  w.ctx.notify?.(w.ctx.t(TX.arrived), 'info', {
    key: `missions-arrived:${id}`,
    action: {
      label: w.ctx.t(TX.open),
      run: () => go(w, id)
    }
  });
}

/** « Ouvrir » : le volet de la mission dans Carburant (appli Pilote), sinon sa fiche. */
function go(w, id) {
  return w.ctx.has?.('fuel') ? w.ctx.go?.('#fuel?focus=mission') : w.ctx.go?.(`#missions?open=${encodeURIComponent(id)}`);
}

/** La ligne d'état d'après l'état du juge : seulement pour MA mission en vol ; le titre du dernier tiroir ouvert, sinon « Brief ». */
function lineOf(w, id, st) {
  if (!st || st.mine !== true || st.flying !== true) return [];
  const opened = Array.isArray(st.opened) ? st.opened : [],
    last = opened.length ? String(opened[opened.length - 1]?.title ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0,
      TITLE_CUT) : '',
    // le texte prêt dans les quatre langues : le cadre choisit celui de la langue de l'appli (statusLineOf)
    text = LANGS.map((l, i) => TX.line[i].replace('{id}', id).replace('{t}', last || TX.brief[i]));
  return [{
    text,
    go: w.ctx.has?.('fuel') ? '#fuel?focus=mission' : `#missions?open=${encodeURIComponent(id)}`,
    flight: true
  }];
}

/** Écrit la ligne d'état quand elle change (une écriture qui ne change rien n'est pas faite) ; une écriture refusée ne lève pas. */
function write(w, lines) {
  const key = JSON.stringify(lines);
  if (w.line === key) return;
  w.line = key;
  Promise.resolve().then(() => w.ctx.data.put(STATUS, {
    schema: 1,
    lines,
    updated_at: new Date().toISOString()
  })).catch(() => {});
}

/** La mission lue par son identifiant (le registre donne son chemin, nettoyé par MS.readRegistry ; le fichier par MS.readMission), ou null. */
async function missionOf(ctx, id) {
  const reg = await yaml(ctx, REGISTRY, MS.REGISTRY_NODES_MAX),
    row = reg ? MS.readRegistry(reg).find(r => r.id === id) : null,
    doc = row?.folder && row.file ? await yaml(ctx, `missions/${row.folder}/${row.file}`, MS.NODES_MAX) : null;
  return doc ? MS.readMission(doc) : null;
}

/** Un document JSON par le cadre, ou null. */
const get = (ctx, path) => Promise.resolve().then(() => ctx.data.get(path)).catch(() => null);

/** Un fichier YAML du dépôt (un pilote peut l'écrire : une entrée non fiable) lu au schéma CORE comme la fiche (SOG-0522) ; null sans
 *  texte, illisible, à ancres ou trop grand (MS.shapeOf, audit 186), ou pas sur l'appareil en huit secondes. */
async function yaml(ctx, path, max) {
  const text = await Promise.race([Promise.resolve().then(() => ctx.data.read(path, {
    wait: true
  })).then(r => r?.value ?? r?.text ?? null).catch(() => null), new Promise(res => setTimeout(() => res(null), WAIT_MS))]);
  if (text && typeof text === 'object') return MS.shapeOf(text, max) ? null : text;
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    if (!globalThis.jsyaml) await import(new URL('../../frame/lib/js-yaml.min.js', import.meta.url).href);
    const doc = globalThis.jsyaml.load(text, {
      schema: globalThis.jsyaml.CORE_SCHEMA
    });
    return doc && typeof doc === 'object' && !MS.shapeOf(doc, max) ? doc : null;
  } catch {
    return null;
  }
}
