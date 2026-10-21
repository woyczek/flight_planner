# settings — reading of the V2 Settings (lot 1)

*23 October 2026. What the Pilot application keeps of V2's Settings (`apps/settings/*`, `shared/settings_panels.js`,
`shared/data_admin.js`, `shared/maintenance_page.js`, left untouched on develop), the usages checklist, and what each
usage shows. No code in this lot. Decisions: [DECISIONS.md](DECISIONS.md).*

## 1. V2 Settings, card by card, and where each goes

| V2 tab › card | Pilot application | Why |
|---|---|---|
| My profile › Identity and networks: trigram, IVAO VID, VATSIM CID, SimBrief | **Identity** card | the only identity a module receives (`ctx.identity`) |
| My profile › Identity › airline website login and password | dropped | the suite never handles the pilot's authentication on the website (website agent's rule) |
| My profile › Data access (GitHub repository, branch, token, "Cut access") | **Access** card | becomes the `github` transport's setting (`githubData:frame`) |
| My profile › Usage level | **Level** card, once the frame has levels | the frame owns levels; settings only shows the choice |
| My profile › This device, Sign-in and password, Users (signed accounts, V2 accounts) | dropped | V3 security: a device token and a trigram (V3 spec § 8) |
| My profile › Mission types, Aircraft flown, Aircraft and simulators, Altitude without oxygen | to the modules that use them | report / flightlog / fuel settings, in their own screens |
| Appearance | link to the design block | designs belong to the design agent |
| Centre (all) | CPCO application | nothing of it in Pilot |
| Installation › Sources and folders (authorised data folder) | dropped | the frame's launcher transport reads `data/` itself |
| Installation › Keys and external services (IVAO API key…) | **Keys** card, **only when a launcher serves the page** | the key stays on the launcher (`secrets/`), never in the browser; status and "Test" only |
| Installation / Maintenance › Aeronautical data, Aircraft types | **Offline data** card through `ctx.aerodb` | zones and cycles cached on this device; the aerodb agent owns the content |
| Maintenance › Versions, Updates | **About** card | version, "a new version is ready" from the frame's service worker; launcher self-update stays on V2 |
| Maintenance › Caches and storage | **Offline data** card | size of the frame cache, pending writes; "Empty this device" refused while writes are pending |
| Maintenance › Backup (browser archive) | **Export / import this device** for single use only | with an exchange, the repository is the backup |
| Maintenance › Journal | **Diagnostics** card | last passes, last error, transport; copyable for a bug report |
| Maintenance › level-4 tools (registry, callsigns, merges, ledgers…) | V2 / CPCO | desktop and centre work |
| First run (tab) | **first start**: Identity, then Usages, two short cards | replaces the V2 tour |

## 2. The usages checklist and what it shows

Several boxes may be ticked; only the ticked usages change the interface (V3 spec § 8).

| Usage | Transport (frame SPEC § 3.5) | Cards shown, besides Identity, Offline data, About, Diagnostics |
|---|---|---|
| **Alone, on this device** | local | Export / import this device; no synchronisation control |
| **Alone, on several devices** | launcher + git, or GitHub | Access (repository, branch, token; "Cut access"), Synchronisation (state, last pass, pending, "Synchronise now") |
| **Several users (git data repository)** | launcher + git, or GitHub | same as above; the trigram becomes required (author of each commit, owner of `pilot/<trigram>/`) |
| **Server (web service, website)** | web service, later | one line "to come"; nothing to set yet |
| *(page served by a launcher)* | — | Keys, whatever the usages |

## 3. Proposals for the next lots

1. **Where settings live**: `frame/settings/settings.js`, a frame screen `#settings` that replaces `#device` (it is
   part of the frame, so it may set the transport and the token, which a module may not). The frame agent keeps the
   transport choice; settings writes `device/usages.json` and `device/identity.json` (same files, `cache` policy) and
   calls `FrameData.github.save` / a new `FrameData.github.clear` for "Cut access".
2. **Taking over V2 on the same origin**, one tap, offered once: identity from `missionReportingConfig:v1`
   (`trigram`, `ivaoId`, `vatsimId`, `simbriefUser`) and access from `githubData:v1` (repository, branch, token copied
   to `githubData:frame`, never shown). V2's own copies are left as they are.
3. **Phone first**: one column of short cards, each saved on its own (no global "Save"), a wrong value said in the card.

## 4. Questions for the user

1. "Alone, on this device" and an exchange usage at once: should ticking one untick the other, or may both stay
   ticked (local work plus an exchange — which then simply means the exchange)?
2. Export / import of this device's data for single use: wanted, or is single use explicitly "no backup"?
3. Level choice in Settings, or only in the frame's menu once levels exist?
