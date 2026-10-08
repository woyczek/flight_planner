# Comptes et données signés (mode groupe) — conception

État : **conception, à relire** (8 octobre 2026). Chantier « comptes et données décentralisés par git, signés ».
Décisions de l'utilisateur reprises telles quelles ; choix techniques proposés marqués *proposé*.

## 1. But et limites

Aujourd'hui, tout membre qui peut pousser dans le dépôt de données peut :

- se donner le rôle `admin_centre` ;
- remplacer l'empreinte du mot de passe d'un autre ;
- écrire des affectations à la place du Centre.

Les pages croient ce qu'elles lisent ([audit du 7 octobre](AUDIT_SECURITE_2026-10-07.md), E7).

Le chantier ne cherche pas à empêcher l'écriture dans git : c'est impossible sans serveur. Il fait **refuser par chaque
navigateur ce qui n'est pas signé par qui de droit**. Une donnée falsifiée arrive bien sur le poste, mais elle n'est
pas prise en compte, et la raison du refus est affichée.

**Ce qui reste hors d'atteinte :**

- **Script injecté sur un poste.** Un script qui tourne dans la suite sur un poste peut signer avec la clé de ce
  poste : elle n'est pas exportable, mais elle reste utilisable par la page. D'où la règle : **le mode groupe ne
  s'active qu'avec la CSP en place** (lot 4 de l'audit, `connect-src` fermé, poignées de dossiers en lecture).
- **Lecture.** Tout membre lit tout ce qui est dans git. La confidentialité viendra du chiffrement par destinataire
  (§ 9, étape 2).
- **Empreintes des mots de passe.** Elles circulent avec le registre, en PBKDF2-SHA256 à 310 000 itérations
  (décision : pas d'autre format). Un mot de passe faible se casse hors ligne. Avec les clés de poste, le mot de passe
  n'est plus qu'un second facteur.

## 2. Deux modes

| | **Standalone** (aujourd'hui, par défaut) | **Groupe** |
|---|---|---|
| Pour qui | un poste seul, ou un groupe sans registre partagé | un SO Group qui partage `data/` par git |
| Accès au Centre | mot de passe de `data/config/centre.json` (`DEFA` par défaut), **affiché** à côté du bouton « Activer le Centre » : verrou d'usage | rôle `admin_centre` dans le registre signé ; le mot de passe ne sert plus |
| Utilisateurs, rôles | fiches `data/utilisateurs/<TRI>.json`, non signées (comme aujourd'hui) | registre signé `data/utilisateurs/_registre.json` ; les fiches gardent nom et préférences |
| Affectations | non signées | signées par un admin, une signature par affectation |
| Choix | bouton dans Paramètres › Centre ; mode affiché dans le bilan du premier lancement et dans Paramètres › Centre | idem |

**Passage au mode groupe** (bouton « Passer en mode groupe », Paramètres › Centre) :

1. Il faut l'**accès au Centre** (mot de passe) et la **CSP** du lanceur. Le lanceur annonce `csp: true` dans
   `/__setup/status` ; sans elle, le bouton est grisé et dit pourquoi.
2. L'utilisateur connecté devient le **premier admin**. Son poste crée sa paire de clés, puis la **clé de secours**
   (§ 6), exportée tout de suite dans un fichier protégé par mot de passe.
3. La version 1 du registre est écrite et signée par ce poste. Elle reprend les fiches existantes (trigramme, nom,
   rôle, actif, empreinte du mot de passe) : **rien n'est perdu**.
4. Le groupe est **« en constitution »** tant qu'il n'a pas **deux admins distincts avec une clé de poste**, en plus
   de la clé de secours (décision). Dans cet état :
   - le registre est signé et vérifié ;
   - les règles du mode groupe ne s'appliquent pas encore aux affectations ;
   - le Centre reste aussi accessible par mot de passe.
   Une alerte permanente l'indique dans Paramètres › Centre.
5. Le **deuxième admin** s'enrôle (§ 5). Le premier l'approuve et le nomme admin dans une nouvelle version : le groupe
   est **actif**.

Retour au mode standalone : bouton réservé aux admins. Le registre est gardé, simplement plus lu ; les fiches restent
à jour, car chaque version du registre les met à jour.

## 3. Clés de poste

- **Où** : `shared/sog_keys.js`, base IndexedDB propre `sogKeys`. Elle reste hors de la sauvegarde locale
  (`browser_store.js`), et une clé non exportable ne peut de toute façon pas être sérialisée.
- **Quoi** : deux paires par poste, toutes deux non exportables (`extractable: false`).
  - **Signature** : ECDSA P-256 avec SHA-256.
  - **Échange** : ECDH P-256, réservée au chiffrement de l'étape 2. Elle est créée dès maintenant, pour ne pas devoir
    réenrôler les postes plus tard.
- **Un poste, c'est un navigateur sur un ordinateur.** Un pilote avec deux PC a deux clés, enrôlées chacune.
  Navigateur réinitialisé ou profil effacé : clé perdue, il faut réenrôler. Une notification l'explique au premier
  chargement.
- **Empreinte** : SHA-256 de la clé publique de signature au format SPKI. On affiche les 64 premiers bits en 4 groupes
  hexadécimaux, `7F3A-91C2-04BE-D85E`, et on garde l'empreinte complète dans les fichiers.
- **Identifiant de clé** (`kid`) : l'empreinte complète en hexadécimal.

### Algorithme

Champ **`alg`** dans chaque clé publique et chaque signature. L'enveloppe accepte `ES256` (ECDSA P-256, SHA-256,
signature brute r‖s de 64 octets) et `Ed25519`.

**Choix : `ES256` pour toutes les clés créées.** C'est la réponse de l'utilisateur : ECDSA P-256, pris en charge par
tous les navigateurs de la suite. `Ed25519` est accepté en vérification si le navigateur le connaît. Un changement
d'algorithme plus tard ne demandera qu'une nouvelle clé par poste, sans changer de format.

Signature et vérification se font **uniquement dans le navigateur** (WebCrypto). C'est la décision « go pour la
signature dans le navigateur » : le lanceur reste en bibliothèque standard Python, sans aucune cryptographie, et ne
vérifie rien.

Mesures de la session BUGS SOG (Chrome 154, message de 6,5 Ko, moyenne sur 1 000 essais) :

| | Génération | Signature | Vérification | 500 affectations vérifiées |
|---|---|---|---|---|
| ECDSA P-256 (navigateur) | 0,3 ms | 0,045 ms | 0,087 ms | < 50 ms |
| Ed25519 (navigateur) | 0,1 ms | 0,028 ms | 0,045 ms | < 25 ms |
| Ed25519 en Python pur (lanceur, RFC 8032) | — | — | 3,1 ms | 1,5 s |

Le coût est négligeable dans le navigateur. Le mode dégradé par le lanceur est écarté.

## 4. Format signé

**JSON canonique** : clés triées, sans espaces, chaînes JSON standard, nombres entiers seulement (les dates sont des
chaînes ISO). La signature porte sur les octets UTF-8 de ce texte.

```json
{
  "sog": "signe/1",
  "contenu": { … },
  "signatures": [
    { "kid": "7f3a91c2…", "alg": "ES256", "sig": "<base64url>", "at": "2026-10-08T10:00:00Z" }
  ]
}
```

- `contenu` est signé tel quel, canonisé.
- `at` est informatif. Il ne fait pas partie de ce qui est signé : la date utile est celle du contenu.
- Une signature est valable si :
  - `kid` désigne une clé du registre accepté, active ;
  - le rôle du titulaire de la clé autorise ce type de contenu ;
  - la vérification WebCrypto réussit.

## 5. Registre des utilisateurs

Fichier `data/utilisateurs/_registre.json`, enveloppe signée dont le `contenu` est :

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

L'état `etat` vaut `constitution` ou `actif` (§ 2).

### Règles d'acceptation

Elles sont appliquées par chaque navigateur, à chaque lecture.

1. **Version 1** (fondation) : signée par une clé qu'elle déclare elle-même admin.
   - Elle est acceptée sur **confiance au premier usage**.
   - Le poste affiche l'empreinte du premier admin et demande de la confirmer après l'avoir comparée à celle reçue par
     un autre canal (Discord, SMS, mail), avec les boutons « Confirmer » et « Refuser ».
   - Le poste retient l'empreinte confirmée.
2. **Version n > 1** :
   - signée par **une clé admin ou de secours de la version acceptée** (n − 1 ou antérieure, voir point 3) ;
   - `version` strictement plus grande que celle acceptée ;
   - `precedente` égale à l'empreinte du contenu accepté, sauf saut de version (point 3).
3. **Saut de versions** (poste longtemps hors ligne) : une version n + k est acceptée si elle est signée par un admin
   de la version acceptée **et** que la chaîne `precedente` remonte jusqu'à elle. Les versions intermédiaires se lisent
   dans l'historique git par le lanceur (`git log -p` sur le fichier) ; *proposé* : route `/__setup/registre-historique`,
   qui renvoie les contenus sans rien vérifier. Si la chaîne est introuvable, la version est refusée et le poste garde
   l'ancienne, avec un message.
4. **Jamais de retour arrière.** La dernière version acceptée est gardée dans IndexedDB (`sogKeys`, magasin
   `registre`). Une version plus ancienne ou égale venant de git est ignorée.
5. **Refus affiché** : notification flottante et ligne dans Paramètres › Centre › Utilisateurs (« Registre v8 refusé :
   signé par une clé inconnue (kid …) »). Le poste continue avec la version acceptée.
6. **Un admin ne peut pas retirer le dernier admin**, ni descendre sous deux admins en état actif. Le registre
   resterait signable par la clé de secours, mais la règle est vérifiée à la signature et à la lecture.

### Conflits git

Deux admins qui publient une version en même temps créent un conflit sur `_registre.json`. `tools/data_sync.py`
garde **le plus grand `version`**, et l'autre fichier va dans `_conflits/` comme aujourd'hui. Python ne vérifie rien.
Si deux versions ont le même numéro, le navigateur n'accepte que celle qui suit sa chaîne. L'admin dont la version est
écartée voit sa modification non appliquée et la refait, avec un bouton qui recharge, réapplique et signe.

## 6. Clé de secours

Décision : deux admins au minimum, **plus** une clé de secours, et la refondation en dernier recours.

- **Création** : au passage en mode groupe, par le premier admin.
  - Paire ECDSA P-256 **exportable cette fois seulement**.
  - La clé privée (PKCS#8) est chiffrée en AES-GCM, sous une clé dérivée d'un mot de passe choisi pour l'occasion
    (PBKDF2-SHA256, 600 000 itérations, sel aléatoire).
  - Elle est téléchargée en `sog-cle-secours-<empreinte>.json`, puis effacée de la mémoire.
  - Le poste ne la garde pas. La page demande de ranger le fichier hors ligne (clé USB) et de noter le mot de passe à
    part.
- **Statut** : déclarée dans `secours` du registre, elle **compte comme une clé admin** pour signer une version.
- **Usage** : Paramètres › Centre › Utilisateurs › « Utiliser la clé de secours ».
  - On choisit le fichier et on tape le mot de passe ; la clé est importée en mémoire, non exportable, pour une seule
    signature.
  - Usage type : nommer un nouvel admin quand les admins ont perdu leurs postes.
  - Le registre trace l'usage (`by: "secours"`).
- **Remplacement** : un admin peut créer une nouvelle clé de secours (nouvelle version du registre, l'ancienne retirée).

### Refondation (dernier recours)

Si toutes les clés admin et la clé de secours sont perdues :

1. Un utilisateur clique « Refonder le groupe ». C'est un nouveau registre en version 1, avec un nouvel identifiant de
   groupe (`groupe` : aléatoire), signé par lui.
2. Chaque poste voit alors « Le registre a été refondé » et doit reconfirmer l'empreinte du nouvel admin, reçue hors
   bande, comme au premier usage.
3. Sans confirmation, le poste garde l'ancien registre et refuse le nouveau.

## 7. Enrôlement et révocation

1. **Poste** (Mon profil › « Ce poste ») :
   - la page affiche l'empreinte du poste, `7F3A-91C2-04BE-D85E` ;
   - le bouton « Demander l'accès » écrit `data/utilisateurs/demandes/<TRI>_<empreinte>.json`, avec trigramme, nom
     du poste, clés publiques (signature et échange), date, et une signature par la clé du poste (preuve de
     possession) ;
   - la demande part au prochain « Synchroniser ».
2. **Hors bande** : le pilote transmet son empreinte à un admin (Discord, SMS, mail).
3. **Admin** (Paramètres › Centre › Utilisateurs › Demandes) :
   - pour chaque demande : trigramme, nom du poste, empreinte calculée par la page de l'admin ;
   - l'admin compare avec l'empreinte reçue, puis clique « Approuver » (nouvelle version du registre avec la clé,
     signée) ou « Refuser » (demande supprimée).
   - Une demande pour un trigramme inconnu crée l'utilisateur, en rôle `utilisateur`.
4. **Révocation** : « Révoquer » sur une clé publie une nouvelle version du registre sans cette clé. Ses signatures
   postérieures sont refusées. Ses signatures antérieures restent valables tant que leur contenu reste en place
   (*proposé* : une affectation signée par une clé révoquée reste valable, sinon il faudrait tout re-signer).
   Désactiver un utilisateur (`actif: false`) révoque toutes ses clés.

## 8. Affectations signées

- **Seuls les admins affectent** (décision).
- **Une signature par affectation**, pas par fichier. `missions/affectations.json` est fusionné **entrée par entrée** par
  `data_sync.py`, ce qui casserait une signature de fichier. Chaque entrée devient
  `{ …affectation…, "sig": { "kid", "alg", "sig" } }`, avec la signature portée sur l'entrée canonisée sans `sig`.
  `affectations.yaml` (copie par mission) suit la même règle.
- **Lecture en mode groupe actif** : une entrée non signée, ou signée par une clé qui n'est pas admin dans le registre
  accepté, est **ignorée**. Une notification donne le nombre d'entrées et la raison ; le détail apparaît dans le
  Centre.
- **Migration** : bouton admin « Signer les affectations existantes ». L'admin relit le nombre d'entrées, puis signe.
- **Journal** (`affectations_log.json`) : entrées signées de la même façon, réunion inchangée.

## 9. Étapes suivantes (hors de ce chantier)

- **Dispos et CR** signés par la clé du pilote auteur (même enveloppe par fiche).
- **Visibilité**, d'abord par un filtre d'affichage (lot L6) : un pilote ne voit que ses missions venant du SOG.
- **Chiffrement par destinataire** :
  - ECDH P-256 entre la clé d'échange du rédacteur et celle de chaque destinataire ;
  - HKDF, puis AES-GCM sur une clé de contenu aléatoire, enveloppée pour chaque destinataire et pour les admins.

## 10. Lots et fichiers

| Lot | Contenu | Fichiers |
|---|---|---|
| L0 | ce document | `docs/technique/COMPTES_SIGNES.md` |
| L1 | Centre standalone : `data/config/centre.json` (`DEFA` par défaut, affiché), fin de `CPCO_HASH`, mode affiché | `shared/repository_nav.js` (bloc Centre), `shared/data_admin.js` (carte « Activer le Centre »), `apps/settings/premier_lancement.html` + `_i18n.js`, `tools/jeu_essai`, `tools/data_template`, `tools/launch.py` (`csp` dans `/__setup/status`, plus tard) |
| L2 | clés de poste, empreinte, enveloppe, JSON canonique, banc d'essai | `shared/sog_keys.js` (nouveau), `tools/crypto_banc.html` (nouveau), `shared/browser_store.js` (exclusion) |
| *audit lot 4* | CSP du lanceur, poignées en lecture : **préalable au mode groupe** | `tools/launch.py`, `shared/file_access.js`, pages |
| L3 | registre signé, mode groupe, clé de secours, refondation | `shared/sog_registry.js` (nouveau), `shared/users.js`, `tools/data_sync.py` (conflit du registre), `tools/launch.py` (`index_users`) |
| L4 | enrôlement, approbation, révocation | `shared/settings_panels.js` (Utilisateurs), Mon profil |
| L5 | affectations signées | `shared/assignments.js`, `shared/assign_dialog.js` |
| L6 | filtre d'affichage de Mes missions | `apps/pilot/mes_missions.html` |

Chaque lot comprend les 4 langues, les notifications flottantes, les manuels ×4, le CHANGELOG et `format_sources.py`.
Les essais du verrou du Centre se font avec le mot de passe fourni par l'utilisateur, sans contournement.
