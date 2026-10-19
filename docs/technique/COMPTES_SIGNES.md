# Signed accounts and data (group mode) — design

Status: **L0–L3 done** (19 October 2026: signed registry, group mode, recovery key, re-founding — `shared/sog_registry.js`); L4–L6 to come. Design of 8 October 2026. Work item “accounts and data decentralised through git, signed”.
The user's decisions are reproduced as they stand; proposed technical choices are marked *proposed*.

## 1. Goal and limits

Today, any member who can push to the data repository can:

- give themselves the `admin_centre` role;
- replace someone else's password hash;
- write assignments in place of the Centre.

The pages believe what they read ([audit of 7 October](AUDIT_SECURITE_2026-10-07.md), E7).

The work item does not try to prevent writing to git: that is impossible without a server. It makes **each
browser refuse what is not signed by the right person**. Forged data does reach the computer, but it is
not taken into account, and the reason for the refusal is shown.

**What remains out of reach:**

- **Script injected on a device.** A script running in the suite on a device can sign with that device's
  key: it cannot be exported, but it remains usable by the page. Hence the rule: **group mode is only
  enabled with the CSP in place** (batch 4 of the audit, `connect-src` closed, read-only folder handles).
- **Reading.** Every member reads everything that is in git. Confidentiality will come from per-recipient encryption
  (§ 9, step 2).
- **Password hashes.** They travel with the registry, in PBKDF2-SHA256 with 310,000 iterations
  (decision: no other format). A weak password can be cracked offline. With device keys, the password
  is only a second factor.

## 2. Two modes

| | **Standalone** (today, by default) | **Group** |
|---|---|---|
| For whom | a single computer, or a group without a shared registry | an SO Group that shares `data/` through git |
| Centre access | password from `data/config/centre.json` (`DEFA` by default), **shown** next to the “Enable the Centre” button: usage lock | `admin_centre` role in the signed registry; the password is no longer used |
| Users, roles | records `data/utilisateurs/<TRI>.json`, unsigned (as today) | signed registry `data/utilisateurs/_registre.json`; the records keep the name and preferences |
| Assignments | unsigned | signed by an admin, one signature per assignment |
| Choice | button in Settings › Centre; mode shown in the first-run summary and in Settings › Centre | same |

**Switching to group mode** (“Switch to group mode” (« Passer en mode groupe ») button, Settings › Centre):

1. It requires **Centre access** (password) and the launcher's **CSP**. The launcher announces `csp: true` in
   `/__setup/status`; without it, the button is greyed out and says why.
2. The signed-in user becomes the **first admin**. Their device creates its key pair, then the **recovery key**
   (§ 6), exported straight away to a password-protected file.
3. Version 1 of the registry is written and signed by this device. It takes over the existing records (trigram, name,
   role, active, password hash): **nothing is lost**.
4. The group is **“being set up”** as long as it does not have **two distinct admins with a device key**, in addition
   to the recovery key (decision). In this state:
   - the registry is signed and verified;
   - the group-mode rules do not yet apply to assignments;
   - the Centre also remains accessible by password.
   A permanent alert says so in Settings › Centre.
5. The **second admin** enrols (§ 5). The first one approves them and names them admin in a new version: the group
   is **active**.

Going back to standalone mode: button reserved for admins. The registry is kept, simply no longer read; the records stay
up to date, because each version of the registry updates them.

## 3. Device keys

- **Where**: `shared/sog_keys.js`, its own IndexedDB database `sogKeys`. It stays out of the local backup
  (`browser_store.js`), and a non-exportable key cannot be serialised anyway.
- **What**: two pairs per device, both non-exportable (`extractable: false`).
  - **Signature**: ECDSA P-256 with SHA-256.
  - **Exchange**: ECDH P-256, reserved for the encryption of step 2. It is created right now, so as not to have to
    re-enrol the devices later.
- **A device is a browser on a computer.** A pilot with two PCs has two keys, each enrolled.
  Browser reset or profile cleared: key lost, re-enrolment needed. A notification explains it on the first
  load.
- **Fingerprint**: SHA-256 of the signature public key in SPKI format. The first 64 bits are shown in 4 hexadecimal
  groups, `7F3A-91C2-04BE-D85E`, and the full fingerprint is kept in the files.
- **Key identifier** (`kid`): the full fingerprint in hexadecimal.

### Algorithm

**`alg`** field in each public key and each signature. The envelope accepts `ES256` (ECDSA P-256, SHA-256,
raw r‖s signature of 64 bytes) and `Ed25519`.

**Choice: `ES256` for all keys created.** This is the user's answer: ECDSA P-256, supported by
all the browsers of the suite. `Ed25519` is accepted for verification if the browser knows it. A change
of algorithm later will only require a new key per device, without changing the format.

Signing and verification are done **only in the browser** (WebCrypto). This is the decision “go for
signing in the browser”: the launcher stays on the Python standard library, without any cryptography, and
verifies nothing.

Measurements from the BUGS SOG session (Chrome 154, 6.5 KB message, average over 1,000 runs):

| | Generation | Signature | Verification | 500 assignments verified |
|---|---|---|---|---|
| ECDSA P-256 (browser) | 0.3 ms | 0.045 ms | 0.087 ms | < 50 ms |
| Ed25519 (browser) | 0.1 ms | 0.028 ms | 0.045 ms | < 25 ms |
| Ed25519 in pure Python (launcher, RFC 8032) | — | — | 3.1 ms | 1.5 s |

The cost is negligible in the browser. The degraded mode through the launcher is ruled out.

## 4. Signed format

**Canonical JSON** (JCS, RFC 8785): keys sorted by UTF-16 code units, no whitespace, strings and numbers serialised as
`JSON.stringify` does (deterministic from one browser to another; only browsers sign and verify);
`NaN` and `Infinity` refused. The signature covers the UTF-8 bytes of this text.

```json
{
  "sog": "signe/1",
  "contenu": { … },
  "signatures": [
    { "kid": "7f3a91c2…", "alg": "ES256", "sig": "<base64url>", "at": "2026-10-08T10:00:00Z" }
  ]
}
```

- `contenu` is signed as is, canonicalised.
- `at` is informative. It is not part of what is signed: the relevant date is that of the content.
- A signature is valid if:
  - `kid` designates an active key of the accepted registry;
  - the role of the key holder allows this type of content;
  - the WebCrypto verification succeeds.

## 5. User registry

File `data/utilisateurs/_registre.json`, signed envelope whose `contenu` is:

```json
{
  "type": "registre",
  "va": "SOG",
  "version": 7,
  "precedente": "<sha256 du contenu canonique de la version 6>",
  "etat": "actif",
  "utilisateurs": {
    "ALF": {
      "nom": "…",
      "role": "admin_centre",
      "actif": true,
      "mot_de_passe": { "algo": "PBKDF2-SHA256", "iterations": 310000, "sel": "…", "empreinte": "…" },
      "cles": [
        { "kid": "…", "alg": "ES256", "pub": "<SPKI base64>", "ecdh": "<SPKI base64>", "poste": "PC bureau", "depuis": "…" }
      ]
    }
  },
  "secours": [ { "kid": "…", "alg": "ES256", "pub": "…", "depuis": "…" } ],
  "updated_at": "…",
  "by": "ALF"
}
```

The `etat` state is `constitution` or `actif` (§ 2).

### Acceptance rules

They are applied by each browser, on each read.

1. **Version 1** (foundation): signed by a key that it itself declares as admin.
   - It is accepted on **trust on first use**.
   - The device shows the first admin's fingerprint and asks for it to be confirmed after comparing it with the one received through
     another channel (Discord, SMS, email), with the “Confirm” and “Reject” (« Refuser ») buttons.
   - The device remembers the confirmed fingerprint.
2. **Version n > 1**:
   - signed by **an admin or recovery key of the accepted version** (n − 1 or earlier, see point 3);
   - `version` strictly greater than the accepted one;
   - `precedente` equal to the hash of the accepted content, except for a version jump (point 3).
3. **Version jump** (device offline for a long time): a version n + k is accepted if it is signed by an admin
   of the accepted version **and** the `precedente` chain goes back to it. The intermediate versions are read
   from the git history by the launcher (`git log` on the file): route `/__setup/registre-historique`, which returns
   the contents without verifying anything. If the chain cannot be found, the version is refused and the device keeps
   the old one, with a message.
4. **Never any rollback.** The last accepted version is kept in IndexedDB (`sogKeys`, store
   `registre`). An older or equal version coming from git is ignored.
5. **Refusal shown**: floating notification and a line in Settings › Centre › Users and rights (“Registry v8 refused:
   signed by an unknown key (kid …)” (« Registre v8 refusé : signé par une clé inconnue (kid …) »)). The device carries on with the accepted version.
6. **An admin cannot remove the last admin**, nor go below two admins in the active state. The registry
   would remain signable by the recovery key, but the rule is checked at signing and at reading.

### Git conflicts

Two admins who publish a version at the same time create a conflict on `_registre.json`. `tools/data_sync.py`
keeps **the highest `version`**, and the other file goes into `_conflits/` as today. Python verifies nothing.
If two versions have the same number, the browser only accepts the one that follows its chain. The admin whose version is
set aside sees their change not applied and redoes it, with a button that reloads, reapplies and signs.

## 6. Recovery key

Decision: two admins at least, **plus** a recovery key, and re-founding as a last resort.

- **Creation**: when switching to group mode, by the first admin.
  - ECDSA P-256 pair, **exportable this time only**.
  - The private key (PKCS#8) is encrypted with AES-GCM, under a key derived from a password chosen for the occasion
    (PBKDF2-SHA256, 600,000 iterations, random salt).
  - It is downloaded as `sog-cle-secours-<empreinte>.json`, then wiped from memory.
  - The device does not keep it. The page asks for the file to be stored offline (USB stick) and for the password to be written down
    separately.
- **Status**: declared in `secours` of the registry, it **counts as an admin key** for signing a version.
- **Use**: Settings › Centre › Users and rights › “Use the recovery key” (« Utiliser la clé de secours »).
  - You choose the file and type the password; the key is imported into memory, non-exportable, for a single
    signature.
  - Typical use: naming a new admin when the admins have lost their devices.
  - The registry records the use (`by: "secours"`).
- **Replacement**: an admin can create a new recovery key (new version of the registry, the old one removed).

### Re-founding (last resort)

If all the admin keys and the recovery key are lost:

1. A user clicks “Re-found the group” (« Refonder le groupe »). This is a new registry in version 1, with a new group
   identifier (`groupe`: random), signed by them.
2. Each device then sees “The registry has been re-founded” (« Le registre a été refondé ») and must reconfirm the new admin's fingerprint, received out
   of band, as on first use.
3. Without confirmation, the device keeps the old registry and refuses the new one.

## 7. Enrolment and revocation

1. **Device** (My profile › “This device” (« Ce poste »)):
   - the page shows the device fingerprint, `7F3A-91C2-04BE-D85E`;
   - the “Request access” (« Demander l'accès ») button writes `data/utilisateurs/demandes/<TRI>_<empreinte>.json`, with trigram, device
     name, public keys (signature and exchange), date, and a signature by the device key (proof of
     possession);
   - the request goes out with the next “Synchronise”.
2. **Out of band**: the pilot sends their fingerprint to an admin (Discord, SMS, email).
3. **Admin** (Settings › Centre › Users and rights › “Requests” (« Demandes »)):
   - for each request: trigram, device name, fingerprint calculated by the admin's page;
   - the admin compares it with the fingerprint received, then clicks “Approve” (« Approuver ») (new version of the registry with the key,
     signed) or “Reject” (request deleted).
   - A request for an unknown trigram creates the user, with the `utilisateur` role.
4. **Revocation**: “Revoke” (« Révoquer ») on a key publishes a new version of the registry without that key. Its later
   signatures are refused. Its earlier signatures remain valid as long as their content stays in place
   (*proposed*: an assignment signed by a revoked key remains valid, otherwise everything would have to be re-signed).
   Deactivating a user (`actif: false`) revokes all their keys.

## 8. Signed assignments

- **Only admins assign** (decision).
- **One signature per assignment**, not per file. `missions/affectations.json` is merged **entry by entry** by
  `data_sync.py`, which would break a file signature. Each entry becomes
  `{ …affectation…, "sig": { "kid", "alg", "sig" } }`, with the signature covering the canonicalised entry without `sig`.
  `affectations.yaml` (copy per mission) follows the same rule.
- **Reading in active group mode**: an entry that is unsigned, or signed by a key that is not admin in the accepted
  registry, is **ignored**. A notification gives the number of entries and the reason; the detail appears in the
  Centre.
- **Migration**: admin button “Sign existing assignments” (« Signer les affectations existantes »). The admin checks the number of entries, then signs.
- **Log** (`affectations_log.json`): entries signed in the same way, merging unchanged.

## 9. Next steps (outside this work item)

- **Availability and mission reports (CR)** signed by the key of the authoring pilot (same envelope per record).
- **Visibility**, first through a display filter (batch L6): a pilot only sees their missions coming from the SOG.
- **Per-recipient encryption**:
  - ECDH P-256 between the writer's exchange key and that of each recipient;
  - HKDF, then AES-GCM on a random content key, wrapped for each recipient and for the admins.

## 10. Batches and files

| Batch | Content | Files |
|---|---|---|
| L0 | this document | `docs/technique/COMPTES_SIGNES.md` |
| L1 | standalone Centre: `data/config/centre.json` (`DEFA` by default, shown), end of `CPCO_HASH`, mode shown | `shared/repository_nav.js` (Centre block), `shared/data_admin.js` (“Enable the Centre” card), `apps/settings/premier_lancement.html` + `_i18n.js`, `tools/jeu_essai`, `tools/data_template`, `tools/launch.py` (`csp` in `/__setup/status`, later) |
| L2 | device keys, fingerprint, envelope, canonical JSON, test bench | `shared/sog_keys.js` (new), `tools/crypto_banc.html` (new), `shared/browser_store.js` (exclusion) |
| *audit batch 4* | launcher CSP, read-only handles: **prerequisite for group mode** | `tools/launch.py`, `shared/file_access.js`, pages |
| L3 (done) | signed registry, group mode, recovery key, re-founding | `shared/sog_registry.js` (new), `shared/users.js` (roles, state and password hash from the registry in group mode; changes published as signed versions), `shared/repository_nav.js` (loading, Centre access in the active group), `shared/settings_panels.js` (“Group mode” section, Settings › Centre, open even with the Centre locked), `tools/data_sync.py` (registry conflict: highest `version`), `tools/launch.py` (`/__setup/registre-historique`), `tools/crypto_banc.html` (registry tests) |
| L4 | enrolment, approval, revocation | `shared/settings_panels.js` (Users), My profile |
| L5 | signed assignments | `shared/assignments.js`, `shared/assign_dialog.js` |
| L6 | display filter for My missions | `apps/pilot/mes_missions.html` |

Each batch includes the 4 languages, the floating notifications, the manuals ×4, the CHANGELOG and `format_sources.py`.
The Centre lock tests are done with the password supplied by the user, without any workaround.
