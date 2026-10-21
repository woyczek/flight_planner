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

## 9. Open questions

1. Order of the three applications: which one first? (Proposal: SOG client, the most used on a phone; then Pilot;
   CPCO last, desktop-first.)
2. Repository layout: one repository with `frame/` and `modules/<name>/`, or one repository per module? (Proposal:
   one repository, one folder per module, each with its spec and guide; the data repository unchanged.)
3. V2 during V3: bug fixes only on `develop`; V3 on a branch `v3` until the first application ships.
4. PHP website: what it receives first (reports? flight logs?), and whether it also becomes a data backend behind
   the data layer.
