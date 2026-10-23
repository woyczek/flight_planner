# settings — how the frame mounts it

For the frame agent and for any module that wonders where a device setting lives. The screen itself is described
in [SPEC.md](SPEC.md).

## 1. Loading and route

- `frame/index.html` loads `settings/settings.js` (classic script) before `app.js`; the service worker keeps it with
  the frame's files (`frame/sw.js`, `SHELL`).
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

## 3. For modules

- A module reads the identity through `ctx.identity` (read only) and never the files of `device/`.
- A module's own preferences (units, last OFP…) stay in the module, with the `cache` policy under its own prefix.
- **Usage levels**: chosen on this screen only (`device/level.json`: 1 discovery, 2 everyday — the default — 3
  full). A module declares its level in `meta.level` (1 by default); the frame's menu shows only the modules whose
  level is at most the device's, and a hidden module stays reachable by its address (`#id`). The level hides verbs,
  never data: a module never reads the level and never changes with it.
