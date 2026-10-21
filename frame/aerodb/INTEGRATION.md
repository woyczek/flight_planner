# aerodb — integration (frame and modules)

How the frame mounts aerodb and how a module uses it. The rules of the component itself are in [SPEC.md](SPEC.md).
The frontier below was agreed on 21 October 2026 between the aerodb and frame agents and validated by the ergonomics
session.

## 1. The frontier

- **The frame** reads and caches files of the data repository by path: local cache, revisions, offline, transports
  (launcher folder, GitHub, shells). It knows nothing of aeronautical data.
- **aerodb** owns the schema of the published files, the choice of cycle, the parsing, the indexes and the business
  API. It never reads a file except through the reader the frame gives it.
- **Modules** never read `sia/base/` or `AircraftDB/`; they ask aerodb through their adapter.
- **Publication** stays with the V2 launcher: Settings › Maintenance › Aeronautical data (rebuild, then publish by
  zone) and Aircraft types ("Publish the aircraft database to the data repository").

## 2. What aerodb needs from the frame

The frame's data contract (`adapter.data`), as agreed:

- `data.read(path, { policy: 'reference', wait: true })` → `{ value | text, rev, cached, at }`, or `null` if absent.
  - `policy: 'reference'`: read only, never queued for writing. The file is kept as long as its revision does not
    change, revalidated at synchronisation (conditional request), and not fetched in advance: it is read at the first
    request.
  - `wait`: wait for the network when the file is not cached yet.
  - `rev` follows the transport (ETag on GitHub, blob sha on a tree, timestamp on the launcher): compare revisions
    only with each other, never interpret them.
- `data.list(prefix)` → paths from the last known tree (updated at each synchronisation), or `null` if no tree was
  ever read.
- `data.watch(prefix, fn)` → `fn(changed paths)` after a synchronisation (revalidated references included) or a write
  in another tab.

aerodb's declaration as a service:

```text
reads:  [{ prefix: 'sia/base/', policy: 'reference' }, { prefix: 'AircraftDB/', policy: 'reference' }]
writes: []
```

## 3. Mounting

Services are mounted first, as one instance each, then modules. With the frame's data layer
(`frame/store/frame_data.js`, delivered on 21 October), the data adapter of aerodb already has `read`, `list` and
`watch`, so it is the reader itself:

```js
const aerodb = AeroDB.create({
  reader: FrameData.adapter({
    id: 'aerodb',
    reads: [{ prefix: 'sia/base/', policy: 'reference' }, { prefix: 'AircraftDB/', policy: 'reference' }],
    writes: []
  })
});
// then, for every module: adapter.aerodb = aerodb
```

`frame/app.js` mounts it this way (`ctx.aerodb`). Checked on 21 October with the launcher transport over the 13
reference zones: the listing comes from the frame's tree, only the files asked for are read, the whole world is
identical, and a republished file gives one `change` event and a fresh read of its zone. With the **local**
transport (single user, no exchange), the reference files come from the launcher serving the page, otherwise from the
configured GitHub repository. On the public website with neither, aerodb answers empty.

Scripts, in this order: `frame/aerodb/zones.js`, `frame/aerodb/aircraft.js`, `frame/aerodb/aerodb.js`.

Until the data layer exists, `AeroDB.create()` without a reader uses `AeroDB.fetchReader()`:
- in GitHub mode it goes through `shared/github_data.js`, which must then be loaded first;
- otherwise it reads the files served by the launcher (`data/…`, `AircraftDB/` at the root).
`frame/aerodb/bench.html` shows both.

## 4. Using it from a module

```js
const { aerodb } = adapter;
const near = await aerodb.airspaces({ lat: 43.6, lon: 1.4, radiusNm: 60, types: ['R', 'D', 'P'] });
const lfbo = await aerodb.coords('LFBO');            // { lat, lon, name, kind }
const places = await aerodb.find('TOUL', 10);        // ranked: codes, aerodromes, towns, other places
const ac = await aerodb.aircraft();
ac.classify('A400M').category;                      // 'turboprop'
ac.estimate('TBM9');                                // { kgPerHour, tasKt, basis, … } or null
aerodb.on('change', () => redraw());                // a zone loaded, a published file changed
```

Rules for modules:
- **Ask by area or identifier.** Ask for the area on screen or along the route, never for "France".
- **Draw from the answer.** Never keep a copy that outlives a `change` event.
- **Labels and units are yours.** aerodb returns data only: the module translates and formats.
- **Expect empty answers** (no zone published, offline at first launch); `status()` says why.

## 5. Costs to know (measured, see DECISIONS.md)

- **Only what you ask for is read.** Asking for the aerodromes around Paris reads France's `meta` and aerodromes
  (and Belgium's, whose frame touches the area): 426 KB, about 30 ms on a phone-like CPU (×4 throttling). The whole
  France file was 5.6 MB and 120 ms. Later questions take a few milliseconds.
- **Loading all 13 zones** of the reference set (`ready` over Europe): about 290–360 ms.
- **Memory**: the JavaScript heap stays around 55 to 75 MB with every index built and the towns loaded.
- **Place search**: `find('TOUL')` with France loaded reads France's navaids, points, VRP and towns (1.1 MB) and the
  world's major towns (430 KB), never the world's towns (4.9 MB): about 100 ms on a phone-like CPU the first time,
  40 ms afterwards.
