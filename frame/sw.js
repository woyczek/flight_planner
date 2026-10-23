// Service worker du cadre V3 (frame/SPEC.md § 3.6) : l'appli démarre et tourne hors ligne. Il garde les fichiers de
// l'appli — le cadre (frame/…), les modules (modules/…) et l'icône — et seulement eux : les données (data/…, API GitHub)
// passent par la couche de données et son cache, les routes du lanceur (/__setup/…) et les pages V2 vont au réseau.
//   · copie servie tout de suite, revérifiée en arrière-plan (une adresse = son chemin, sans l'empreinte ?v= que le
//     lanceur ou la publication posent : une même copie quelle que soit l'empreinte) ;
//   · un fichier changé : toutes les copies sont relues, puis les pages ouvertes reçoivent « sog-frame-update » (le
//     cadre propose de recharger) — la version suivante arrive entière, jamais à moitié ;
//   · installation : les fichiers du cadre ; ensuite, ceux que la page demande (message « precache » : point d'entrée
//     de chaque module de l'application), puis tout fichier de l'appli au premier passage ;
//   · stockage des copies indisponible (navigateur privé, quota, panne) : le service worker s'installe quand même et
//     laisse passer au réseau — l'appli marche, sans le hors ligne.
const CACHE = 'sog-frame-v1',
  SCOPE = new URL('./', self.location).pathname, // …/frame/
  ROOT = new URL('../', self.location).pathname, // racine de la suite
  SHELL = ['./', 'app.js', 'frame.css', 'design/tokens.css', 'design/primitives.css', 'lib/icons.js', 'manifest.webmanifest',
    'store/frame_data.js', 'store/transport_github.js',
    'store/transport_launcher.js', 'aerodb/zones.js', 'aerodb/aircraft.js', 'aerodb/aerodb.js', 'aerodb/registry.js', 'aerodb/sheets.js',
    'aerodb/lnmperf.js', 'aerodb/aar.js',
    'settings/admin_links.js', 'settings/config.js', 'settings/join.js', 'lib/qr.js', 'lib/clipboard.js', 'settings/settings.js',
    'lib/markdown.js',
    'lib/dom.js', 'lib/current_flight.js',
    'help/help.js', 'help/roadmap.js', 'help/roadmap.json',
    'help/pilot.fr.md', 'help/pilot.en.md', 'help/pilot.de.md', 'help/pilot.es.md',
    // tutoriels (anglais et français ; leurs captures sont gardées au premier passage)
    'help/tutorial/join-airline.en.md', 'help/tutorial/join-airline.fr.md', 'help/tutorial/prepare-flight.en.md',
    'help/tutorial/prepare-flight.fr.md',
    'help/tutorial/write-report.en.md', 'help/tutorial/write-report.fr.md',
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
      if (k.startsWith('sog-frame-') && k !== CACHE) await caches.delete(k).catch(() => {});
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => {
  // « Recharger » de la page : un worker en attente prend la main ; sinon toutes les copies sont relues (cache ignoré),
  // puis la page en est prévenue (port de réponse) et recharge
  if (e.data?.type === 'skip-waiting') return void self.skipWaiting();
  if (e.data?.type === 'refresh') return void e.waitUntil((async () => {
    const c = await store();
    if (c) await refreshAll(c, false);
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
    await c.put(key, r.clone());
    if (changed) checking ||= refreshAll(c).finally(() => checking = null);
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
/** Un fichier a changé : toutes les copies relues (la nouvelle version entière), puis les pages prévenues (tell). */
async function refreshAll(c, tell = true) {
  for (const req of await c.keys()) {
    try {
      const r = await fetch(req.url, {
        cache: 'no-cache'
      });
      if (r.ok) await c.put(req.url, r);
    } catch {
      return; // réseau perdu en route : nouvelle tentative au prochain passage
    }
  }
  if (!tell) return;
  for (const client of await self.clients.matchAll({
      type: 'window'
    })) client.postMessage({
    type: 'sog-frame-update'
  });
}
