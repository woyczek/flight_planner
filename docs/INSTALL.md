# Installation

*[Sommaire de la documentation](README.md) · [Présentation](PRESENTATION.md) · [Tutoriel](TUTORIAL.md) · [Manuel d'exploitation](MANUEL_EXPLOITATION.md)*

La suite est un ensemble de fichiers statiques (HTML, JavaScript, CSS, données YAML / JS) servis par un petit serveur
local. Rien à compiler.

## 1. Installation en un lancement

1. Récupérer le dossier de l'application : archive zip (framagit › Code › Télécharger) décompressée où vous voulez, ou
   `git clone https://framagit.org/asr/flight_planner.git`.
2. Lancer, depuis ce dossier :
   - **Windows** : double-clic sur `lancer.cmd` ;
   - **macOS / Linux** : `sh lancer.sh` dans un terminal (ou `./lancer.sh`).
3. Dans la page **Paramètres › Sources et dossiers** qui s'ouvre : bouton de la première ligne, **Dossier du dépôt**,
   choisir le dossier de l'application. Données, registre, missions, SIA, performances et sauvegarde locale en sont
   déduits.
4. **Mises à jour** (lien proposé une fois le dossier choisi).

Ce que fait le lanceur (`lancer.cmd` / `lancer.sh` → `tools/launch.py`) :

| Étape | Détail |
|---|---|
| Python | cherché (`py`, `python`, `python3`, version 3.8 ou plus) ; absent : installé — `winget` sous Windows, Homebrew ou outils de développement d'Apple sous macOS, gestionnaire de paquets sous Linux (après accord) ; à défaut, la page de téléchargement de python.org s'ouvre |
| Données `data/` | présentes : mises à jour (`git pull`) si c'est un clone ; sinon une archive `.zip` reçue par mail, déposée à côté du lanceur, est extraite dans `data/` ; sinon le dépôt privé est cloné (identifiants framagit demandés au besoin) |
| Serveur | serveur web local de Python sur `http://127.0.0.1`, premier port libre à partir de 8000 ; déjà lancé : le navigateur est seulement rouvert |
| Navigateur | ouvert sur Paramètres › Sources et dossiers, en mode premier lancement |

Laisser la fenêtre du lanceur ouverte pendant l'utilisation ; la fermer (ou Ctrl+C) arrête la suite. Options :
`--port 8010`, `--no-browser`, `--no-data`, `--page apps/cr/mission_cr.html`.

## 2. Les données

Depuis la version 3, **l'application et les données sont séparées** :

| Dépôt | Contenu | Où |
|---|---|---|
| Application (public) — <https://framagit.org/asr/flight_planner> | pages, framework, bases OACI / APD générées, outils, docs, exemples | dossier de votre choix |
| Données (privé) — <https://framagit.org/defa-virtual/missions-defa> | flotte et référence DEFA, indicatifs, registres et CR, missions générées, affectations, MORA, axes ENR 5.7, base de performances | `data/` **dans** le dossier de l'application (ignoré par git) |

Le dépôt des données est **privé** : si l'accès n'est pas encore donné (ou si Git ne s'authentifie pas tout de suite),
la suite démarre sur les exemples d'`examples/`. Deux façons d'avoir les données :

- demander l'accès (compte framagit), puis relancer le lanceur, qui clone `data/` ;
- demander **un jeu de données par mail** : déposer l'archive `.zip` reçue dans le dossier de l'application (à côté de
  `lancer.cmd`), relancer — elle est extraite dans `data/` (archive reconnue à son fichier `data_tree.js`).

Conseil : un dossier synchronisé (Synology Drive, OneDrive…) convient, **en excluant les dossiers `.git`** de la
synchronisation (la synchronisation de `.git` corrompt les dépôts, voir [AUDIT_2026-09-28.md](AUDIT_2026-09-28.md)).

## 3. Navigateur

| Navigateur | État |
|---|---|
| **Chrome, Edge** (récents) | complet, sans réglage |
| **Brave** | complet avec un réglage (ci-dessous) |
| Firefox, Safari | pages utilisables ; pas d'écriture directe dans un dossier (enregistrement par téléchargement) |

### Brave

Uniquement en mode serveur local (lanceur, ou serveur lancé **à la racine du dossier**, pages ouvertes par
`http://127.0.0.1:8000/…`), jamais en `file://`. Activer en plus l'accès aux dossiers, que Brave coupe par défaut :
ouvrir `brave://flags/#file-system-access-api`, passer **File System Access API** à **Enabled**, relancer Brave. Sans ce
réglage, le choix des dossiers (Paramètres › Sources et dossiers) est impossible.

### Pourquoi un serveur local

Ouvertes directement depuis le disque (`file://`), les pages s'affichent, mais le navigateur interdit la lecture des
fichiers voisins (registres YAML, données, fichiers servis) ; seules les copies du navigateur et les dossiers autorisés
restent lisibles. Le lanceur sert la suite pour éviter ce cas.

## 4. Installation manuelle (avancé)

```bash
git clone https://framagit.org/asr/flight_planner.git
cd flight_planner
git clone https://framagit.org/defa-virtual/missions-defa.git data
python -m http.server 8000 --bind 127.0.0.1
```

puis ouvrir <http://127.0.0.1:8000/apps/settings/parametrage.html?m=sources&setup=1>.

**Git LFS** : les binaires (images, PDF, archives, polices…) sont stockés par Git LFS dans les deux dépôts
(`.gitattributes`). Installer [Git LFS](https://git-lfs.com) (inclus dans Git for Windows et GitKraken), lancer une
fois `git lfs install`, puis dans chaque dépôt `python tools/check_binaries.py --install` (depuis `data/` :
`python ../tools/check_binaries.py --install`) : un commit qui ajouterait un binaire hors LFS est refusé.
`python tools/update_suite.py doctor` le vérifie.

### Hébergement web

Copier le dossier sur un hébergement statique (Apache, nginx, framagit Pages…). Seule contrainte : servir le fichier sans
extension **`config/repository_tree`** avec le type `text/javascript` :

- Apache (`config/.htaccess`) :
  ```apache
  <Files "repository_tree">
    ForceType text/javascript
  </Files>
  ```
- nginx :
  ```nginx
  location = /config/repository_tree { default_type text/javascript; }
  ```

Sur un hébergement, chaque visiteur a ses propres données (navigateur, dossiers locaux) ; les registres présents dans le
dossier sont lus en lecture seule.

## 5. Réglages suivants (5 minutes)

1. **Profil pilote** — ☰ › Profil pilote : trigramme DEFA (page « Mes missions »), ID IVAO (VID), ID VATSIM (CID),
   identifiant SimBrief. Repris par toutes les pages.
2. **Langue** — drapeau du bandeau : automatique, FR, EN, DE, ES.
3. **Dossier X-Plane** (journaux d'atterrissage) — Paramètres › Sources et dossiers, si vous utilisez le Landing
   Dashboard ; c'est le seul dossier qui ne se déduit pas du dossier de l'application.
4. **Apparence** — ☰ › Paramètres › Apparence : design, jeu d'icônes, ton.

Chrome / Edge redemandent parfois l'autorisation d'un dossier après redémarrage : un clic sur « Autoriser » suffit.

## 6. Scripts Python (facultatif)

Bibliothèque standard uniquement :

| Script | Rôle |
|---|---|
| `tools/launch.py` | lanceur (données, serveur, navigateur) — appelé par `lancer.cmd` / `lancer.sh` |
| `tools/update_suite.py update` / `doctor` | mise à jour de la suite / diagnostic de l'installation |
| `AircraftDB/update_fleet.py Flotte.html` | met à jour la flotte depuis la page « Flotte virtuelle » enregistrée |
| `AircraftDB/update_aircraft_db.py` (depuis `AircraftDB/`) | rafraîchit la base des types OACI (Doc 8643, EUROCONTROL, Wikidata) |
| `tools/bump_versions.py` | versions de cache des scripts, feuilles et images (après modification du code) |
| `tools/new_family_pages.py famille.json` | crée les pages d'une nouvelle famille de missions |

### Données SIA (Missions SIA)

Le studio cartographique utilise les données AIRAC du SIA, **hors dépôt** (≈ 80 Mo par cycle) : Paramètres ›
Maintenance › Mise à jour SIA, ou export XML téléchargé sur le site du SIA (`AIXM4.5_all_FR_OM_<date>.xml`,
`XML_SIA_<date>.xml`) déposé dans `data/sia/`. Détail : [SIA_MISSIONS.md](SIA_MISSIONS.md).

## 7. Mise à jour

Paramètres › Maintenance › **Mises à jour**, ou :

```bash
python tools/update_suite.py update
```

(ou `git pull --ff-only`). Le **canal** se choisit dans Paramètres › Maintenance : `master` (stable) ou `develop`
(early bird) ; `python tools/update_suite.py channel develop` l'applique au dépôt. Installation par archive zip :
télécharger la nouvelle archive et la décompresser par-dessus (le dossier `data/` n'est pas touché). Ce qu'il faut faire
après chaque version : [VERSION.md](VERSION.md).

Puis recharger les pages (Ctrl+F5 si une ancienne version reste affichée). Vos données (registres, sauvegarde locale,
navigateur) ne sont pas touchées par une mise à jour du code.

## 8. Désinstallation

Supprimer le dossier de l'application. Les données gardées par le navigateur s'effacent avec les données du site
(paramètres du navigateur › Confidentialité › Données des sites) — pensez à une dernière sauvegarde (☰ › Données
locales).

## Annexe — depuis une version 2

Passer sur la version 3 (`python tools/update_suite.py update`), puis
`python tools/migrate_v3.py --data-url https://framagit.org/defa-virtual/missions-defa.git` : `data/` est créé (clone,
ou dépôt local à relier), les données y sont rangées, puis Paramètres › Sources et dossiers › **Dossier du dépôt**.
Anciennes adresses : `CR DEFA/…` → `apps/cr/…`, `SIA XML/…` → `apps/cpco/…`, Paramétrage / Apparence / Maintenance →
`apps/settings/…`, planificateur → `apps/planner/…`, Landing → `apps/landing/…` ; page d'accueil : `index.html`.
