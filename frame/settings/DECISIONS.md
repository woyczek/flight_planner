# settings — decisions log

The settings agent's memory: every choice, dated, with its reason. Newest last. Project-wide decisions are in
`docs/technique/V3_SPECIFICATION.md` § 8; the frame's in `frame/DECISIONS.md`.

- **23 Oct 2026 — Role taken** by the session that wrote V2's data access (GitHub mode), the keys card, identity and
  networks and the signed accounts S1–S2. No signed accounts in the Pilot application: V2's code stays dormant on
  develop (V3 spec § 8).
- **23 Oct 2026 — Lot 1 (reading)**: [READING.md](READING.md). Proposed, awaiting the ergonomics session's go:
  - settings is a frame screen (`frame/settings/`, `#settings` replacing `#device`), not a module, because it sets the
    transport and the device token, which modules may not touch;
  - V2 cards kept: identity (without the website login), access, keys (launcher only), offline data, about,
    diagnostics; the rest goes to the modules that use it, to CPCO, to the design block, or is dropped;
  - one-tap take-over of V2's identity and access on the same origin;
  - cards saved one by one, phone first.
- **23 Oct 2026 — Lot 1 validated** by the ergonomics session; answers to the three questions (the user may reverse
  them):
  - "Alone on this device" is not a box: it is the state shown when no exchange is ticked; ticking an exchange
    replaces it. No boxes that contradict each other;
  - export and import of the device's data for single use: yes, one file — the only backup of disconnected mode;
  - the usage level is chosen in Settings only; the frame's menu stays verbs.
- **23 Oct 2026 — Lot 2, the settings screen** (`frame/settings/settings.js`, [SPEC.md](SPEC.md),
  [INTEGRATION.md](INTEGRATION.md)):
  - a classic script loaded by `frame/index.html`, routed by `frame/app.js` (`#settings`, `#device` kept as an alias);
    the frame's `#device` screen is removed;
  - a wider context than a module's (`FD`, `own`, `reload`, `launcher`, `transport`, `aerodb`, `syncNow`): settings
    sets the transport and the token;
  - `usages.single` is still written (true when nothing is ticked) so that older readers keep working;
  - export / import without a frame change: an adapter with no read prefix and the write prefix `''` reaches every
    path for writing without changing what the synchronisation pulls (reads are declared, writes without merge or
    policy are not); reference bases are left out, device files other than the identity too (the usages of another
    device must not switch this one's transport);
  - "Cut access" uses `FrameData.github.clear`, already in `transport_github.js`;
  - V2 take-over: identity always, access only when the frame has none, answer kept in `device/settings.json`;
  - keys: the V2 launcher routes (`/__setup/secrets`, `/__setup/secrets/test`), IVAO only, never a value shown;
  - offline data: aerodb's `status()`, the browser's storage estimate, and aerodb's lot 4 (`aerodb.offline`, arrived
    during the lot): one row per zone with "Keep offline" and "Free"; "Free" only when `offline.supported().evict`.
    Until the frame's adapter offers `cached` and `evict` (asked by aerodb), states read "unknown" and no zone can be
    freed; "Keep offline" already works.
- **23 Oct 2026 — Tests of lot 2** (`frame/index.html` in the built-in browser, 375 px and screen, French and
  English):
  - through `frame/store/test/fake_github.py`: V2 take-over (identity and access copied, card gone), "several
    devices" ticked → GitHub transport, access and synchronisation cards, "Test", "Synchronise now", "Cut access"
    (token erased, transport back to local with the "no way to exchange" sentence), identity checks, export (two
    files, references left out) and import (paths outside the data and reference bases refused, identity and file
    restored);
  - through the launcher (`tools/launch.py` on a copy of test data): keys card shown, a fictitious key saved then
    erased (the IVAO API was not called);
  - zones card with a simulated `aerodb.offline` handed to the screen from the console (no published SIA base on this
    workstation): rows, keep with progress, free, aircraft row, notifications, 375 px without horizontal scroll;
  - not testable here: a refused token (the frame's fake GitHub does not check tokens), keep / free on a real
    published base.
