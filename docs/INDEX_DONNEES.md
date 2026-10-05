# Index des données : IndexedDB, réplication, expiration, conflits

Proposition du 5 octobre 2026 (branche `feature/index-idb`). Suite de l'audit de performance
([perf/PLAN_PERF_2026-10-04.md](perf/PLAN_PERF_2026-10-04.md)) : les points de rupture de la montée en charge sont le
registre du navigateur (quota du stockage, ≈ 2 000 à 4 000 missions), le registre des CR lu en entier (≈ 2,5 s à
20 000 CR) et la grille de l'ODV.

## 1. Principe : les fichiers font foi, l'index se reconstruit

| Rôle | Où | Règle |
|---|---|---|
| **Source** | fichiers de `data/` (YAML, JSON), partagés par git | seule vérité ; texte lisible, comparable, fusionnable |
| **Index** | IndexedDB, base `defaIndex` | **dérivé** : copie organisée pour lire vite ; peut être jetée et reconstruite à tout moment (Paramètres › Maintenance › Caches) |
| **Boîte d'envoi** | IndexedDB, store `outbox` | ce qui n'existe encore que dans ce navigateur (disponibilités non enregistrées, brouillons de CR, écritures refusées faute de dossier) ; jamais mélangé à l'index |
| **Préférences** | localStorage | petits réglages de l'interface (langue, design, filtres) : inchangé |

Conséquence : un index ne crée jamais de conflit à lui seul. Les conflits n'existent qu'entre **deux écritures de
fichiers** ; l'index se contente de suivre.

## 2. Ce qui est indexé (là où c'est pertinent)

| Store | Clé | Index secondaires | Source | Remplace | Pourquoi |
|---|---|---|---|---|---|
| `missions` | `id` | `family`, `status`, `folder`, `generatedAt` | `data/missions/**/mission*.yaml` + suivi (§ 6) | `missionRegistry:v1` (230 Ko, croît) | quota du stockage ; l'estimation et les listes lisent une mission par son id |
| `reports` | `key` (famille\|id\|date) | `family`, `year`, `missionId`, `date`, `pilots` (multiEntry) | `data/cr/missions.yaml` puis `data/cr/<année>.yaml` (§ 7) | `missionCoreLedger:v2` (texte entier) | reporting par période, liaison mission → CR sans tout relire |
| `assignments` | `[mission, pilot, role]` | `pilot`, `day` (aaaa-mm-jj), `mission`, `[pilot, day]` | `data/missions/affectations.json` | lecture complète à chaque page | Mes missions : semaine d'un pilote ; ODV : grille par jour (fin du coût pilotes × créneaux × affectations) |
| `availability` | `[pilot, week]` | `week` | `data/disponibilites/<TRI>.json` | `pilotAvailability:v1` | grille de l'ODV par semaine |
| `readMarks` | `[mission, pilot, at]` | `takeoff` | local | `assignmentsRead:v1`, `pilotPlis:v2` (jamais purgés) | expiration (§ 4) |
| `files` | `path` | — | métadonnées des fichiers lus | `missionRegistryScan:v1` | signature de chaque source (§ 3) |

**Pas d'index** pour : les préférences, les passages entre pages (handoffs), la base SIA (déjà en IndexedDB, base
`sia-map-parser`), les profils de performance (60 Ko, lus en entier par une seule page).

## 3. Réplication : fichier → index, dans un seul sens

- **Lecture** : l'index garde pour chaque fichier source sa **signature** (`lastModified:size` via le dossier autorisé ;
  `Last-Modified`/`ETag` via le lanceur, avec requête conditionnelle → 304) et le hash de son contenu. Une page lit
  l'index tout de suite, puis **revalide** : si la signature a changé, seul ce fichier est relu et réindexé (comme la
  relecture incrémentale du registre aujourd'hui, généralisée).
- **Écriture** : on écrit **d'abord le fichier** (sous verrou, § 5), puis on réindexe à partir de ce qui a été écrit.
  L'index n'est jamais écrit « en avance » sur le fichier.
- **Déclencheurs de revalidation** : ouverture de page, retour sur l'onglet (`visibilitychange`), message d'un autre
  onglet (BroadcastChannel `defa-data`, déjà en place pour les affectations, étendu au registre et aux CR), bouton
  « Relire ».
- **Sans serveur** (`file://`) : mêmes règles, la signature vient du dossier autorisé (File System Access).

### 3.1 Fichiers du pool lus par signature (fait)

Les index du dossier portent la signature de chaque fichier : `data/disponibilites/_index.json` (`at` : semaine →
`updated_at` du fichier de la semaine ; `legacy_at` : ancien fichier `<TRI>.json`) et `data/utilisateurs/_index.json`
(`updated_at` de chaque fiche). Le lanceur les refait **à chaque demande** (fichiers changés par git, un autre poste
ou un éditeur : la signature dit vrai) ; une page qui écrit met à jour l'entrée du fichier écrit. La page lit l'index
du dossier (une requête), puis `MissionAssignments.readIndexed(fichier, signature)` : la copie du store `files`
(chemin, signature, contenu) sert sans requête tant qu'elle a la même signature ; sinon le fichier est relu et sa copie
remplacée. Pas de copie utilisée pour un fichier de la boîte d'envoi, une lecture « fraîche », ou sans signature
(ancien lanceur). Sans lanceur, l'index du dossier n'est tenu à jour que par les écritures des pages : après un
changement extérieur (git sans lanceur), Paramètres › Maintenance › Caches › Index des données (Purger).

## 4. Expiration

- **Pas de durée de vie pour l'exactitude** : une entrée d'index est valable tant que la signature de son fichier n'a
  pas changé, ni plus ni moins. Le délai actuel de 60 s des affectations devient un simple **pas de revalidation** (au
  plus une vérification par fichier toutes les N secondes) ; ce n'est plus lui qui décide si la donnée est juste.
- **Purge de ce qui grossit sans fin** : marques de lecture et état des plis effacés 6 mois après le décollage ;
  journal des affectations : index sur 12 mois (le fichier garde tout) ; brouillons de CR : 90 jours sans
  modification, avec une notification avant effacement.
- **Changement de format** : la version de la base (`defaIndex` v1, v2…) et une version de schéma par store ; un schéma
  inconnu → store vidé et reconstruit (jamais de migration hasardeuse d'un cache).
- **Pierres tombales** (§ 5) : gardées 90 jours, puis purgées.

## 5. Conflits : trois niveaux, trois réponses

| Niveau | Exemple | Réponse |
|---|---|---|
| **Deux onglets** du même navigateur | registre ouvert deux fois, CR enregistré dans un onglet pendant qu'un autre est ouvert | verrou Web Locks par fichier (`defa:<chemin>`) + message BroadcastChannel après écriture : l'autre onglet se met à jour. **Aujourd'hui le registre des CR n'a ni verrou ni relecture** : un onglet resté ouvert écrase les CR enregistrés par un autre (corrigé en premier, étape 1). |
| **Deux postes** sur le même dossier (Synology, OneDrive) ou deux lanceurs | deux personnes du Centre affectent en même temps | **écriture conditionnelle** : on retient la signature du fichier au moment de la lecture ; sous verrou, on relit la signature juste avant d'écrire. Inchangée → écriture. Changée → **fusion par enregistrement** (ci-dessous), puis écriture. |
| **Deux copies** réunies par git | deux pilotes qui poussent `data/` | fichiers découpés finement (un fichier par mission, par pilote et par semaine, par année de CR) pour que git fusionne seul ; enregistrements écrits un par ligne ou par bloc stable ; journaux en ajout seul. |

**Fusion par enregistrement** (trois versions : *base* = ce que j'avais lu, *mienne*, *la leur* = le fichier actuel) :

1. chaque enregistrement porte `id`, `updated_at`, `by` (et `rev`, compteur) — **à ajouter aux CR**, qui n'ont
   aujourd'hui qu'une date pour tout le fichier ;
2. enregistrement modifié d'un seul côté → on garde ce côté ; ajoutés des deux côtés avec des id différents → on garde
   les deux ;
3. **même enregistrement modifié des deux côtés** → conflit réel : pas d'écrasement silencieux. On écrit la version la
   plus récente, l'autre est gardée dans `data/<…>/_conflits/<id>_<date>.yaml` et une notification flottante propose
   de comparer et de choisir ;
4. suppression → **pierre tombale** (`deleted: true`, `deleted_at`, `by`) au lieu d'un retrait : sans elle, un
   enregistrement supprimé reviendrait par l'autre copie.

La base de la fusion (version lue) est gardée dans l'index (`files.base`), ce qui permet la fusion à trois sans
historique git.

## 6. Champs du Centre sur les missions (statut, notes, vol, CR liés)

Aujourd'hui ils n'existent que dans le navigateur (`missionRegistry:v1`) et dans `mission_registry.yaml`, **écrit mais
jamais relu** : un navigateur vidé les perd, un autre poste ne les voit pas. Proposition : un petit fichier
`suivi.yaml` dans le dossier de chaque mission (comme `affectations.yaml`), relu et indexé ; `mission_registry.yaml`
reste un export lisible.

## 7. Découpage par année (d'ici la fin de l'année)

- `data/cr/missions.yaml` → `data/cr/<année>.yaml` (année de la date du CR) + `data/cr/_index.json` (années présentes,
  nombre de CR, signature) ; lecture de la seule période affichée ; l'ancien fichier lu tant qu'il existe.
- Même principe pour `affectations_log.json` (`affectations_log_<année>.json`) et les disponibilités (un fichier par
  pilote et par semaine : `data/disponibilites/<TRI>/<année>-S<nn>.json`).
- Bascule faite par un outil (`tools/split_by_year.py`, aperçu puis écriture), réversible.

## 8. Étapes

1. **Correctif** : registre des CR sous verrou, relecture avant écriture, message aux autres onglets (perte de données
   possible aujourd'hui).
2. `RepositoryKit.idb` → module `shared/data_index.js` : base `defaIndex`, stores, signatures, revalidation,
   reconstruction, purge.
3. Registre des missions dans l'index (fin du quota) ; avertissement si une écriture échoue.
4. Affectations et disponibilités indexées ; Mes missions et l'ODV lisent par pilote / semaine / jour.
5. CR indexés (année, famille, mission) ; reporting par période.
6. Écriture conditionnelle + fusion par enregistrement + pierres tombales (affectations, CR, suivi des missions).
7. Découpage par année (outil + lecture), avant le 31 décembre.

Chaque étape : audit `tools/perf_audit.html` et banc `tools/perf_scale.html` avant / après, rapport régénéré.

## 9. Synchronisation : git sur le dossier, ou webservice vers un moteur central

Décision du 5 octobre : les disponibilités, les missions (et leurs affectations, leur suivi, leurs CR), les
utilisateurs et la configuration partagée forment un **pool synchronisé**, centralisé (webservice) ou décentralisé
(git). Les préférences d'affichage restent propres à chaque navigateur.

### 9.1 Une interface, deux transports

`shared/sync.js` expose `status()`, `pull()`, `push(chemins)`, `onChange(cb)` ; l'index (§ 3) s'abonne aux changements
reçus, les écritures (§ 5) appellent `push` après le fichier. Le transport se choisit dans Paramètres › Installation.

| | **Git sur le dossier** (décentralisé) | **Webservice** (centralisé) |
|---|---|---|
| Où | `data/` est un clone git ; le lanceur fait `pull` / `commit` / `push` (`/__sync/*`) | API HTTPS d'un moteur central « en face » |
| Quand | au démarrage, toutes les N minutes, après chaque écriture (commit groupé), bouton « Synchroniser » | flux des changements depuis un curseur (`GET /v1/changes?since=`), puis à chaque écriture |
| Conflit | `pull --rebase` ; fichier en conflit → fusion par enregistrement (§ 5, base = ancêtre commun git), commit de la fusion | `PUT` avec `If-Match: <ETag>` → `412` si le fichier a changé → fusion par enregistrement, nouvel essai |
| Identité | auteur du commit = trigramme de l'utilisateur connecté | jeton de session ; rôles vérifiés **par le serveur** |
| Sans lanceur | impossible (pas de git dans le navigateur) : écriture conditionnelle seule (dossier partagé Synology / OneDrive) | possible (le navigateur parle directement au serveur) |

### 9.2 Moteur central minimal

`tools/defa_server.py` (Python, bibliothèque standard) :

- **stockage** : les fichiers, rangés comme `data/` (on peut toujours repasser à git), et **SQLite** pour l'index et le
  journal des changements (un seul processus écrit : c'est là que SQLite est le bon outil) ;
- **API** : `POST /v1/login` (trigramme + mot de passe → jeton), `GET /v1/changes?since=`, `GET /v1/file/<chemin>`
  (`ETag`), `PUT` / `DELETE` (pierre tombale) avec `If-Match`, contrôle des rôles (`admin_centre` pour les écritures du
  Centre, l'utilisateur pour ses disponibilités et ses CR) ;
- **maintenance** (`/admin`, réservé `admin_centre`) : état, journal, comptes (réinitialiser un mot de passe), purge des
  pierres tombales, sauvegarde ZIP, export vers un dépôt git ; lancement `python tools/defa_server.py --data <dossier>
  --port <n>`, HTTPS derrière un proxy (Caddy, nginx) ;
- même format de fichiers que `data/` : un poste peut passer de git au webservice (et revenir) sans conversion.

### 9.4 Transport git : ce qui est fait (étape 8, décisions du 5 octobre)

- **Déclenchement** : bouton « Synchroniser (n) » de l'en-tête (`shared/sync.js`), pas d'envoi automatique ; n =
  modifications de ce poste + commits à envoyer et à recevoir (dépôt distant relu toutes les 5 minutes). Affiché quand
  la suite est servie par le lanceur et que `data/` est un dépôt git.
- **Un passage** (`tools/data_sync.py`, routes `GET /__setup/sync-status`, `POST /__setup/sync` du lanceur) : boîte
  d'envoi du navigateur écrite dans le dossier, commit des fichiers du pool (`disponibilites`, `utilisateurs`, `config`,
  `missions`, `cr`, `atc` ; sans les `_index.json` régénérés ni les copies `_conflits/`) **au nom du trigramme connecté**,
  `fetch` puis **fusion** (merge, pas de rebase : historique jamais réécrit), `push`. Compte rendu en notifications.
- **Conflits, fiche par fiche** : une fiche par fichier (semaine d'un pilote, utilisateur, mission…) → la plus récente
  (`updated_at`) l'emporte, l'autre est gardée dans `<dossier>/_conflits/<nom>.<locale|distante>.<date>` (non
  synchronisé) et signalée ; `missions/affectations.json` fusionné par affectation (mission, pilote, rôle) à trois
  versions ; `missions/affectations_log.json` (journal en ajout seul) réuni. Échec au milieu d'une fusion : fusion
  annulée, dépôt jamais laissé à moitié fusionné.
- **Limite connue** : `cr/missions.yaml` regroupe tous les CR — en conflit, la plus récente l'emporte et l'autre est
  gardée dans `_conflits/` (à fusionner à la main) ; le découpage par année (étape 7) réduira ces conflits.
- **Essais** : `python tools/data_sync.py --essai` (dépôt distant et deux copies temporaires : modifications croisées,
  conflit, fusion, réception) ; `python tools/launch.py --port 8774 --data <copie>` sert une copie de `data/` pour
  essayer le bouton sans toucher au vrai dépôt.

### 9.3 Étapes (après le § 8)

8. `shared/sync.js`, transport git (routes `/__sync/*` du lanceur), bouton et état dans l'en-tête.
9. Moteur central minimal : API, SQLite, comptes ; transport webservice ; page `/admin`.
10. Mode `production` : connexion exigée pour les missions et le Centre, vérification par le serveur.

## 10. Avancement (branche `feature/index-idb`)

| Étape | État |
|---|---|
| 1. Registre des CR sous verrou, fusion par CR, onglets prévenus | fait (`a33c7f84`, course corrigée `c1ffb070`) |
| 2. `shared/data_index.js` (base `defaIndex`) | fait (`72be400c`) |
| 3. Registre des missions dans l'index (fin du quota), copie de compatibilité < 2 Mo | fait (`72be400c`, `ec676adb`) |
| 4. Affectations et disponibilités indexées | fait : déclarations (semaines et anciens fichiers) et fiches utilisateurs lues par signature (§ 3.1) — ODV, 2e ouverture : 11 requêtes au lieu de 114, données à 1,6 s au lieu de 7,2 s ; affectations : un seul fichier (≈ 23 Ko, ≈ 40 ms), pas indexé (rien à gagner) |
| 5. CR indexés, relus seulement si un fichier a changé (signature, 304) | fait (`c1ffb070`) |
| 6. Suivi des missions dans `suivi.yaml` (fusion champ par champ) | fait (`eabd0a6f`) ; affectations : remplacement par mission sous verrou (existant) |
| 7. Découpage par année | à faire avant le 31 décembre |
| 8. Synchronisation git par le lanceur | fait (§ 9.4) : bouton « Synchroniser » de l'en-tête, auteur = trigramme connecté, fusion fiche par fiche ; essais sur des copies (`python tools/data_sync.py --essai`, lanceur `--data <copie>`) |
| 9. Moteur central minimal et transport webservice | à faire |
| 10. Mode `production` | à faire |
