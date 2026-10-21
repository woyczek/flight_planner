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
