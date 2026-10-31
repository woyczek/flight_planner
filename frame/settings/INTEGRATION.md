# settings — how the frame mounts it

For the frame agent and for any module that wonders where a device setting lives. The screen itself is described
in [SPEC.md](SPEC.md).

## 1. Loading and route

- The settings scripts are classic scripts **loaded on demand** by the frame at the first opening of `#settings`
  (`frame/app.js`, `LAZY.settings`, one after the other, in this order): `settings/admin_links.js` (`SogAdminLinks`, the
  Administration card's list), `settings/config.js` (`SogConfig`, a pilot's configuration), `settings/join.js`
  (`SogJoin`, the "Join the airline" assistant), `lib/qr.js` (`SogQR`, QR codes), then the screen itself in several
  parts: `settings/kit.js` (`SogSettingsKit`, shared helpers, and `SogSettingsT`, the texts each part adds to),
  `settings/launcher.js` (the launcher's cards: workstation access, keys, local network, data/ remote),
  `settings/access.js` (access and transport without a launcher, synchronisation), `settings/diagnostic.js` (about and
  diagnostics), `settings/admin.js` (Administration card, publication edge, pilot configuration), `settings/groups.js`
  (the arrangement of the screen: flat at Discovery, groups above, SPEC § 1), `settings/cards.js` (the device's cards,
  one builder each, drawing only) and `settings/actions.js` (the gestures: clicks, field listeners, backup, configuration
  file) — each fills `SogSettingsParts.<name>` — and last `settings/settings.js` (`SogSettings`, the screen: it reads the
  context once into `env`, orders the cards, places the page, paints the live state and hands the gestures to
  `actions.js`; SPEC § 8). `lib/clipboard.js` (fuel's module, `copyText`) is imported by `kit.js` when something is copied.
  Start-up, the menu and the first module never wait for them. The service worker keeps them all with the frame's files
  (`frame/sw.js`, `SHELL`).
- `frame/app.js` routes `#settings` and the old `#device` to `renderSettings(view)`, which calls
  `SogSettings.render(view, context)`. The ⚙ button of the header opens `#settings`.

## 2. The context the frame gives

Settings is part of the frame: its context is wider than a module's `ctx`.

| Field | What it is |
|---|---|
| `t`, `notify`, `ask` | the frame's texts, notifications and questions |
| `FD` | `window.FrameData` (status, `onStatus`, `github.config/save`, `github(cfg).head()`, `dump`, `load`) |
| `own` | the frame's own adapter on `device/` (policy `cache`) |
| `reload()` | re-reads `device/` and plugs the transport the usages ask for |
| `identity()`, `usages()` | the device's current identity and usages |
| `launcher()` | `{ data, dataGit }` when a launcher serves the page, otherwise null |
| `transport()` | the plugged transport (`missing: true` when the usages ask for an exchange nothing allows) |
| `aerodb()` | the aerodb service, or null |
| `syncNow()` | the frame's "synchronise now", with its notifications |
| `cutAccess()` | erases the GitHub token and setting of this device and plugs the transport again |
| `level()` | the device's usage level (1 to 3) |
| `modules()` | promise of `[{ id, label, level }]`, the application's modules with their `meta.level`, once read |
| `status` | `{ html(), bind(card) }`: the "Status" block that opens the screen (rule 14), drawn and kept up to date by the frame; `html()` is the card as a string at the value of the moment, `bind(card)` is called once it is in the page (`frame/INTEGRATION.md` § 10.2) |

## 3. For modules

- A module reads the identity through `ctx.identity` (read only) and never the files of `device/`.
- A module's own preferences (units, last OFP…) stay in the module, with the `cache` policy under its own prefix.
- **Usage levels**: chosen on this screen only (`device/level.json`: 1 discovery, 2 everyday — the default — 3
  full). A module declares its level in `meta.level` (1 by default); the frame's menu shows only the modules whose
  level is at most the device's, and a hidden module stays reachable by its address (`#id`). The level hides verbs,
  never data: a module never reads the level and never changes with it.

## 4. The airline's map options written by the Administration card (`airline/map_profiles.json`, keys `edge` and `runwayZoom`)

The card's "Flight zone limit" panel and its runway-threshold line write two keys of the file the map's threshold page already writes
(`modules/maps/SPEC.md`, "The airline's profiles"): settings adds `edge` and `runwayZoom` (one reader, `readProfiles`, one `get` of the
file; one writer, `writeProfiles(c, patch)`, `{ edge: { show } }` or `{ runwayZoom }`) and leaves everything else of the file as it was
(`schema`, `profiles`, any other key); the map module's own save spreads the file it read (`...cur`), so `edge` survives its
saves too. The file is a `record` (the newest `updated_at` wins), `by` is the last writer (`settings` or `maps`).

```json
{ "schema": 1, "updated_at": "2026-10-25T09:00:00Z", "by": "settings",
  "profiles": { "vfr": { "...": "..." } },
  "edge": { "show": false } }
```

- **`edge.show`** (boolean): whether the **edge line** that borders the flight zone limit is drawn. **Absent file, absent
  `edge` or absent `show` means shown (`true`)**: a module reads `file?.edge?.show !== false`.
- For the whole airline, not per device or per mode. Modules read it with the other profiles (`ctx.data.get` and `watch` on
  `airline/map_profiles.json`, already in the maps `meta.reads` / `meta.writes`); settings declares the same prefix
  (`merge: 'record'`) through its own adapter `settings-admin`. Settings never touches a module and a module never writes
  `edge`. More options of the same kind go in the same object (`edge.<name>`): a reader ignores what it does not know.
- **`runwayZoom`** (integer, 8 to 16; V3 § 10.30, `maps.runwayZoom`): the zoom from which the Map draws the runway
  thresholds (a short vector and the designator); below it nothing is drawn. **Absent, not an integer or out of bounds means
  11**: a module reads `Number.isInteger(f?.runwayZoom) && f.runwayZoom >= 8 && f.runwayZoom <= 16 ? f.runwayZoom : 11`.
  Written by the card's « Seuils de piste sur la carte » line (a list 8–16, saved at once, the rest of the file kept);
  the Map reads it with the profiles (`get` and `watch` of the same file), no event of its own.

## 5. Where the device's keys are

The GitHub access (`repo`, `branch`, `token`, `api`) and the weather key are in `device/keys.json` (`SPEC.md` § 2), read into
memory by the frame at each `reload()`. A module never reads them (`ctx.net` adds the weather key to avwx.rest calls, the
frame's transport adds the token); a `FrameData.dump()` never carries them.
