# V3 — three applications, one frame, modules (specification in progress)

*Started 22 October 2026 from the user's brief. Draft to be refined with the user before any code; interaction design
follows (§ 7). Decisions taken on this document are logged in § 8 so that no agent needs the chat history.*

## 1. Why a V3

V2 added usage levels, three manuals, a mission generator, performance sheets, an availability module, a phone mode,
a stand-alone site (GitHub Pages) and an iOS shell. Trying them on a phone and on the stand-alone site showed the
limits of a suite built page by page:

- the stand-alone mode reads a git repository without a cache: too slow, and the interface has no place for a
  synchronisation control;
- availability entry and mission assignment are desktop gestures (grid, drag and drop) that do not transfer to a
  finger;
- the "global" application, same code for the browser on a desktop and for the phone, is heavy and complex again.

The application and the desktop do not have the same goals. V3 separates them: one **frame**, **modules** worked on
one by one, and three **applications** that assemble modules. Modules are activable or not; the whole stays one
coherent suite.

## 2. The three applications

| Application | For whom | What it does | Main modules |
|---|---|---|---|
| **Pilot** | the pilot preparing a flight | planning tools: fuel, maps, flight level, airspaces, performance sheets, landings | fuel, maps, performance sheets, airspace, landing |
| **CPCO** (operations centre) | the planners of the centre | mission generator, mission registry, assignment of missions (from the registry, or "free"), order schedule | generator, registry, assignment, orders |
| **SOG client** | the member of the airline | receive missions, fly them, write reports — a report is **not** necessarily attached to a mission; availability; my flights | my missions, availability, report, my flights, fleet (read) |

Open: which application a given person opens by default (role in the registry), and whether one person can switch
between them on the same device.

## 3. Transverse blocks (the frame)

- **Design**: designs and skins, tokens, icons, density (desktop / touch), day / night.
- **Security and code exchange**: signed accounts, keys, external services, and the exchange of data and code —
  target: decentralised (no central server required to work).
- **Online help**: tutorials, manuals, in-page help, per application and per module.
- **Settings and maintenance**: identity, levels, data access, caches, diagnostics.
- **Centralisation to the website** (PHP at the target): CPCO data, flight logs, reports; exchange bus; backends.
- **Aeronautical database**: SIA base by zone and cycle, aircraft base, published to the data repository, cached on
  every device.
- **Data layer** (new, the heart of the frame): one local cache (IndexedDB) that serves every read; explicit and
  visible synchronisation (button with its state: "synced 4 min ago, 2 pending writes") plus a regular background
  sync; the same layer behind the launcher, the GitHub mode and the native shells — a module never knows where data
  comes from.
- *(to complete: navigation and levels, translation, notifications, identity.)*

## 4. Supports

| Support | Notes |
|---|---|
| Website (GitHub Pages today, PHP site at the target) | no launcher; data through the data layer |
| Stand-alone (launcher on a workstation) | full suite, folder of data, git synchronisation |
| iOS / Android application (Capacitor shells) | same modules, phone profile, token kept on the device |
| Phone, tablet, screen with keyboard and mouse | every module declares its screens per size; touch gestures are designed, not adapted |

## 5. Module contract (proposal)

A module is what `shared/dispos_timeline.js` already is: one file (or one folder), no dependency on the frame except
through an **adapter** it receives at mount, its own **specification** (regeneration prompt), its own **integration
guide**, delivered separately if useful. It declares:

- what it **reads** and **writes** (paths in the data repository, schema versions);
- its **screens** by size (desktop, tablet, phone) and the gestures of each;
- its **level** and the applications it belongs to;
- its texts (English by default, labels supplied by the frame).

The frame loads a module on demand. A phone profile loads only the modules of its application.

## 6. Agents (one per module, memory of their own)

The sessions of `.claude/agents/` are reorganised by module and by transverse block: each agent owns one module,
its specification, its integration guide and its decisions log (`docs/technique/<module>/DECISIONS.md`); the
ergonomics session keeps the global vision, the specification of this document and the arbitration. Chat history is
**not** needed by an agent: what it needs is written here and in its module's documents.

## 7. Interaction design (to do, per application)

For each application: the first screen, the three things the person does most, how each is done with a finger and
with a mouse, what happens offline, where the synchronisation state and control are. Then per module: the screens
by size. Drafted with the user, validated before code.

## 8. Decisions log

- 22 Oct 2026 — V3 decided: frame + modules + three applications (Pilot, CPCO, SOG client); the application and the
  desktop do not have the same goals. Agents reorganised by module. The "live mission map on the phone" and the
  "signed assignments (S3)" lots are paused: to be redone on the frame.
- 22 Oct 2026 — stand-alone mode: a local cache and a regular synchronisation with a visible control are required
  (today's direct reads of the git repository are too slow).
- 22 Oct 2026 — availability entry and mission assignment are to be redesigned for touch (list-based), not adapted.
- 22 Oct 2026 — **Disconnected mode ("mode déco") is the heart of the exchange system**: every device works on its
  own copy, exchange is decentralised (git, API, website). **Security is simplified** to stay accessible to
  newcomers: a token per device and a trigram; the signed-accounts chantier stops (S3, S4 cancelled; L0-L3, S1, S2
  stay merged, dormant, optional). Signed accounts are not a viable objective beyond three or four people.
- 22 Oct 2026 — **Order: the Pilot application first**, built from modules that are then optimised for the whole
  suite. Immediate targets: the interaction with the DEFA Virtual website, the pilot tools (fuel, flight level,
  flight log, live map — optimised and fast), and writing a report with as few clicks as possible, filling the DEFA
  side at the same time. Secondary target: the JavaScript modules as the UX/UI base of a PHP backend, to define with
  the existing website (access "at some point"); CPCO will adhere to the site but must keep working offline.
- 22 Oct 2026 — **Exchange**: git was attractive but is not convincing as it stands; a website / web-service backend
  is indispensable — but not for the disconnected mode. The exchange must be simple, with no triple keys: maybe git,
  but **never "at every click"** — writes are batched and synchronised explicitly or periodically, through a
  transport the data layer plugs in (git, web service, later the PHP site).
- 22 Oct 2026 — **Usages are what multiply complexity**: the suite is configured by a checklist of usages (several
  may be ticked, not one of them): **single user** (local only, nothing to synchronise); **single user, several
  devices** (my copies kept in step through one transport); **several users** (git data repository); **backend**
  (web service / PHP site). The data layer enables a transport per ticked usage; the interface shows only what the
  ticked usages need (synchronisation control, keys, access card). Nothing else differs between usages.
- 22 Oct 2026 — The mission registry already works locally and is enough to "play" a mission for oneself: V2 stays
  for that. The unreleased part of V2 is not considered stable; the new way of working starts now, on a `v3` branch.
- 22 Oct 2026 — One repository: `frame/` and `modules/<name>/`, each module with `SPEC.md`, `INTEGRATION.md`,
  `DECISIONS.md`; the data repository unchanged. One agent (Claude Desktop session) per module and per transverse
  block, reachable individually by the user; the ergonomics session keeps the global vision.
- 23 Oct 2026 — **V2 will be switched off progressively** (decided; the pace is not). Until then V2 pages live
  next to V3 on the same site and launcher.
- 23 Oct 2026 — **Aeronautical database generation: what is known, not decided.** Today the bases are generated by
  V2 only (reading `data/sia`, MORA, publication by zone, cycle and kind; aircraft base publication from Settings ›
  Maintenance). This is a workstation job and will probably need a "big" desktop client, unless something better is
  found. The only decision: failing better, at least that part of V2 is kept. `aerodb` only reads what is published.
- 23 Oct 2026 — **One aircraft registry in `aerodb`.** All aircraft data (ICAO types and performances, the pilot's
  performance sheets, the airline fleet with registrations and call signs, the anonymised reference, mission aircraft)
  are rationalised in `aerodb` at one place, fed globally, with one search over every source and the origin of each
  field. The registry is the master; the `.lnmperf` files are an **export kept in sync both ways**: one file per
  sheet, rewritten by the launcher whenever a sheet, the fleet or a completion (ChatGPT, EUROCONTROL, SimBrief) changes
  in the registry; and when a `.lnmperf` file changes on its side (edited in Little Navmap) its changes are merged
  into the registry, field by field, the most recent wins, the other value kept and reviewable, then re-exported.
  `fuel` keeps the screens and edits through the API; `website` feeds the fleet.
- 23 Oct 2026 — **Pilot access to a private data repository on GitHub.** A fine-grained token can only target
  repositories the token's owner owns (or an organisation's); an invited collaborator cannot create one for another
  user's private repository. Three ways, chosen at export from the repository owner's type: a user-owned repository →
  a classic token with the `repo` scope (dedicated GitHub account advised); an organisation-owned repository →
  fine-grained token scoped to that repository; later, sign-in without a token (OAuth / GitHub App) once a relay
  (the site's web service) exists. The onboarding wizard ("Join the airline") takes a pilot without any GitHub
  account by the hand, step by step.
- 23 Oct 2026 — **`develop` is the V3 line.** After 5.4.0 (last V2 release) the V3 work was squashed into one commit
  per block on `develop`; `v3` is the same line (sessions keep pushing there, `develop` fast-forwards). V2 fixes go to
  `v2-maintenance` (from `master`) and are carried over to `v3`.

## 9. Plan — first application: Pilot (from 22 October 2026)

Branch `v3` (from `develop`), one commit per lot, each module in `modules/<name>/` with its three documents. Order:

1. **frame/data** — the data layer: local cache (IndexedDB), explicit and background synchronisation with a visible
   control, behind the launcher, the GitHub mode and the shells; the frame's navigation, levels, translation,
   notifications, designs taken from V2 as they are. *Agent: frame.*
2. **modules/report** — the mission report with as few clicks as possible: prefill from the last flight (IVAO,
   SimBrief, the website log), three steps, and "record the flight on the DEFA website" in the same gesture.
   *Agent: report.*
3. **modules/website** — the interaction with the DEFA Virtual website: what it exposes today (pages, forms), what
   the modules send and read, the bookmarklet, then the PHP backend when access is given. *Agent: website.*
4. **modules/fuel** — fuel and flight level (from `apps/planner/flight_planner.js`), performance sheets as a
   sub-module. *Agent: fuel.*
5. **modules/maps** — the live map: route, airspaces, vertical profile, optimised and fast on a phone (from the
   studio's rendering, re-cut). *Agent: maps.*
6. **modules/flightlog** — my flights (reports and website log). *Agent: flightlog.*
7. Transverse: **design** (tokens, density, day/night), **aerodb** (SIA and aircraft bases published by zone and
   cycle), **help** (tutorials and manuals per module), **settings** (identity, data access, caches). *One agent
   each.*

The SOG client and CPCO applications come after, reusing the same modules; availability and assignment are
redesigned for touch at that point.

## 10. Open questions

1. PHP website: what it receives first (reports? flight logs?), and whether it becomes a data backend behind the data
   layer — to settle when the user has access to the site.
2. Which V2 pages stay reachable from the Pilot application during the transition (the full suite on the launcher).
3. **Designs (user, 23 Oct 2026): three designs are retained for V3 — `metro`, `swiss` and `cupertino`;**
   `cabinet` goes, `field` may stay. Nothing skeuomorphic on a phone. Mock-ups on branch `v3-metro`
   (`frame/design/demo_metro.html`, `frame/design/DECISIONS.md`). Points for the ergonomics session to decide:
   1. the page title written by the frame (the verb as `h1`), the modules dropping their own;
   2. `data-landmark` and `--sog-module*` (one landmark colour per module) in the integration contract, visible in
      every design or in metro only;
   3. the system bar (`theme-color`) following the header's real colour in every design;
   4. verb blocks in the phone drawer and a coloured rail on a screen (CSS only; more than seven verbs = a fifth row);
   5. the two title tokens `--sog-title-size` / `--sog-title-weight` kept (because `--sog-h1` also sizes figures);
   6. flat buttons and bottom-ruled fields: rules of the metro sheet, or tokens for every design
      (`--sog-btn-border`, `--sog-field-rule`);
   7. number tiles as colour blocks, or a left rule only (a coloured tile reads as a button);
   8. the exact hues of the landmark colours (Report is a dark orange so that white text keeps 4.5:1);
   9. a web font or not: Segoe UI Light (metro), Inter (swiss) and SF (cupertino) are not available everywhere;
      the mock-ups use system fonts, which keeps the offline shell light; a bundled font costs 250 to 300 KB;
   10. the map's canvas colours, still hard-coded in `modules/maps`, to be taken from the tokens by the maps agent.
