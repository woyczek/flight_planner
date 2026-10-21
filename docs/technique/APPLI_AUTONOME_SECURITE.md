# Stand-alone app: who may write the data? (study, batch D)

Status: **study, 21 October 2026 — nothing coded; decision by the user.** Context: the site without launcher (GitHub
Pages, iOS app) reads and writes the private data repository `Woyczek/flight_planner_data` through the GitHub API with a
fine-grained personal token kept in the browser (`shared/github_data.js`, `githubData:v1`, excluded from backups).
Decisions not reopened here: data through the GitHub API, token limited to the data repository, kept in the browser
only. Related: `APPLI_AUTONOME.md`, `DONNEES_ET_ACCES.md`, `COMPTES_SIGNES.md`, `AUDIT_SECURITE_2026-10-07.md`.

## 0. Two facts checked first

- **A fine-grained token cannot reach another user's personal repository.** GitHub: "Each token is limited to access
  resources owned by a single user or organization", and among the open gaps: "contributing to repositories where the
  user is an outside or repository collaborator" (docs.github.com, *Managing your personal access tokens*, read on
  21 October 2026). So today only the owner (Woyczek) can create the token described in `APPLI_AUTONOME.md` § 4; a
  second tester, collaborator on the personal repository, would need a **classic** token, whose `repo` scope opens
  *all* the repositories they can reach. Moving the data repository into a **GitHub organization** fixes this: members
  then create fine-grained tokens with the organization as resource owner, and the organization can require approval
  of each token and impose a maximum lifetime.
- **CORS** (from a neutral origin): `api.github.com` answers (the site works today); `api.ivao.aero` answers too, even
  with an `apiKey` header (preflight accepted); `api.vatsim.net` does not (no CORS: "Failed to fetch").

## 1. Signed accounts for the site without launcher

What exists (`feature/audit-securite`, not merged): **L0–L3 done** — device keys (ECDSA P-256, WebCrypto,
non-exportable, IndexedDB `sogKeys`), signed envelope and canonical JSON, signed user registry
`utilisateurs/_registre.json` (versions chained, signed by an admin or the recovery key, trust on first use), group mode,
recovery key, re-founding. L4 (enrolment, revocation), L5 (signed assignments) and signed pilot records (§ 9 of
`COMPTES_SIGNES.md`) remain.

- **Who signs**: admins sign the registry (roles, active, password hashes, device keys) and the assignments; each
  pilot would sign their own records (availability, reports) with their device key.
- **Where it is verified**: in every browser, at every read (phone included: WebCrypto P-256 exists in Safari and
  WKWebView). No server is involved; the launcher verifies nothing either.
- **What it gives without a server**: a forged record (a pilot giving himself a role, a fake assignment, a report in
  someone else's name) is **ignored and reported** by every other browser.
- **What it does not give**: the token still grants **write access to every file**. A token holder can still delete or
  overwrite files (denial of service — recoverable from the git history, since the contents API cannot rewrite it) and
  can read everything (confidentiality needs per-recipient encryption, step 2 of the work item).
- **To adapt for the phone**: the launcher CSP becomes a `<meta http-equiv="Content-Security-Policy">` in the built
  pages (GitHub Pages sends no headers; `frame-ancestors` is not available in a meta); the registry history
  (`/__setup/registre-historique`) becomes `GET /repos/…/commits?path=utilisateurs/_registre.json` plus the content at
  each commit; the git-conflict rule of `data_sync.py` is replaced by the API's `sha` check (re-read, re-chain,
  re-sign). Device keys on a phone: Safari may purge a website's storage after 7 days without use (not the iOS app) →
  re-enrolment (L4), hence the app rather than Safari for signers.
- **Cost**: L4 + L5 + signed pilot records + the three adaptations: about four batches; no hosting.

## 2. Alternative: a small server in front of the repository

A write relay (for instance a Cloudflare Worker or a small VPS) holding a **GitHub App installation token** (installed
on the data repository only; tokens valid one hour, renewed by the server), with the **suite accounts** (trigram,
password hash or IVAO / VATSIM sign-in later), **per-path rules** (a pilot writes only his own records; mission orders
and assignments: Centre roles) and a **journal** (who wrote what, when).

- **What it removes**: no GitHub token on any phone; a stolen phone gives at most the pilot's own session (revocable on
  the server at once); a wrong write is refused before reaching git. Reads can go through it too (pilots need no
  GitHub account at all), with the same offline copies and outbox in the browser.
- **What it costs**: hosting (free tier of a serverless platform at this scale, or 4–6 € a month for a VPS); an online
  service to keep up (updates, rate limits, password storage, its own secret: the GitHub App private key); a
  dependency: if it is down, phones are read-only on their copies. Personal data then pass through a host (to be
  stated in the privacy notice).
- **What it breaks of "one git at the centre"**: nothing on the storage side — git stays the only store, the server
  keeps no data of its own beyond accounts and journal. But it is a **second door**: workstations with the launcher still
  push directly with their own git credentials. Either the launcher also writes through the server (and direct pushes
  are limited to admins by branch protection), or the server only protects the phones.
- **Effort**: one server batch (relay, accounts, rules, journal), one batch to switch `github_data.js` to it; the
  signed accounts stay useful as end-to-end integrity if the server itself is compromised.

## 3. Last IVAO flight without launcher

Today the launcher reads the IVAO tracker with the suite's key (`secrets/ivao.json`, never sent to a page).

- **Same server**: a route `/ivao/last-flight` (port of `ivao_last_flight` in `tools/launch.py`) keeps the key on the
  server; also needed for VATSIM, whose API refuses browser calls (no CORS).
- **From the page directly**: technically possible for IVAO (CORS accepted), but the key would be in every pilot's
  browser — readable, copyable, and the airline's key is meant to stay confidential: **ruled out**.
- **Nothing**: the tracker paste (Analyse / import, "→ CR" bookmark) and the tracker link already work without key.
  Acceptable for a test; the "Prefill from my last flight" menu greys out its entries without launcher.

## 4. The fine-grained token in a phone browser: risks and counter-measures

| Risk | What happens | Counter-measure |
|---|---|---|
| Phone stolen or lent, unlocked | full write access to the data repository from the app | short expiration (30–90 days); revocation from github.com › Settings › Developer settings (the owner of the token only; an organization owner can also revoke members' tokens); "Cut access" in the app |
| Device backup (iCloud, computer) | website data and the iOS app's storage may be part of the backup; restored on another device | iOS app: keep the token in the Keychain with "this device only" accessibility (Capacitor plugin) instead of `localStorage`; expiration |
| Shared origin `woyczek.github.io` | every GitHub Pages project of the same account is the same origin: any of them can read `githubData:v1` | custom domain for the suite, or no other Pages project on the account |
| Script injection (XSS) on the site | the script reads the token and sends it out | CSP as a meta tag (`connect-src` limited to the GitHub API and the listed services), audit batch 4a carried over |
| Token pasted in a chat, a screenshot, a support message | anyone can write | instructions in the app; expiration; revocation; one token per person (commits are attributed to the token owner) |
| Token with too wide a scope | classic token: all the user's repositories | organization + fine-grained token (contents: read and write, this repository only), approval required, maximum lifetime |
| Vandalism by a token holder | files deleted or rewritten | git history (revert); branch protection does not fit (each write is a direct commit); signed accounts make forged content inert, not deletion |

## 5. Recommendation

1. **Now, for the test**: move `flight_planner_data` into a GitHub organization (required anyway for a second tester:
   § 0), with fine-grained tokens approved by the owner and a maximum lifetime of 90 days; custom domain for the site
   or no other Pages project on the account; CSP as a meta tag in `tools/build_pages.py`. Testers are trusted pilots:
   the "one token per browser" model is acceptable for this phase only.
2. **Before any real multi-pilot deployment**: the **small relay server** (§ 2) — no token on phones, per-pilot rules,
   journal, and the same server serves the IVAO and VATSIM last-flight imports (§ 3). It is the only option that limits
   what a stolen phone can do.
3. **Signed accounts** (L4, L5, pilot records) remain the integrity layer for the workstations and against a
   compromised server, but **alone** they do not solve the phone case: they make forged data inert, not the write
   access harmless.

## 6. Decision of 21 October and batches

The user's decision: no organization for now (migration to come, one tester until then), no relay server; the
**signed accounts** integrity layer becomes the work item, on `feature/audit-securite`.

- **S1 — immediate measures (done)**:
  - CSP as a `<meta http-equiv>` tag in every built page (`tools/build_pages.py`, before any script), same list and
    form as the launcher header through the shared module `tools/csp_policy.py`, plus the addresses of
    `config/repository_tree`; without `frame-ancestors` (not available in a meta tag). The launcher's “Allow this
    website…” button only shows on a launcher page (nothing to allow from the static site).
  - Settings › My profile › Data access: token of **90 days at most**, never pasted in a message; “Cut access” erases
    the token and the data copies of the browser; lost phone: delete the token on github.com; on a `….github.io` site,
    a hint that every other Pages site of the account shares the origin.
  - `APPLI_AUTONOME.md` § 5: organization migration to come, one tester, no other Pages site on the account.
  - **iOS Keychain: not done.** Capacitor core has no Keychain storage; keeping the token in the Keychain with
    “this device only” accessibility needs a native plugin (a secure-storage plugin) and native code in `mobile/`. Until
    then, the iOS app keeps the token in the WKWebView `localStorage` (app container, part of device backups).
- **S2 — enrolment without launcher** (L4), **S3 — signed assignments** (L5), **S4 — records signed by the pilots**,
  registry history through the commits API, conflicts by `sha`: see the reading page sent before S2.

