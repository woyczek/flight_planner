# website — integration

How the frame mounts "Website", what it reads and writes, and what other modules read from it. Rules:
[SPEC.md](SPEC.md); the frame's adapter: [frame/INTEGRATION.md](../../frame/INTEGRATION.md).

## 1. Files

| File | Role |
|---|---|
| `modules/website/module.js` | the module: `meta`, `mount(el, ctx)`, `unmount()`; log and fleet paste with preview, Airline card |
| `modules/website/model.js` | pure: log and fleet parsers and merges (V2 rules), airline setting normalised, page addresses |
| `frame/lib/website.js` | shared pure code owned by website: "record the flight" (fields, `#defa=` address, copy line, "→ Vol") |

## 2. Mounting

`frame/app.js` lists it after "My flights" (`{ id: 'website', label: Website, icon: '⌂' }`); `meta.level: 2` (shown
from the "usual" usage level). `meta`:

```js
reads: ['airline/', 'pilot/'],
writes: [
  { prefix: 'airline/settings.json', merge: 'record' },   // airline setting (frame: ctx.airline)
  { prefix: 'airline/fleet.json', merge: 'record' },      // airline fleet
  { prefix: 'pilot/', merge: 'record' }                   // pilot/<trigram>/site_log.json
],
files: ['model.js']
```

`ctx` used: `data` (get, put), `t`, `lang`, `notify`, `identity.trigram`, `airline` (first value before the file is
read), `net` (GET of the log and fleet pages of `airline.site`, relayed by the launcher).

## 3. For other modules

- `ctx.airline` (frame) from `airline/settings.json`.
- `pilot/<trigram>/site_log.json`: flightlog (SPEC § 3 there).
- `airline/fleet.json`: report (registration → type, callsigns), maps, CPCO.
- `frame/lib/website.js`: report's "Save and record on the website".

## 4. Next

Nothing planned before the user gives access to the site (PHP web service, READING § 4).
