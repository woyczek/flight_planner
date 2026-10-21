// Module d'exemple du cadre V3 (frame/INTEGRATION.md) : le plus petit module complet, à copier pour en commencer un.
//   · meta : ce qu'il lit et écrit (préfixes du dépôt des données, règle de fusion), son application, son niveau ;
//   · mount(el, ctx) : dessine dans el ; ctx.data (sa part de la couche de données), ctx.t (textes [fr, en, de, es]),
//     ctx.notify, ctx.ask, ctx.identity (lecture seule), ctx.aerodb (service), ctx.net (appels sortants) ;
//   · unmount() : arrête ce qu'il a lancé (observateurs) ; le cadre vide el.
// Une note par pilote, pilot/<trigramme>/hello.json (préfixe pilot/ partagé avec d'autres modules : fuel, maps), et
// une copie locale de l'appareil, jamais synchronisée (politique « cache ») : cache/hello/last.json.
export const meta = {
  id: 'hello',
  apps: ['pilot'],
  level: 1,
  files: [], // fichiers que ce module importe, relatifs à module.js (gardés hors ligne dès l'installation) : aucun ici
  reads: ['pilot/', 'cache/hello/'],
  writes: [{
    prefix: 'pilot/',
    merge: 'record'
  }, {
    prefix: 'cache/hello/',
    policy: 'cache'
  }]
};

const TX = {
  title: ['Essayer le cadre', 'Try the frame', 'Den Rahmen ausprobieren', 'Probar el marco'],
  hello: ['Bonjour {who}.', 'Hello {who}.', 'Hallo {who}.', 'Hola {who}.'],
  nobody: ['inconnu (trigramme à régler : ⚙)', 'stranger (set your trigram: ⚙)', 'Unbekannter (Trigramm einstellen: ⚙)',
    'desconocido (trigrama por ajustar: ⚙)'
  ],
  note: ['Note de vol (synchronisée)', 'Flight note (synchronised)', 'Flugnotiz (synchronisiert)', 'Nota de vuelo (sincronizada)'],
  save: ['Enregistrer', 'Save', 'Speichern', 'Guardar'],
  saved: ['Note enregistrée : elle partira à la prochaine synchronisation.', 'Note saved: it will leave at the next synchronisation.',
    'Notiz gespeichert: sie geht bei der nächsten Synchronisation hinaus.', 'Nota guardada: saldrá en la próxima sincronización.'
  ],
  local: ['Dernière ouverture de ce module sur cet appareil : {d}', 'Last time this module was opened on this device: {d}',
    'Letztes Öffnen dieses Moduls auf diesem Gerät: {d}', 'Última apertura de este módulo en este dispositivo: {d}'
  ],
  first: ['première fois', 'first time', 'erstes Mal', 'primera vez'],
  aero: ['Base aéronautique : {s}', 'Aeronautical database: {s}', 'Luftfahrtdatenbank: {s}', 'Base aeronáutica: {s}'],
  noAero: ['non chargée', 'not loaded', 'nicht geladen', 'no cargada']
};

let stop = null;

export async function mount(el, ctx) {
  const {
    data,
    t,
    notify
  } = ctx;
  const tri = ctx.identity.trigram || '';
  const path = `pilot/${tri || 'ANON'}/hello.json`;
  const last = await data.get('cache/hello/last.json');
  await data.put('cache/hello/last.json', {
    at: new Date().toISOString()
  });
  const aero = ctx.aerodb?.status ? await Promise.resolve(ctx.aerodb.status()).catch(() => null) : null;
  el.innerHTML = `<h1>${t(TX.title)}</h1>
    <div class="f-card"><p>${t(TX.hello, { who: tri || t(TX.nobody) })}</p>
    <p class="f-muted">${t(TX.local, { d: last?.at ? new Date(last.at).toLocaleString() : t(TX.first) })}</p>
    <p class="f-muted">${t(TX.aero, { s: aero ? JSON.stringify(aero).slice(0, 120) : t(TX.noAero) })}</p></div>
    <div class="f-card"><label class="f-field">${t(TX.note)}<textarea data-note rows="3"></textarea></label>
    <button type="button" class="primary" data-save>${t(TX.save)}</button></div>`;
  const area = el.querySelector('[data-note]');
  /** Note lue dans la couche de données (écrite ici, ou reçue d'un autre appareil). */
  const show = async () => {
    const v = (await data.get(path))?.note || '';
    if (document.activeElement !== area && area.value !== v) area.value = v;
  };
  await show();
  stop = data.watch(path, show);
  el.querySelector('[data-save]').onclick = async () => {
    await data.put(path, {
      pilote: tri,
      note: area.value,
      updated_at: new Date().toISOString()
    });
    notify(t(TX.saved), 'ok');
  };
}

export function unmount() {
  stop?.();
  stop = null;
}
