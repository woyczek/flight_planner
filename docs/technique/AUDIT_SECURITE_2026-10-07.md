# Audit de sécurité — 7 octobre 2026

Suite de l'[audit du 2 octobre](AUDIT_SECURITE_2026-10-02.md). Quatre questions :

1. quelles failles peuvent faire **sortir des données** (évasion) ;
2. quelle est la **surface d'attaque locale** (ce qui écoute ou s'exécute sur le poste d'un pilote) ;
3. comment éviter que la suite fasse du poste un **zombie** (code étranger exécuté, poste piloté de l'extérieur) ;
4. comment préparer un **mode client/serveur**, avec les données nominatives derrière un webservice authentifié.

Périmètre : `develop` au commit `e230773a` (pages `apps/`, scripts `shared/`, lanceur `tools/launch.py`,
synchronisation `tools/data_sync.py`, mise à jour `tools/update_suite.py` et `shared/suite_update.js`, `lancer.cmd` /
`lancer.sh`). Méthode : lecture du code, traces des sources non fiables jusqu'aux points d'insertion HTML, essais du
lanceur sur un jeu d'essai (requêtes forgées, page hostile servie depuis une autre origine). Aucune donnée réelle lue.

## Synthèse

Le lanceur et les outils Python sont sains sur les points classiques : écoute sur la boucle locale seulement,
contrôle de l'en-tête `Host` (DNS rebinding), interface `/__setup/` fermée aux autres sites, aucune commande shell,
aucun `eval`, TLS jamais désactivé, Python installé par winget sans élévation.

Le risque principal est ailleurs. **Les données partagées sont du code**. `data_tree.js`, `references/*.js` et
`cr/mission_ledger_defaults.js` sont chargés par `<script>`. Ces scripts tournent dans l'origine de la suite, qui :

- lit tous les secrets du navigateur et du dossier `secrets/` ;
- appelle toute l'interface du lanceur ;
- garde des autorisations d'écriture sur le dossier de l'application et sur celui de X-Plane.

Quiconque peut écrire dans le dépôt de données peut donc lire tout ce que voit un pilote, et finir par exécuter du
code natif sur son poste. Ce peut être un membre, un compte framagit volé, une archive « reçue par mail » ou une faille
XSS chez un pilote qui synchronise.

S'y ajoute une fuite directe, **prouvée** : n'importe quel site web visité pendant que la suite tourne peut lire les
fichiers `data/*.js` par simple `<script src>`.

| # | Gravité | Constat | Axe |
|---|---|---|---|
| [C1](#c1) | Critique | Données du dépôt exécutées comme JavaScript dans l'origine de la suite | évasion, zombie |
| [C2](#c2) | Critique | Fichiers `data/*.js` lisibles par n'importe quel site web (inclusion de script entre sites) — **prouvé** | évasion |
| [C3](#c3) | Critique | Archive de données : `.git/` extrait tel quel → commande lancée par git (`core.fsmonitor`) | zombie |
| [E1](#e1) | Élevé | `secrets/`, `.git/`, listes de dossiers servis en clair — **prouvé** | évasion |
| [E2](#e2) | Élevé | `/__setup/downloads` : motif libre → tout le dossier Téléchargements — **prouvé** | évasion |
| [E3](#e3) | Élevé | Dépôt distant de `data/` modifiable par la page, puis « Synchroniser » pousse tout | évasion |
| [E4](#e4) | Élevé | Poignées de dossiers en écriture sur la racine de l'application et sur X-Plane | zombie |
| [E5](#e5) | Élevé | Version distante injectée sans échappement dans l'en-tête de chaque page | zombie |
| [E6](#e6) | Élevé | Mises à jour de la suite sans signature | zombie |
| [E7](#e7) | Élevé | Comptes : empreintes et rôles dans le dépôt partagé, droits vérifiés par les pages seules | évasion |
| [M1](#m1) | Moyen | XSS : couleur de catégorie et statut de mission (dépôt partagé), profil de performance (SimBrief, `.lnmperf`), aide (`?doc=` externe et liens `javascript:`) | évasion |
| [M2](#m2) | Moyen | Pas de CSP, pas de protection contre l'encadrement | évasion |
| [M3](#m3) | Moyen | Origine `127.0.0.1:8000` partagée avec tout autre serveur local | évasion, zombie |
| [M4](#m4) | Moyen | Code tiers : pdf.js depuis jsDelivr sans intégrité, js-yaml 4.1.0, jsPDF 2.5.2 | zombie |
| [M5](#m5) | Moyen | Exécutables cherchés dans le dossier courant (`lancer.cmd`, `git`) | zombie |
| [M6](#m6) | Moyen | Secrets en clair (fichiers, localStorage), identifiants possibles dans l'adresse du dépôt | évasion |
| [F](#faible) | Faible | SSH `accept-new`, `--` manquant devant les adresses, `git lfs install` global, aide en `postMessage('*')`… | — |

## Qui attaque

| Attaquant | Ce qu'il contrôle | Constats qui le servent |
|---|---|---|
| **Site web quelconque** visité pendant que la suite tourne | des requêtes de son navigateur vers `127.0.0.1:<port>` | C2, M2 (encadrement), M3 |
| **Membre du dépôt de données** (ou son compte framagit volé) | le contenu de `data/` chez tous les pilotes, à la prochaine synchronisation ou au prochain lancement (`git pull`) | C1, M1, E7 → E1, E2, E3, E4 |
| **Utilisateur d'IVAO ou VATSIM** (n'importe qui) | indicatifs, remarques, textes des flux publics affichés par la suite | aucun : flux écrits en `textContent` ou validés ([annexe C](#annexe-c--inventaire-des-insertions-html)) |
| **Auteur d'un profil partagé** (appareil SimBrief, profil Little Navmap) | nom, indicatif, commentaires du profil collé ou importé | M1 (planificateur de performances) |
| **Compte mainteneur framagit** volé | le code de la suite, le `repository_tree` lu par le contrôle de mise à jour | E5, E6 |
| **Pièce jointe** (archive de données par mail) | le contenu extrait dans `data/` | C3, C1 |
| **Autre programme du poste** | n'importe quel port de la boucle locale | M3, M5 |

Une fois qu'un script tourne dans l'origine de la suite (C1, C3, E5, M1 ou une XSS), tout le reste suit :

- il lit le localStorage, l'IndexedDB, `/secrets/` et Téléchargements ;
- il change le dépôt distant et pousse ;
- il réécrit les fichiers de l'application ;
- il envoie le tout où il veut, faute de CSP.

**Corriger les points d'entrée ne suffit pas, il faut aussi réduire ce que l'origine a le droit de faire.**

## 1. Évasion de données

### <a id="c2"></a>C2 — Inclusion de script entre sites (prouvé)

Le lanceur sert tout fichier à quiconque envoie `Host: 127.0.0.1:<port>`. C'est le cas de **toute page web** qui
charge `<script src="http://127.0.0.1:8000/data/references/defa_reference.js">`. La protection `Host` du 2 octobre
vise le DNS rebinding, pas ce cas.

Les fichiers de données déclarent des variables globales (`window.DATA_TREE`, `window.DEFA_REFERENCE`,
`window.DEFA_FLEET`, `window.MISSION_CALLSIGNS`), que la page hostile lit ensuite.

**Essai** : suite sur le port 8790 (jeu d'essai), page hostile servie depuis `localhost:8791`. La page a lu
`DATA_TREE` (organisation des données), `DEFA_REFERENCE` (trigrammes, premiers et derniers vols, nombre de vols, types)
et `REPOSITORY_TREE` (configuration, adresses des dépôts). Les JSON restent illisibles : sans en-tête CORS, `fetch` est
bloqué.

Le port est prévisible (8000, puis 8001…). Le filtre « accès au réseau local » des Chrome récents peut demander une
autorisation, mais ni tous les navigateurs ni tous les profils ne l'appliquent.

**Correction (lanceur, quelques lignes)** : refuser toute requête dont `Sec-Fetch-Site` vaut `cross-site` ou
`same-site`. Seuls `same-origin` et `none` (adresse tapée, favori, ouverture par le lanceur) passent. Tous les
navigateurs pris en charge envoient ces en-têtes.

Les navigations venues d'un autre site sont refusées aussi. Aucun usage n'en a besoin, et elles ouvrent la porte aux
liens piégés. Exemple : l'aide accepte un document externe (`aide.html?doc=https://…`, annexe C).

### <a id="e1"></a>E1 — `secrets/`, `.git/` et listes de dossiers servis (prouvé)

Le serveur statique sert toute la racine de la suite (`launch.py:376`), avec les listes de dossiers de
`SimpleHTTPRequestHandler`.

**Essai** : `GET /secrets/ivao.json` a rendu la clé IVAO en clair, et `GET /secrets/` en a listé le contenu. Le code
(`launch.py:630`) dit pourtant « jamais relus par la page » ; la route `/__setup/secrets` respecte ce principe (4 derniers
caractères seulement), le serveur statique le contourne.

Sont servis de la même façon :

- `secrets/users/<TRI>.json` (clientSecret IVAO de chaque utilisateur) ;
- `/.git/` et `/data/.git/` (historique complet, `config` avec l'adresse du dépôt, et un éventuel jeton si l'adresse en
  contient un, voir M6) ;
- `data/local/defa_local_store.yaml` (instantané du localStorage) ;
- `tools/.defa_site.json`.

C'est réservé à la même origine (pas de CORS), mais tout script de la suite y a accès.

**Correction** :

- 403 sur `/secrets/`, tout chemin dont un segment commence par un point (`.git`, `.defa_site.json`…), et `data/local/` ;
- plus de listes de dossiers (`list_directory` → 404) ;
- `.git/` : seul `HEAD` (numéro de commit du pied de page) peut être donné par une route dédiée.

### <a id="e2"></a>E2 — Téléchargements lisibles par motif (prouvé)

`/__setup/downloads?glob=…` accepte tout motif de 3 à 80 caractères contenant `*`.

**Essai** : `*.*` a rendu la liste du dossier Téléchargements de l'utilisateur, et `&name=` rend n'importe lequel de
ces fichiers. Tout script de la suite peut donc lire tout le dossier Téléchargements.

**Correction** : liste fermée côté lanceur des motifs utiles (sources aéronautiques déclarées dans `aero_sources.js`).
La page envoie un identifiant de source, plus un motif.

### <a id="e3"></a>E3 — Changement du dépôt distant, puis envoi

Deux routes s'enchaînent :

- `POST /__setup/sync-remote {url, save: true}` remplace l'adresse du dépôt distant de `data/` (`data_sync.set_remote`) ;
  `REMOTE_RE` accepte toute adresse `https://` ou SSH ;
- `POST /__setup/sync` pousse ensuite tout l'historique du pool : fiches utilisateurs avec empreintes, dispos, CR, ODV,
  affectations.

Aucune requête sortante n'est visible côté page : c'est git qui envoie.

**Correction** :

- changer de dépôt distant seulement depuis la console du lanceur (confirmation tapée), ou vers un hôte d'une liste
  fixée dans `config/repository_tree` (framagit.org) ;
- à la synchronisation, refuser de pousser vers un hôte qui n'est pas celui du clone d'origine.

### <a id="e7"></a>E7 — Comptes et rôles dans le dépôt partagé

`data/utilisateurs/<TRI>.json` contient :

- le **rôle** ;
- l'**empreinte du mot de passe** (PBKDF2-SHA256, 310 000 itérations, salée : correct en soi).

Ces fiches sont synchronisées chez tous les membres. Il en découle :

- chacun peut tenter de casser les mots de passe des autres hors ligne, dangereux s'ils sont réutilisés ailleurs ;
- chacun peut s'attribuer `admin_centre` en éditant sa fiche ;
- la session (`suiteSession:v1`) se forge dans le localStorage.

La limite est connue et documentée (`users.js:13`, manuel administrateur, feuille de route étape 3). Elle n'est
corrigeable que par un serveur (§ 4).

**D'ici là**, dire clairement aux pilotes que ce mot de passe ne protège rien et ne doit être réutilisé nulle part.

### Autres voies de sortie

- **CR envoyés à un webservice configurable** (`mission_core/core.js:1255-1297`) : CR complet, identifiants IVAO et
  VATSIM, jeton Bearer. L'adresse est un réglage du localStorage : un script injecté peut la détourner sans bruit.
- **Fournisseurs tiers** : ils reçoivent des identifiants ou des zones géographiques, ce qui est attendu mais à
  connaître ([annexe A](#annexe-a--hôtes-contactés)). Rien n'est envoyé à des services d'analyse d'audience ni de
  traduction : la traduction automatique utilise l'API intégrée au navigateur.

## 2. Surface d'attaque locale

### Ce qui écoute

Un seul programme écoute : le lanceur (`tools/launch.py`).

| Élément | État |
|---|---|
| Adresses | `127.0.0.1` et `::1` seulement, premier port libre à partir de 8000 : pas joignable depuis le réseau local |
| `Host` | exigé local sur GET, HEAD, POST (DNS rebinding) ✔ |
| `/__setup/*` | en-tête `X-SOG-Setup` exigé ; pas de réponse à `OPTIONS` → aucune autre origine ne peut l'envoyer ✔ |
| Fichiers statiques | **toute la racine**, listes de dossiers comprises (E1), lisibles par inclusion de script depuis tout site (C2) |
| Taille des envois | 512 Mo au plus ✔ (lus en mémoire : saturation possible par un script de la suite, sans gravité) |
| En-têtes | `nosniff`, `Cache-Control` ; **ni CSP, ni `frame-ancestors`** (M2) |
| Authentification | aucune : la boucle locale suffit. Tout programme du poste (autre utilisateur Windows, outil, extension) peut appeler `/__setup/*` en ajoutant l'en-tête |

### Ce que l'interface du lanceur permet

L'interface compte 21 routes, listées en [annexe B](#annexe-b--routes-du-lanceur). Les routes sensibles, pour un
script qui tourne dans l'origine de la suite :

| Route | Effet | Garde actuelle |
|---|---|---|
| `GET /__setup/downloads` | lire le dossier Téléchargements | motif libre (E2) |
| `GET /secrets/…` (statique) | lire les secrets | aucune (E1) |
| `POST /__setup/sync-remote` + `/sync` | envoyer tout `data/` ailleurs | aucune (E3) |
| `POST /__setup/clone` | cloner un dépôt choisi dans `data/` (si vide) | adresse validée par `REMOTE_RE` |
| `POST /__setup/upload?kind=data` | extraire une archive dans `data/` (si vide) | chemins sortants refusés, `.git/` accepté (C3) |
| `POST /__setup/aircraft-db`, `aero-fetch`, `defa-site` | lancer des scripts Python à paramètres filtrés | ✔ (listes de codes, pas de shell) |
| `POST /__setup/secrets` | écrire les secrets | champs en liste fermée ✔ |

### Ce que le navigateur a le droit de faire

C'est la partie la plus large de la surface. Avec les autorisations de dossiers (File System Access API, poignées
gardées dans IndexedDB `missionCore/handles`), l'origine `http://127.0.0.1:8000` peut écrire dans :

- `__repo` : racine de l'application (`file_access.js:18-22`, mode `readwrite` par défaut `:340`) ;
- `__data`, `__ledger`, `__missions` : les données, ce qui est attendu ;
- `__xplane`, `__xpnav` : dossier X-Plane (`maintenance_page.js:158,492`) ;
- `__store` : sauvegarde locale, par défaut à la racine (`file_access.js:332-335`).

Voir E4 pour les conséquences.

### Fichiers lus et exécutés au démarrage

`lancer.cmd` → Python → `launch.py` :

- `git pull --ff-only` de `data/` à chaque lancement ;
- extraction de toute `*.zip` de la racine qui contient `data_tree.js` (si `data/` manque) ;
- `git lfs install` (configuration git globale modifiée, sans gravité).

## 3. Ne pas devenir un zombie

Un poste devient zombie quand du code étranger s'y exécute et y reste. Cinq chemins y mènent aujourd'hui, du plus au
moins probable.

### <a id="c1"></a>C1 — Les données sont du code

- **Mécanisme** : `shared/data_files.js:31,35` écrit des `<script src="data/…">` (`data_tree.js` sur toutes les pages,
  `callsigns.js` sur 42, `aircraft_fleet.js` sur 31, `defa_reference.js` sur 28). `mission_reporting_config.js:9-12`
  charge `data/cr/mission_ledger_defaults.js`.
- **Propagation** : ces fichiers arrivent par `git pull` au lancement ou par « Synchroniser ». `cr/` et `config/` font
  partie du pool poussé par chaque pilote (`data_sync.py:22`) : une XSS chez un pilote peut réécrire
  `cr/mission_ledger_defaults.js` et le propager à tous. C'est un ver.
- **Accès obtenus** : le script lit les secrets du navigateur, appelle `/__setup/*` et, par les poignées de dossiers
  déjà accordées (E4), réécrit `tools/launch.py` ou `lancer.cmd`. Il peut aussi déposer un greffon `.xpl` (une DLL)
  dans X-Plane. Au prochain double-clic ou au prochain vol, c'est du code natif.
- **Correction de fond** : plus aucun fichier de données exécutable. Les pages lisent du JSON (`fetch` puis
  `JSON.parse`). Le chargement synchrone actuel (`document.write`) devient une promesse attendue avant le rendu, ce qui
  touche une quarantaine de pages : chantier à part entière.
- **Correction immédiate**, sans toucher aux pages :
  - le lanceur ne sert un `data/**/*.js` que s'il suit le gabarit de `AircraftDB/datafile.py` : commentaires,
    `let data = <JSON>;`, puis des exports `window.NOM = data.clé;` en liste fermée. Sinon, 403 et alerte dans la
    console ;
  - `data_sync.py` refuse de committer ou de fusionner un `.js` hors gabarit.
- **Côté framagit** : branche protégée sur le dépôt de données, revue obligatoire des `.js`.

### <a id="c3"></a>C3 — Archive « reçue par mail »

- **Mécanisme** : `extract_data` (`launch.py:74-96`) refuse bien les chemins sortants, mais extrait `.git/` tel quel.
  Une archive piégée peut donc contenir un `.git/config` avec `core.fsmonitor = <commande>` ou un `core.hooksPath`.
  La commande part au premier `git status`, appelé par chaque page (`/__setup/sync-status`), puis à chaque `git pull`
  au lancement.
- **Sans `.git/`**, l'archive reproduit C1.
- **Correction** :
  - ne rien extraire sous un segment `.git` ;
  - liste blanche d'extensions (`.json`, `.yaml`, `.md`, `.csv`, `.xml`, `.js` au gabarit) ;
  - durcir chaque commande git de la suite avec `-c core.fsmonitor=false -c core.hooksPath=<dossier vide>
    -c protocol.ext.allow=never -c protocol.file.allow=user -c submodule.recurse=false` ;
  - à terme, empreinte SHA-256 de l'archive annoncée par un autre canal.

### <a id="e4"></a>E4 — Poignées de dossiers en écriture trop larges

- **Mécanisme** : la suite ne demande pas l'écriture au moment où elle en a besoin : elle demande la racine de
  l'application et X-Plane en `readwrite` une fois pour toutes.
- **Risque** : si Chrome garde l'autorisation (« Autoriser à chaque visite »), un script injecté n'a besoin d'aucun geste
  de l'utilisateur pour réécrire le code. Ce point n'a pas été essayé en navigateur.
- **Correction** :
  - `__repo`, `__xplane`, `__xpnav` en `read` ;
  - écriture réservée à `data/` ;
  - pour les rares écritures ailleurs (CSS de textures, `save_textures`…), demande ponctuelle au clic.

### <a id="e5"></a>E5 — XSS par le contrôle de mise à jour

- **Mécanisme** : `suite_update.js:108` lit `version: "([^"]+)"` dans le `repository_tree` distant. `:401` l'insère
  sans échappement dans l'en-tête de chaque page (attribut `title` et texte). Il est mémorisé dans le localStorage,
  donc réaffiché même hors ligne.
- **Portée** : un compte framagit volé atteint tous les postes qui regardent les mises à jour, **sans qu'ils mettent à
  jour**, installations par archive comprises. L'adresse source peut aussi être changée (`suiteRepo`, `:27-34`).
- **Correction** : valider `^\d+\.\d+\.\d+(-[\w.]+)?$` à la lecture, et `esc()` à l'affichage.

### <a id="e6"></a>E6 — Mises à jour sans signature

- **Mécanisme** : `update_suite.py:150` fait `merge --ff-only origin/<canal>`, sans `verify-tag`. L'empreinte SHA-256 de
  `publish_dist.py` est publiée dans le même dépôt, donc elle ne prouve rien.
- **Point positif** : la mise à jour est manuelle, aucune route ne la lance.
- **Correction** :
  - tags signés (clé SSH ou GPG des mainteneurs, épinglée dans la suite) ;
  - `git verify-tag` avant fusion ;
  - mise à jour vers un tag, pas vers une branche ;
  - double authentification exigée sur framagit pour les mainteneurs et pour le dépôt de données.

### <a id="m5"></a>M5 — Exécutables pris dans le dossier courant

- **Mécanisme** :
  - sous Windows, `cmd` cherche `py`, `python` dans le dossier courant avant le `PATH` (`lancer.cmd:10-12`) ;
  - `data_sync.py` appelle `git` sans chemin ;
  - un `git.exe` ou un `py.cmd` déposé à la racine (archive, C1 via `__repo`) serait exécuté.
- **Correction** :
  - `set NoDefaultCurrentDirectoryInExePath=1` en tête de `lancer.cmd` ;
  - `git` résolu une fois par `shutil.which` après avoir retiré la racine du `PATH`, puis appelé par son chemin
    absolu.

### <a id="m4"></a>M4 — Code tiers

| Bibliothèque | Où | Problème | Correction |
|---|---|---|---|
| pdf.js 4.10.38 | `maintenance_page.js:1984,2015` | `import()` depuis jsDelivr : pas de contrôle d'intégrité possible, code exécuté dans l'origine | livrer pdf.js dans `shared/vendor/` |
| js-yaml 4.1.0 | `shared/mission_core/vendor/` | pollution de prototype par la clé de fusion `<<`, corrigée en 4.1.1 (avis de novembre 2025) ; lit le YAML du dépôt partagé | passer en 4.1.1 |
| jsPDF 2.5.2 | `apps/cpco/jspdf.umd.min.js` | dénis de service corrigés en 3.0.x ; ne traite que des données locales | mise à jour à l'occasion |
| acorn (cdnjs, sans SRI) | `tools/verify_format.html` | outil de développement seulement | SRI ou copie locale |
| `airports.json` (GitHub, branche `master`) | `mission_core/assist.js:162` | données seulement ; noms d'aérodromes à échapper à l'affichage | épingler un commit |

### Hygiène anti-zombie — la règle du projet

1. **Ne jamais exécuter de données.** Un fichier qui vient d'un autre poste est du JSON, du YAML ou du texte, pas un
   script.
2. **Le moins de droits possible pour l'origine** : écriture sur `data/` seulement, le reste en lecture ; une CSP qui
   ferme les sorties.
3. **Ne rien servir qui ne serve à rien** : pas de `secrets/`, pas de `.git/`, pas de listes de dossiers, rien pour les
   autres sites.
4. **Git en défiance** : options de durcissement sur chaque appel, `--` devant les adresses, pas d'identifiants dans
   les adresses, `.git/` jamais reçu d'une archive.
5. **Mises à jour vérifiables** : tags signés, vérifiés avant fusion.
6. **Échapper tout ce qui vient d'ailleurs** (dépôt partagé, réseaux, framagit, CDN) avant `innerHTML`, y compris dans
   les attributs `style` et `class`.
7. **Côté pilote** :
   - Chrome ou Edge à jour ;
   - Git à jour ;
   - ne pas faire tourner d'autre serveur sur le port de la suite ;
   - ne pas accorder « Autoriser à chaque visite » sur la racine.

## 4. Mode client/serveur

La feuille de route (étape 2, [ROADMAP.md](ROADMAP.md#étape-2--le-serveur-web-minimal--moteur-central-)) prévoit déjà un
« moteur central » (`tools/defa_server.py`, SQLite, HTTPS derrière Caddy, `GET/PUT /v1/file/<chemin>` avec ETag et
If-Match, `/v1/changes`). Ce qui suit en reprend le cadre et fixe les exigences de sécurité que l'audit fait apparaître.

### 4.1 Ce qui part derrière le serveur

| Classe | Contenu | Où aujourd'hui | Mode serveur |
|---|---|---|---|
| **Référence** (public) | SIA, zones aéro, MORA, catalogue des types, modèles de missions, catégories de dispos | `data/sia`, `AircraftDB`, `examples/`, `data/config/disponibilites.json` | peut rester locale ou être servie sans connexion |
| **Nominatif** | fiches utilisateurs, identifiants IVAO/VATSIM/SimBrief, dispos, affectations, ODV (personnel, équipes), sessions ATC, CR (équipage, remarques), positions des appareils, journal et référence DEFA, appareils personnels, missions générées (auteur, équipes) | `data/utilisateurs`, `disponibilites`, `missions`, `odv`, `atc`, `cr`, `references/defa_reference.js`, `aircraft_personal.js` ; localStorage `missionReportingConfig:v1`, `defaFlightLog:v1` | **serveur seulement**, filtré par droits |
| **Secrets** | empreintes des mots de passe, clé IVAO de la suite, secrets IVAO des utilisateurs, clé d'envoi des CR, identifiants du site DEFA, identifiants git | `data/utilisateurs/*.json` (empreintes), `secrets/`, localStorage | empreintes et clés de la suite : serveur, jamais transmises ; secrets d'un utilisateur : son poste (trousseau du système) |

### 4.2 Point de bascule dans le code

Le bon point existe déjà : `MissionAssignments.store` / `readData` / `writeData` (`shared/assignments.js:61,235,278`).
Lecture conditionnelle, signature `updated_at`, écriture par File System Access ou boîte d'envoi. Y passent
`users.js`, `dispos.js`, `odv_orders_store.js`, `atc_sessions.js`, `aircraft_positions.js`, `odv_airspace.js`.

Remplacer `store.read` par `GET /v1/file/<rel>` (ETag) et `writeFile` par `PUT` (If-Match) suffit pour tout ce
périmètre.

**À faire converger avant** : les écritures directes hors de ce point.

- affectations : `assignments.js:1659,1779,1836` ;
- registre des CR : `mission_core/ledger.js:226,241,547,565` ;
- registre des missions : `mission_registry.js:173,207,430,631` ;
- fichiers de référence : `data_admin.js:137`.

**Et deux préalables de format** :

- **fin des `.js` de données** (C1) : un serveur ne doit jamais servir du code produit par ses utilisateurs ;
- **CR découpés** (par CR, au moins par année : déjà prévu avant le 31 décembre) : le serveur ne peut pas appliquer de
  droit « ce CR est le mien » sur un registre unique `cr/missions.yaml`.

### 4.3 Où vit le jeton de session

C'est la décision qui conditionne le reste, car la suite est servie par `127.0.0.1` et le serveur serait sur un autre
domaine.

| Option | Principe | Pour | Contre |
|---|---|---|---|
| **A. Le lanceur relaie** (recommandé pour commencer) | la page parle au lanceur (`/__setup/api/…`), le lanceur parle au serveur avec le jeton, gardé dans le trousseau du système | jeton jamais dans le navigateur, même modèle que les clés IVAO aujourd'hui ; pas de CORS, pas de cookie tiers ; la page garde son origine locale | le lanceur reste nécessaire ; il faut d'abord fermer C2, E1 et E3 (le lanceur devient le gardien) |
| **B. Le serveur sert aussi la suite** | `https://suite.sog…/` sert pages et API, même origine | cookie de session `HttpOnly; Secure; SameSite=Strict`, CSP stricte, pas de lanceur | plus d'accès aux dossiers locaux (X-Plane, Téléchargements, SIA) sans lanceur ; deux modes à maintenir |
| C. Jeton Bearer dans le localStorage, appel direct | la page appelle le serveur (CORS) | simple | tout script injecté lit le jeton : c'est exactement ce que l'audit cherche à éviter |

Recommandation : **A** d'abord, puis **B** si un usage « sans installation » est voulu. **C** est à écarter.

### 4.4 Exigences pour le serveur

- **Comptes** :
  - empreintes `scrypt` (bibliothèque standard Python, `hashlib.scrypt`) ou PBKDF2 ≥ 600 000 itérations, côté serveur
    seulement ;
  - **réinitialisation de tous les mots de passe à la bascule**, puisque les empreintes actuelles ont circulé chez tous
    les membres ;
  - limitation des essais (par compte et par adresse), verrouillage temporaire.
- **Sessions** :
  - jeton d'accès court (15 min) et jeton de renouvellement révocable, par appareil ;
  - déconnexion = révocation ;
  - usurpation par un admin tracée et signalée à l'utilisateur.
- **Droits par ressource**, vérifiés par le serveur sur le chemin du fichier. Matrice de départ ; `L` = lire,
  `E` = écrire.

  | Ressource | Pilote (soi) | Pilote (autres) | Centre | Admin |
  |---|---|---|---|---|
  | Fiche utilisateur | L, E (sauf rôle et actif) | L : trigramme et nom | L | L, E, réinitialisation |
  | Disponibilités | L, E | — (ou créneaux communs agrégés) | L | L |
  | Affectations | L (les siennes), marquer lu | L : équipage de ses missions | L, E | L, E |
  | ODV, ATC, activations | L | L | L, E | L, E |
  | CR | L, E (rédacteur = soi) | L s'il est dans l'équipage | L, statut | L, E |
  | Journal et référence DEFA | — | — | L | L, E |
  | Missions (générateur, registre) | L (affectées) | — | L, E | L, E |
  | Configuration, utilisateurs, catégories | — | — | L | L, E |

- **Le serveur filtre ce qu'il envoie** : une page ne reçoit jamais ce qu'elle n'a pas le droit de voir. L'index des
  utilisateurs ne porte ni empreinte ni rôle d'un autre.
- **Écritures validées** :
  - schéma par type de fichier, taille bornée ;
  - texte seulement : refus de tout contenu exécutable ;
  - champs `by` et `updated_at` posés par le serveur, pas par la page.
- **Journal** (SQLite) : qui a lu ou écrit quoi, quand ; consultable par l'admin ; conservation limitée.
- **Transport** : HTTPS seulement (HSTS), Caddy ou nginx devant ; serveur Python sur la boucle locale de sa machine.
- **Secrets de la suite** (clé IVAO) : sur le serveur, qui relaie les appels IVAO comme le lanceur aujourd'hui.
- **Cache du navigateur** : IndexedDB `defaIndex` et la boîte d'envoi contiennent des données nominatives ; à vider à la
  déconnexion.
- **Données personnelles (RGPD)** : une association qui garde noms, identifiants et activité de ses membres doit
  pouvoir dire quoi, pourquoi et combien de temps.
  - Registre des traitements, durée de conservation (CR, journal, dispos passées), droit d'accès et d'effacement.
  - L'export git prévu par la feuille de route recopie tout : à réserver à l'admin, chiffré, ou pseudonymisé.

### 4.5 Étapes proposées

1. **Prérequis côté suite** (utiles même sans serveur) : C1 (données en JSON), CR découpés, écritures convergées vers
   `readData` / `writeData`.
2. **Serveur en lecture seule** : comptes, sessions, `GET /v1/file` filtré par droits, relais par le lanceur (option A).
   La synchronisation git continue pour l'écriture.
3. **Écriture par le serveur** : `PUT` avec If-Match, `/v1/changes`, fin de git pour le pool nominatif (export admin
   seulement).
4. **Bascule** : réinitialisation des mots de passe, retrait des empreintes et des fichiers nominatifs du dépôt git.
   L'historique git en garde une copie : nouveau dépôt, ou réécriture de l'historique et rotation de tout ce qui y a
   figuré.

## <a id="faible"></a>Constats moyens et faibles restants

- **<a id="m1"></a>M1 — XSS par données synchronisées** (traces vérifiées) :
  - **Couleur de catégorie** : `data/config/disponibilites.json` › `categories[].couleur` →
    `dispos.color()` (`dispos.js:346`) → `RepositoryNav.chartColor()`, qui rend la valeur telle quelle si ce n'est pas
    une couleur → `style="--c:${…}"` (`dispos_editor.js:62,242`) → `innerHTML`.
    - Charge : `"couleur": "red\"><img src=x onerror=…>"`.
    - Touche tout pilote qui ouvre ses disponibilités.
    - Correction : n'accepter que `^#[0-9a-f]{3,8}$` dans `dispos.color()`.
  - **Statut de mission** : `data/missions/<dossier>/suivi.yaml` › `status` → `pill(level, …)`
    (`mission_registry.js:1041`, `class="rg-pill rg-${level}"` non échappé), via `:1235` et `:1356`. Pages du Centre.
    - Correction : `esc(level)`, ou classe fixe si le statut n'est pas dans `STATUS`.
  - **Carte du profil de performance** (`apps/planner/flight_performance_planner.html:1673`) :
    - Sources : `name`, `callsign`, `registration`, `simbriefAirframeId` du profil actif. Elles viennent d'un appareil
      SimBrief partagé (`airframe_name`, `airframe_comments`, `callsign`, `registration`, collés par lien, `:2598`),
      d'un OFP (`:2622`), d'un `.lnmperf` (`<Name>`, `:2524`) ou d'un JSON ou CSV importé.
    - Le profil est mémorisé : la charge se rejoue à chaque ouverture de la page.
    - Même défaut en `:3036` (`ofpTimestamp`, `airframeId`) et `:2810` (identifiant tapé, sans conséquence).
    - Correction : `esc(x[1])`.
  - **Aide** (`apps/aide/aide.js:79,88-94`, `markdown.js:30-33`) :
    - `aide.html?doc=https://…` charge un document d'un autre site (si celui-ci répond avec CORS) ;
    - `link()` laisse passer `javascript:` (`new URL(href).href`), et un clic exécute le lien dans l'origine de la suite
      (`:220`, `window.top.location.href` dans la fenêtre d'aide).
    - Il suffit d'un lien envoyé au pilote et d'un clic.
    - Correction : `doc` limité aux chemins relatifs `.md` de `docs/` ; `link()` limité à `http(s)`, `mailto`, `#` et
      `?doc=` ; refus des navigations entre sites (C2).
  - **Altitude densité** (`mission_extensions.js:261`) : champ tapé ou rechargé d'un CSV d'archive, non échappé. Faible.
  - Le reste de l'inventaire est en [annexe C](#annexe-c--inventaire-des-insertions-html).
- **<a id="m2"></a>M2 — Ni CSP ni protection contre l'encadrement.**
  - Une CSP envoyée par le lanceur limiterait la sortie des données même avec des scripts en ligne :
    `connect-src 'self'` plus les hôtes de l'annexe A, `form-action 'self'`, `base-uri 'self'`,
    `frame-ancestors 'self'`.
  - `script-src 'self'` viendra quand les scripts en ligne seront sortis (et C1 fait).
  - Sans `frame-ancestors`, un site peut encadrer la suite et faire cliquer « Synchroniser » à l'insu du pilote.
- **<a id="m3"></a>M3 — Origine partagée.**
  - Tout serveur lancé plus tard sur `127.0.0.1:8000` (`python -m http.server`, outil de développement) hérite du
    localStorage, de l'IndexedDB et des poignées de dossiers de la suite.
  - Correction : nom d'hôte propre, par exemple `sog.localhost:<port>`. Les navigateurs le résolvent vers la boucle
    locale ; à ajouter dans `_local_host`. Sinon, port fixe peu courant.
- **<a id="m6"></a>M6 — Secrets en clair.**
  - `secrets/*.json` (JSON clair, copié avec le dossier : Synology, « DEFA - Copy ») ; une source de sauvegarde posée
    sur la racine l'emporte aussi (`maintenance_page.js:129` n'exclut pas `secrets/`).
  - localStorage : `missionSendKey:v1`, profil réseau.
  - `REMOTE_RE` accepte `https://utilisateur:jeton@…`, qui finit dans `data/.git/config` (servi, E1).
  - `INSTALL.md` propose le **mot de passe** framagit plutôt qu'un jeton limité au projet.
  - Corrections :
    - trousseau du système (DPAPI sous Windows) ou dossier hors de la racine servie ;
    - refuser les identifiants dans l'adresse ;
    - recommander un jeton d'accès au seul dépôt de données, en lecture/écriture du dépôt seulement.
- **Faibles** :
  - SSH `StrictHostKeyChecking=accept-new` (`data_sync.py:36`) : clé du serveur acceptée sans contrôle à la première
    connexion ;
  - adresses passées à git sans `--` (`launch.py:132`, `data_sync.py:60,90`) : à ajouter, et refuser un `-` en tête ;
  - `git lfs install` modifie la configuration globale ;
  - l'aide envoie son adresse par `postMessage(msg, '*')` (`apps/aide/aide.js:26`) : à adresser à `location.origin` ;
  - la restauration d'une sauvegarde locale (`browser_store.js:510-519`) réécrit toutes les clés, `suiteSession` et
    `dataOverride:*` comprises ;
  - le prompt ChatGPT part dans l'adresse (`mission_order.js:231`) : paramètres de mission, pas de nominatif constaté.

## Plan de correction

Par lots, du plus rentable au plus lourd. Chaque lot est indépendant. Le lot 1 touche aux en-têtes du lanceur : à
essayer sur le port 8000 avec le navigateur habituel (cache ancien) et sur les 50 pages de l'index.

| Lot | Contenu | Constats | Taille |
|---|---|---|---|
| **1. Lanceur fermé** | `Sec-Fetch-Site`, 403 sur `secrets/`, segments en point et `data/local/`, plus de listes de dossiers ; motifs de Téléchargements en liste fermée ; changement de dépôt distant confirmé dans la console ; `frame-ancestors` / `X-Frame-Options` ; gabarit exigé pour `data/**/*.js` | C2, E1, E2, E3, C1 (palliatif), M2 (partiel) | petit |
| **2. Git et archives durcis** | options `-c` de durcissement sur chaque appel, `--`, `.git/` et extensions refusées à l'extraction, identifiants refusés dans l'adresse, `NoDefaultCurrentDirectoryInExePath`, git par chemin absolu | C3, M5, M6 (partiel), faibles | petit |
| **3. Échappements** | `suite_update.js` (version), `dispos.color()`, `mission_registry` `pill`, profil de performance, aide (`?doc=`, schémas de liens), couleurs des modèles ODV, altitude densité | E5, M1 | petit |
| **4. Droits du navigateur** | poignées `__repo` / `__xplane` / `__xpnav` en lecture, écriture au clic ; CSP `connect-src` envoyée par le lanceur | E4, M2 | moyen |
| **5. Bibliothèques** | pdf.js livré localement, js-yaml 4.1.1, jsPDF 3.x, `airports.json` épinglé | M4 | petit |
| **6. Données en JSON** | fin des `.js` de données, chargement asynchrone dans les pages | C1 (fond) | gros |
| **7. Mises à jour signées** | tags signés, `verify-tag`, double authentification framagit | E6 | moyen (surtout organisation) |
| **8. Secrets** | trousseau du système, exclusion des sauvegardes | M6 | moyen |
| **9. Serveur** | § 4.5 | E7, M6 | gros |

## Suivi de l'audit du 2 octobre

| Point du 2 octobre | Aujourd'hui |
|---|---|
| `Host` exigé (DNS rebinding) | en place ✔ ; ne couvre pas l'inclusion de script entre sites (C2) |
| Taille des envois bornée, retours à la ligne refusés dans les identifiants, `nosniff` | en place ✔ |
| « Insertion HTML : textes passés par `esc` » | vrai pour les textes ; **faux pour les attributs `style` et `class`** (M1) et pour la version distante (E5) |
| « Fichiers ouverts traités comme des données, jamais comme du code » | vrai pour les fichiers ouverts ; **faux pour le dépôt de données** (C1) |
| « La suite ne charge aucun script d'ailleurs » | plus vrai : pdf.js depuis jsDelivr (M4) |
| Risque accepté : `.git` servi « limité à la machine » | à revoir : servi à tout script de l'origine, avec un jeton éventuel dans l'adresse (E1, M6) |
| Risque accepté : pas de CSP | à revoir : la CSP sert d'abord à fermer les sorties (`connect-src`), sans attendre la sortie des scripts en ligne (M2) |
| Nouveau depuis : `secrets/` (clé IVAO), `/__setup/downloads` | servis ou lisibles sans restriction (E1, E2) |

## Annexe A — Hôtes contactés

| Hôte | Depuis | Ce qui part |
|---|---|---|
| api.ivao.aero, data.vatsim.net | `network_tracker.js`, `fpl.js`, `mission_extensions.js` | rien de nominatif (flux publics) |
| api.vatsim.net, stats.vatsim.net, statsim.net | `network_tracker.js`, `core.js` | **CID VATSIM, VID IVAO** |
| www.simbrief.com | `mission_core/fpl.js:98` | **identifiant SimBrief** |
| metar.vatsim.net, api.open-meteo.com, archive-api.open-meteo.com | `assist.js` | codes OACI, coordonnées, dates |
| cdn.jsdelivr.net, purge.jsdelivr.net | `assist.js`, `assignments.js`, `maintenance_page.js` | rien ; **code pdf.js exécuté** |
| framagit.org (API GitLab) | `suite_update.js` (`credentials: 'omit'`) | rien |
| overpass-api.de, s3.amazonaws.com (terrarium), tuiles OSM, OpenTopoMap, OpenFreeMap, Versatiles | `sia_base.js`, cartes | zones consultées, adresse IP |
| chatgpt.com | `mission_order.js:231` | paramètres de mission dans l'adresse |
| webservice des CR (configurable) | `core.js:1293` | **CR complet, identifiants réseau, jeton** |
| atc-bookings.vatsim.net, api.ivao.aero (sous clé), flotte.defa-virtual.fr | lanceur (Python) | rien de nominatif ; clé IVAO dans l'en-tête |

## Annexe B — Routes du lanceur

- **GET `/__setup/`** : `status`, `sync-remote`, `sync-status`, `tools`, `vatsim-bookings`, `secrets` (indicateurs),
  `ivao-activations`, `ivao-bookings`, `defa-site`, `aircraft-db`, `downloads`, `sia-zip`.
- **POST `/__setup/`** : `perf`, `sync-remote`, `sync`, `aircraft-db`, `defa-site`, `secrets`, `aero-fetch`, `jeu-essai`,
  `clone`, `upload?kind=data|log`.
- **Autres** : tout le reste est servi en statique depuis la racine. `/data/` est redirigé vers `--data`, et les index
  `disponibilites/_index.json` et `utilisateurs/_index.json` sont refaits à chaque demande.

Aucune route n'écrit un fichier du pool : toutes les écritures de données viennent du navigateur (File System Access).

## Annexe C — Inventaire des insertions HTML

Environ 700 insertions (`innerHTML`, `insertAdjacentHTML`, `DOMParser`) dans 54 fichiers. Elles ont été relevées par
script (chaque `${…}` dans un gabarit HTML), puis suivies à la main depuis chaque source non fiable. Aucun `eval`,
`new Function` ni `setTimeout` sur une chaîne.

**Exploitables** : voir [M1](#m1) et [E5](#e5) (six chemins).

**Injection CSS sans script** : couleurs des modèles et éléments d'ODV.

- Où : `apps/cpco/odv_orders.js:1126,1133`, `style="…${esc(tint(m.couleur))}"`.
- Ce qui passe : `esc` empêche de sortir de l'attribut, mais `red;background:url(https://…)` passe. Cela permet une
  requête de pistage ou un trompe-l'œil, pas de script.
- Correction : n'accepter que `^#[0-9a-f]{3,8}$` à la lecture (`odv_orders_store.js`).

**Vérifié, conforme** (la trace finit sur `esc`, `textContent`, une liste fermée ou un nombre) :

- **Flux des réseaux** :
  - `network_tracker.js` (flux IVAO et VATSIM, historique) : `.value` et `textContent` seulement ;
  - `atc_sessions.js` : positions au format strict, texte vidé ;
  - `odv_airspace.js`, `odv_activations_editor.js`, `sia_base.js` : échappés ;
  - `map_parser.html` (SimBrief, étiquettes KML, AAR, OpenAir) : `textContent` ou dessin sur canevas.
- **CR** :
  - `report.js`, `form.js`, `blocks.js`, `core.js`, `reporting.js`, `global_reporting.js`, `charts.js`, `sheets.js`,
    `grid_edit.js`, `fleet_reporting.js`, `mission_exercise.js`, `mission_order.js` : échappés ;
  - liens de suivi limités à `https?://` (`report.js:149`, `traceLink`) ;
  - identifiants de mission reconstruits par expression stricte (`vocab.js:256`).
- **ODV** :
  - `odv_planning.js`, `odv_orders.js` (environ 120 `esc`) ;
  - couleurs du classeur forcées en hexadécimal (`rgbOf`) ;
  - `etat` et `type` en liste fermée.
- **Données partagées** :
  - `assign_dialog.js`, `assignments.js` (grille limitée aux codes de la légende), `dispos_editor.js` (sauf la couleur),
    `settings_panels.js`, `users.js`, `pilot_profile.js`, `data_admin.js`, `mission_registry.js` (sauf le statut) ;
  - `apps/pilot/mes_missions.html` (plis, équipes, sections Markdown, fiche technique).
- **Collages et imports** :
  - journal des vols (`defa_log.js:81`) et page Flotte (`data_admin.js:299`) : lus par `DOMParser`, seuls
    `textContent` et un `href` filtré sont gardés ;
  - `zip_store.js`, `text_import.js`, CSV et JSON passent par les rendus échappés.
- **Traduction automatique** : texte échappé avant mise en forme (`mes_missions.html:2887`).
- **Fenêtres** :
  - les sites extérieurs s'ouvrent avec `noopener` ;
  - les 7 `window.open` sans `noopener` ouvrent des pages de la suite qui ont besoin de `window.opener` ;
  - un seul `iframe` (l'aide, même origine, message vérifié par `e.source`).

**Points de vigilance pour la suite** : les colonnes `html:` et `detail()` de `SortedTable` (`mission_table.js:126`),
les substitutions de `RepositoryKit.tf` et `AssignDialog.frame()` prennent du HTML tel quel par conception. C'est là
qu'une régression se glisserait. Les attributs `style` et `class` construits à partir de données doivent être validés,
pas seulement échappés.

**Non couvert en détail** : `map_parser.html` (sondages seulement, conformes), import PDF de `maintenance_page.js`,
`odv_settings.js`.
