// Service worker du cadre V3 (frame/SPEC.md § 3.6) : l'appli démarre et tourne hors ligne. Il garde les fichiers de
// l'appli — le cadre (frame/…), les modules (modules/…) et l'icône — et seulement eux : les données (data/…, API GitHub)
// passent par la couche de données et son cache, les routes du lanceur (/__setup/…) et les pages V2 vont au réseau.
//   · copie servie tout de suite, revérifiée en arrière-plan (une adresse = son chemin, sans l'empreinte ?v= que le
//     lanceur ou la publication posent : une même copie quelle que soit l'empreinte) ;
//   · un fichier changé : la version suivante est relue ENTIÈRE dans un cache à part (STAGE), jamais dans celui que les
//     pages ouvertes lisent ; une relecture qui échoue en route est jetée (rien n'est mêlé), retentée plus tard ; complète,
//     les pages reçoivent « sog-frame-update » (le cadre propose de recharger) et elle remplace l'ancienne d'un coup au
//     chargement suivant d'une page (ou au « Recharger ») : une page ouverte ne reçoit jamais un fichier d'une autre version
//     que la sienne (31 oct. 2026 : Réglages vides — l'ancien app.js chargeait les réglages déjà relus, déplacés par R-S9) ;
//   · installation : les fichiers du cadre ; ensuite, ceux que la page demande (message « precache » : point d'entrée
//     de chaque module de l'application), puis tout fichier de l'appli au premier passage ;
//   · stockage des copies indisponible (navigateur privé, quota, panne) : le service worker s'installe quand même et
//     laisse passer au réseau — l'appli marche, sans le hors ligne.
const CACHE = 'sog-frame-v1',
  STAGE = `${CACHE}-next`, // la version suivante en cours de relecture, ou complète (READY) en attente d'un chargement
  SCOPE = new URL('./', self.location).pathname, // …/frame/
  ROOT = new URL('../', self.location).pathname, // racine de la suite
  SHELL = ['./', 'app.js', 'frame.css', 'design/tokens.css', 'design/primitives.css', 'design/metro.css', 'design/swiss.css',
    'design/cupertino.css', 'design/material.css', 'design/aqua.css', 'lib/icons.js',
    'manifest.webmanifest',
    'store/frame_data.js', 'store/transport_git.js', 'store/transport_github.js', 'store/transport_gitlab.js',
    'store/transport_launcher.js', 'aerodb/zones.js', 'aerodb/aircraft.js', 'aerodb/aerodb.js', 'aerodb/registry.js', 'aerodb/sheets.js',
    // aerodb/lnmperf.js et aerodb/aar.js : chargés par aerodb à leur première demande, gardés alors (pas à l'installation)
    'settings/admin_links.js', 'settings/config.js', 'settings/join.js', 'lib/qr.js', 'lib/clipboard.js', 'settings/kit.js',
    'settings/launcher.js',
    'settings/access.js', 'settings/diagnostic.js', 'settings/admin.js', 'settings/groups.js', 'settings/cards.js', 'settings/actions.js',
    'settings/settings.js',
    'lib/markdown.js',
    'lib/dom.js', 'lib/current_flight.js', 'lib/flight_time.js', 'lib/flight_path.js', 'lib/procedures.js', 'lib/wind.js', 'lib/adnames.js',
    'lib/fms.js', 'lib/time.js',
    'lib/geo.js', 'lib/launcher.js', 'lib/trail.js',
    'help/help.js', 'help/roadmap.js', 'help/roadmap.json',
    // l'aide (manuel, tutoriels) : seulement dans la langue de l'appli, demandée par la page (message « precache ») ;
    // les autres langues et les captures des tutoriels sont gardées à leur première lecture
    '../assets/favicon-flight.svg'
  ];
/** Fichier de l'appli (gardé) ? Le cadre, les modules, l'icône ; pas les essais. */
const ours = u => u.origin === self.location.origin && (u.pathname.startsWith(SCOPE) || u.pathname.startsWith(`${ROOT}modules/`) || u
  .pathname === `${ROOT}assets/favicon-flight.svg`) && !u.pathname.includes('/test/');
/** Clé d'une copie : adresse sans requête ni ancre ; le dossier du cadre = sa page. */
const keyOf = url => {
  const u = new URL(url, self.location);
  return u.origin + (u.pathname === SCOPE ? `${SCOPE}index.html` : u.pathname);
};

/** Magasin des copies ; null s'il est indisponible. */
const store = () => caches.open(CACHE).catch(() => null);
/** Marque d'une version suivante complète, dans STAGE. */
const READY = `${self.location.origin}${SCOPE}__sog-stage-ready`;
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await store();
    if (!c) return self.skipWaiting();
    await Promise.all(SHELL.map(async p => {
      const key = keyOf(new URL(p, self
        .location)); // la page : lue à l'adresse de sa copie, comme à chaque revérification
      try {
        const r = await fetch(key, {
          cache: 'no-cache'
        });
        if (r.ok) await c.put(key, r);
      } catch {
        /* hors ligne à l'installation : gardé au premier passage */
      }
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys().catch(() => []))
      if (k.startsWith('sog-frame-') && k !== CACHE && k !== STAGE) await caches.delete(k).catch(() => {});
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => {
  // « Recharger » de la page : un worker en attente prend la main ; sinon toutes les copies sont relues (cache ignoré),
  // puis la page en est prévenue (port de réponse) et recharge
  if (e.data?.type === 'skip-waiting') return void self.skipWaiting();
  if (e.data?.type === 'refresh') return void e.waitUntil((async () => {
    const c = await store();
    if (c && (await stageReady() || await refreshAll(c, false))) await swap(c);
    e.ports[0]?.postMessage({
      type: 'refreshed'
    });
  })());
  // points d'entrée des modules de l'application : gardés dès la première visite
  if (e.data?.type === 'precache') e.waitUntil((async () => {
    const c = await store();
    if (!c) return;
    for (const url of e.data.urls || []) {
      if (await c.match(keyOf(url))) continue;
      try {
        const r = await fetch(url, {
          cache: 'no-cache'
        });
        if (r.ok) await c.put(keyOf(url), r);
      } catch {
        /* hors ligne : plus tard */
      }
    }
  })());
});
self.addEventListener('fetch', e => {
  const req = e.request,
    u = new URL(req.url);
  if (req.method !== 'GET' || !ours(u)) return; // données, API, lanceur, pages V2 : réseau, sans copie ici
  e.respondWith(serve(req, e));
});

let checking = null;
/** Copie tout de suite (revérifiée en arrière-plan), sinon réseau (gardé) ; hors ligne sans copie : 503. */
async function serve(req, e) {
  const c = await store();
  if (!c) return fetch(req).catch(() => new Response('offline', {
    status: 503,
    headers: {
      'x-sog-offline': '1'
    }
  }));
  // un chargement de page prend la version suivante complète, d'un coup, avant de lire quoi que ce soit
  if (req.mode === 'navigate' && await stageReady()) await swap(c);
  const key = keyOf(req.url),
    hit = await c.match(key),
    old = hit?.clone(); // copie lue plus tard pour la comparaison (le corps de hit part à la page)
  // la page est revérifiée à l'adresse de sa copie (…/frame/index.html) : un serveur peut répondre autrement pour le
  // dossier (le lanceur ne pose ses empreintes ?v= que sur index.html) et chaque chargement verrait sinon une nouvelle
  // version — l'avis « Nouvelle version » revenait en boucle
  const net = fetch(req.mode === 'navigate' ? key : req, {
    cache: 'no-cache'
  }).then(async r => {
    if (!r.ok) return r;
    const changed = old && (await old.text()) !== (await r.clone().text());
    // gardé tout de suite seulement s'il manquait ; changé, il attend la version suivante entière (refreshAll), pour que
    // la page ouverte continue de lire des fichiers de sa propre version
    if (!old) await c.put(key, r.clone());
    if (changed && !await stageReady()) checking ||= refreshAll(c).finally(() => checking = null);
    return r;
  }).catch(() => null);
  if (hit) {
    e.waitUntil(net);
    return hit;
  }
  return (await net) || new Response('offline', {
    status: 503,
    headers: {
      'x-sog-offline': '1'
    }
  });
}
/** La version suivante est-elle complète (STAGE marqué READY) ? */
const stageReady = async () => !!(await (await caches.open(STAGE).catch(() => null))?.match(READY));
/** Un fichier a changé : toutes les copies relues dans STAGE (la nouvelle version entière, jamais dans le cache que les
 *  pages lisent) ; une relecture qui échoue jette STAGE (nouvelle tentative au prochain passage) ; complète, marquée READY,
 *  puis les pages prévenues (tell). Rend true si la version suivante est complète. */
async function refreshAll(c, tell = true) {
  await caches.delete(STAGE).catch(() => {});
  const s = await caches.open(STAGE).catch(() => null);
  if (!s) return false;
  for (const req of await c.keys()) {
    try {
      const r = await fetch(req.url, {
        cache: 'no-cache'
      });
      if (r.ok) await s.put(req.url, r); // un fichier retiré de la suite (404) n'est pas repris
    } catch {
      await caches.delete(STAGE).catch(() => {}); // réseau perdu en route : rien n'est mêlé, nouvelle tentative plus tard
      return false;
    }
  }
  await s.put(READY, new Response('1'));
  if (!tell) return true;
  for (const client of await self.clients.matchAll({
      type: 'window'
    })) client.postMessage({
    type: 'sog-frame-update'
  });
  return true;
}
/** La version suivante complète remplace l'ancienne d'un coup (chargement d'une page, « Recharger ») : chaque copie de STAGE
 *  écrite, celles qu'elle n'a plus retirées, puis STAGE effacé. */
async function swap(c) {
  const s = await caches.open(STAGE).catch(() => null);
  if (!s || !await s.match(READY)) return;
  const keep = new Set();
  for (const req of await s.keys()) {
    if (req.url === READY) continue;
    keep.add(req.url);
    const r = await s.match(req);
    if (r) await c.put(req.url, r);
  }
  for (const req of await c.keys())
    if (!keep.has(req.url)) await c.delete(req);
  await caches.delete(STAGE).catch(() => {});
}
