# Installation

*[README](README.md) · [README (FR)](README_fr.md) · [Tutoriel](docs/TUTORIAL.md) · [Manuel d'exploitation](docs/MANUEL_EXPLOITATION.md)*

La suite est un ensemble de fichiers statiques (HTML, JavaScript, CSS, données YAML / JS).
Il n'y a rien à compiler ni à installer côté serveur.

## 1. Prérequis

| Élément | Nécessaire pour | Remarque |
|---|---|---|
| **Chrome ou Edge** (récent) | tout | Firefox / Safari fonctionnent, **sans** écriture directe dans un dossier (enregistrement par téléchargement) |
| **Python 3** (facultatif) | serveur local, scripts de mise à jour des bases | Windows : taper `python` dans un terminal propose l'installation depuis le Microsoft Store |
| **Git** (facultatif) | récupérer / publier les mises à jour | ou archive ZIP depuis framagit |
| Connexion Internet (facultative) | plan de vol, météo, aérodromes, suivi réseau | tout le reste fonctionne hors ligne |

## 2. Récupérer le dépôt

Depuis la version 3, **l'application et les données sont séparées** :

| Dépôt | Contenu | Où |
|---|---|---|
| Application (public) — <https://framagit.org/asr/flight_planner> | pages (`apps/cr`, `apps/sia`, `apps/planner`, `apps/landing`, `apps/settings`), framework (`shared/`), bases OACI / APD générées (`AircraftDB/`), outils, docs, exemples | dossier de votre choix |
| Données (privé) — <https://framagit.org/defa-virtual/missions-defa> | flotte et référence DEFA, indicatifs, corrections OACI, registres et CR, missions générées, MORA, axes ENR 5.7, base de performances | `data/` **dans** le dossier de l'application (ignoré par git) |

```bash
git clone https://framagit.org/asr/flight_planner.git
cd flight_planner
git clone https://framagit.org/defa-virtual/missions-defa.git data
```

**Git LFS** : les binaires (images, PDF, archives, polices…) sont stockés par Git LFS dans les deux dépôts
(`.gitattributes`). Installer [Git LFS](https://git-lfs.com) (inclus dans Git for Windows et GitKraken) et lancer une
fois `git lfs install` ; puis, dans chaque dépôt, `python tools/check_binaries.py --install` (depuis `data/` :
`python ../tools/check_binaries.py --install`) : un commit qui ajouterait un binaire hors LFS est refusé.
`python tools/update_suite.py doctor` le vérifie.

Sans `data/`, les pages utilisent les petits exemples fictifs d'`examples/`. Conseil : placer le dossier dans un
dossier synchronisé (Synology Drive, OneDrive…) **en excluant les dossiers `.git`** de la synchronisation — la
synchronisation de `.git` corrompt les dépôts (voir docs/AUDIT_2026-09-28.md).

**Depuis une version 2** : passer sur la version 3 (`python tools/update_suite.py update`), puis
`python tools/migrate_v3.py --data-url https://framagit.org/defa-virtual/missions-defa.git` : `data/` est créé (clone,
ou dépôt local à relier), les données y sont rangées (depuis l'ancienne arborescence et l'historique git), puis
☰ › Paramètres › Maintenance › Sources et dossiers › **Dossier des données** : choisir `data/`. Anciennes adresses : `CR DEFA/…` →
`apps/cr/…`, `SIA XML/…` → `apps/sia/…`, Paramétrage / Apparence / Maintenance → `apps/settings/…`, planificateur →
`apps/planner/…`, Landing → `apps/landing/…` ; page d'accueil : `index.html`.

## 3. Ouvrir les pages

### Recommandé : petit serveur local

À la racine du dépôt :

```bash
python -m http.server 8000 --bind 127.0.0.1
```

puis ouvrir <http://127.0.0.1:8000/> (page d'accueil), <http://127.0.0.1:8000/apps/cr/mission_cr.html> (nouveau compte rendu) ou
<http://127.0.0.1:8000/apps/cr/mission_operations_reporting.html> (reporting). Toutes les pages sont
accessibles par le menu ☰.

Pourquoi un serveur : ouvertes directement depuis le disque (`file://`), les pages
fonctionnent, mais le navigateur interdit la lecture des fichiers voisins (registres YAML
du dépôt, fichiers servis) ; seules les copies du navigateur et les dossiers autorisés
restent alors lisibles.

### Ouverture directe

Double-cliquer sur `apps/cr/mission_cr.html` (ou toute autre page) : les pages calculent leurs liens
depuis la racine du dépôt. Voir la limite ci-dessus.

### Hébergement web

Copier le dépôt sur n'importe quel hébergement statique (Apache, nginx, GitLab / framagit
Pages…). Seule contrainte : servir le fichier sans extension **`repository_tree`** avec le
type `text/javascript`, par exemple :

- Apache (`.htaccess`) :
  ```apache
  <Files "repository_tree">
    ForceType text/javascript
  </Files>
  ```
- nginx :
  ```nginx
  location = /repository_tree { default_type text/javascript; }
  ```

Sur un hébergement, chaque visiteur a ses propres données (navigateur, dossiers locaux) ;
les registres présents dans le dépôt sont lus en lecture seule.

## 4. Premier réglage (5 minutes)

1. **Profil pilote** — menu ☰ › Profil pilote : ID IVAO (VID), ID VATSIM (CID), identifiant
   SimBrief. Ils sont repris par toutes les pages.
2. **Langue** — drapeau du bandeau : automatique, FR, EN, DE, ES.
3. **Dossier du registre** — sur une page de CR (barre d'en-tête) : « Dossier du registre… »,
   choisir le dossier `CR DEFA` du dépôt. Autorisé une fois pour toutes les familles ; le
   registre unique `missions.yaml` y est ensuite écrit à chaque enregistrement.
4. **Sauvegarde des données locales** — menu ☰ › Données locales › « Dossier de
   sauvegarde… » : choisir un dossier synchronisé (hors dépôt si vous ne voulez pas le
   versionner). Sauvegarde automatique ensuite.
5. **Dossiers et sources** — ☰ › Paramètres › Maintenance › Sources et dossiers : dossier du dépôt (racine, qui contient
   `repository_tree` ; pour éditer les bases), missions, SIA XML, **X-Plane** (journaux d'atterrissage), performances ;
   adresses DEFA et SIA si elles changent.

Chrome / Edge redemandent parfois l'autorisation d'un dossier après redémarrage : un clic
sur « Autoriser » suffit.

## 5. Scripts Python (facultatif)

Aucune dépendance externe (bibliothèque standard uniquement) :

| Script | Rôle |
|---|---|
| `AircraftDB/update_fleet.py Flotte.html` | met à jour la flotte depuis la page « Flotte virtuelle » enregistrée |
| `AircraftDB/update_aircraft_db.py` (depuis `AircraftDB/`) | rafraîchit la base des types OACI (Doc 8643, EUROCONTROL, Wikidata) |
| `tools/bump_versions.py` | change la version de cache des scripts (après modification du code) |
| `tools/new_family_pages.py famille.json` | crée les pages d'une nouvelle famille de missions |

### Données SIA (Missions SIA)

Le studio cartographique utilise les données AIRAC du SIA, **hors dépôt** (≈ 80 Mo par cycle) :
télécharger l'export XML sur le site du SIA (produits numériques en libre disposition) et déposer
`AIXM4.5_all_FR_OM_<date>.xml`, `XML_SIA_<date>.xml` et `sia-airspaces-<date>.xml` dans
`apps/sia/`. Au premier lancement : studio › « Dossier SIA XML » (dossier mémorisé). Les autres
données (villes, MORA, axes de ravitaillement, fond local) sont dans le dépôt. Détail :
[docs/SIA_MISSIONS.md](docs/SIA_MISSIONS.md).

Détails : [manuel d'exploitation](docs/MANUEL_EXPLOITATION.md).

## 6. Mise à jour

```bash
python tools/update_suite.py update
```

(ou `git pull --ff-only`). Le **canal** se choisit dans ☰ › Paramètres › Maintenance : `master` (stable) ou `develop` (early bird,
dernières évolutions) — `python tools/update_suite.py channel develop` l'applique au dépôt ; le contrôle des nouveautés
est manuel, automatique (période au choix) ou désactivé. `python tools/update_suite.py doctor` vérifie l'installation
(remote, branches, objets git, fins de ligne).

Puis recharger les pages (Ctrl+F5 si une ancienne version reste affichée). Vos données
(registres YAML, sauvegarde locale, navigateur) ne sont pas touchées par une mise à jour du
code.

## 7. Désinstallation

Supprimer le dossier du dépôt. Les données gardées par le navigateur s'effacent avec les
données du site (paramètres du navigateur › Confidentialité › Données des sites) — pensez
à une dernière sauvegarde (☰ › Données locales).
