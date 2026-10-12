# Security audit — 2 October 2026

Scope: the suite as it is served (static pages and scripts of `apps/` and `shared/`), the launcher
(`tools/launch.py`), the data read (YAML and Markdown missions written by ChatGPT, imported files), the secrets
kept by the browser. Method: code reading, targeted searches (HTML insertion, addresses, code evaluation,
messages between pages), launcher tests (forged requests).

## Fixed

| Item | Risk | Fix |
|---|---|---|
| Launcher: files served without checking the `Host` header | A page from another site that pointed its name at 127.0.0.1 (“DNS rebinding”) could read the folder, including `data/` (private data) | Machine `Host` required for every request (GET, HEAD, POST): 127.0.0.1, localhost, [::1] and the launcher's port; otherwise 403 |
| Launcher: upload size unbounded | Memory exhausted by an oversized upload | 512 MB at most, otherwise 413; invalid size: 400 |
| Launcher: framagit credentials passed to `git credential approve` | A line break in the username or password slipped in an extra field | Line breaks and null character rejected |
| Launcher: file types | The browser interpreting a file as another type | `X-Content-Type-Options: nosniff` header; `config/repository_tree` (script without extension) served as `text/javascript`, otherwise rejected by the browser (no more menu) |
| Fuel planner: aircraft profile comment, phase names | An imported profile (file) could slip HTML into the table | Escaped (`RepositoryKit.esc`) |
| Settings: address of the mission report sending webservice | The sending key goes in a header: over `http://`, it would travel in clear text | `https://` mandatory, except on the machine (localhost, tests) |

## Checked, compliant

- **YAML**: js-yaml 4.1.0, `load` without executable types (no functions, no expressions).
- **HTML insertion**: the texts of missions, envelopes, tracks, registries and mission reports go through `esc` (kit) before
  entering the page; both Markdown renderers (registry, “My missions”) escape the text before applying bold,
  italics, code and tables; the links built come from the suite's configuration, never from the data.
- **Evaluated code**: neither `eval` nor `new Function` in the suite's code (excluding third-party libraries).
- **Messages between pages**: `BroadcastChannel` (same origin only), no `postMessage` received from another window.
- **Launcher interface** (`/__setup/…`): `X-DEFA-Setup` header required, which another page cannot send without a
  CORS preflight, which this server does not handle; listens on 127.0.0.1 only; data archive extracted into
  `data/` only (outgoing paths ignored); framagit credentials passed to Git through the environment, never written
  to `.git/config` or into the address.
- **Browser secrets**: sending webservice key (`missionSendKey:`), DEFA site credentials
  (`defaCredentials:`) excluded from backups (`browser_store.js`, SKIP list); never written to a file.
- **External links**: opened with `noopener`.

## Remaining risks (accepted or to be monitored)

- **Secrets in clear text in browser storage** (sending key, DEFA credentials): readable by any script on
  the page; the suite loads none from elsewhere (libraries, styles and fonts served with it, checked). To be reviewed if a
  real DEFA webservice is connected (time-limited token rather than a permanent key).
- **No content security policy (CSP)**: the pages have inline scripts; a strict CSP would require
  moving them out into files. Limited benefit for a suite served locally.
- **`.git` folder served by the launcher**: needed for the commit number in the footer; it does not contain the
  credentials (system credential manager), and remains limited to the machine.
- **Files opened by the user** (missions, profiles, ODV workbooks): treated as data, never as
  code; a booby-trapped file can at worst only display misleading text.
