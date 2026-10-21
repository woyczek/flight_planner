# V3 frame — decisions log

The frame agent's memory: every choice, dated, with its reason. Newest last. Project-wide decisions are in
`docs/technique/V3_SPECIFICATION.md` § 8.

- **22 Oct 2026 — Lot 1 (reading) validated with the user**:
  - one cache (IndexedDB `sogFrame`) serves every read;
  - writes are queued and sent in batches, one commit per synchronisation;
  - transports are interchangeable and selected by the usages checklist;
  - the module contract goes through an adapter only.
- **22 Oct 2026 — Background synchronisation** (user, Q1): at start, on the button, and every 10 minutes while online.
- **22 Oct 2026 — Reference files** (user, Q2): read asynchronously through `get` / `read`, as JSON; no synchronous
  `<script>` loading any more. The heavy bases (SIA, aircraft) go through aerodb on the same cache.
- **22 Oct 2026 — Conflicts** (user, Q3): on a record, the newest `updated_at` wins. The loser is kept (store
  `conflicts`, consultable) and signalled (event `frame-data-conflict`, counted in the status), never a blocking
  question. Journals are united; keyed lists are merged record by record.
- **22 Oct 2026 — Transition** (user, Q4): V2 pages keep their data path; only V3 modules use `frame/data`.
- **22 Oct 2026 — Boundary with aerodb** (agreed with the aerodb agent):
  - the frame reads and caches files by path, with `read(path, { policy, wait })` →
    `{ value, text, rev, cached, pending, at }` | null and `list(prefix)` → paths | null (no tree ever read);
  - the `reference` policy: read-only, fetched at first read, kept while the revision is unchanged, revalidated during
    a pass, never queued, not prefetched;
  - aerodb owns the schema, cycle choice, parsing, indexes and its business API, mounted once as a service and handed
    to modules as `adapter.aerodb`; no module reads `sia/base/` or `AircraftDB/`;
  - revisions depend on the transport and are compared, never interpreted.
- **22 Oct 2026 — Revision = git blob sha computed locally** (SHA-1 of `blob <n>\0<content>`): after a push, the layer
  knows the new revision of each file it sent without re-reading the tree, and compares it exactly with the next tree.
- **22 Oct 2026 — GitHub transport through the git data API**, not the contents API:
  - one commit per batch (tree on the parent's tree, commit, non-forced ref update);
  - the head is read with a conditional request (304: no rate limit);
  - blobs are immutable, so never re-read.
  A refused fast-forward means "someone pushed": pull, merge, push again, at most three times.
- **22 Oct 2026 — Device token key `githubData:frame`**: inside the `githubData` prefix already excluded from browser
  backups by V2 (`shared/browser_store.js`), so no V2 change is needed.
- **22 Oct 2026 — A module writes only under its declared prefixes** (the adapter throws otherwise): the module's
  declaration is its contract and the synchronisation pulls only what mounted modules read.
- **22 Oct 2026 — `list` returns null, not [], when no tree was ever read**: a first launch offline must not look like
  an empty repository.
- **22 Oct 2026 — Tests**: `frame/data/test/index.html` against `frame/data/test/fake_github.py` (standard library; git
  data API in memory, real blob shas, commands to simulate another device, a push race, offline). 37 checks: offline,
  batch, pull and watch, record conflict, journal and keyed merges, race, reference policy, list before the first tree,
  write refused outside declared prefixes, local transport, git sha.
