# Installation

*[Sommaire de la documentation](README.md) · [Tutoriel d'installation](tutorial/installation.fr.md) · [Manuel d'exploitation](MANUEL_EXPLOITATION.md)*

> **Première installation : ce document est remplacé par le [tutoriel d'installation](tutorial/installation.fr.md)**
> ([HTML](tutorial/installation.fr.html) · [English](tutorial/installation.en.md)). Ce qui suit reste la référence du
> fonctionnement et des cas avancés.

La suite est un ensemble de fichiers statiques (HTML, JavaScript, CSS, données YAML / JS) servis par un petit serveur
local. Rien à compiler.

**Première installation : suivre le [tutoriel d'installation](tutorial/installation.fr.md)** (captures d'écran, schémas
des échanges et des identifiants, prérequis ; [version HTML](tutorial/installation.fr.html),
[English](tutorial/installation.en.md)). Ce document-ci détaille le fonctionnement et les cas avancés.

## 1. Installation en un lancement

1. Récupérer le dossier de l'application : archive zip (framagit › Code › Télécharger) décompressée où vous voulez, ou
   `git clone https://framagit.org/asr/flight_planner.git`.
2. Lancer, depuis ce dossier :
   - **Windows** : double-clic sur `lancer.cmd` ;
   - **macOS / Linux** : `sh lancer.sh` dans un terminal (ou `./lancer.sh`).
3. Dans la page **Premier lancement** qui s'ouvre (`apps/settings/premier_lancement.html`), six étapes, tout le reste
   grisé tant que la première n'est pas faite :
   1. **Dossiers** : dossier de l'application (données, registre, missions, SIA, performances et sauvegarde locale en
      sont déduits ; un dossier d'une autre copie de la suite est signalé) ; classeur ODV (facultatif) ;
   2. **Données** : jeu d'essai, adresse du dépôt de données du SOG (identifiants facultatifs ; « mémoriser » les
      confie au gestionnaire d'identifiants de Git), ou archive `.zip` reçue par mail ;
   3. **Compagnie** : nom et site de la compagnie, clé d'API IVAO (gardée par le lanceur) ;
   4. **Profil** : trigramme, ID IVAO, ID VATSIM, SimBrief, identifiant sur le site de la compagnie (mot de passe hors
      service, INOP, tant qu'il n'y a pas de webservice) ;
   5. **Données aéronautiques** : pays choisis sur la carte, « Activer » (téléchargements, base, MORA), puis ce qui
      reste à la main (ZIP du SIA, PDF de la MILAIP, dossier X-Plane) ;
   6. **Centre** (administrateurs) : mot de passe du Centre ; puis **Terminer**.

   Une fois réglée, la suite s'ouvre sur l'accueil aux lancements suivants (la page reste accessible :
   `premier_lancement.html?force`).

Ce que fait le lanceur (`lancer.cmd` / `lancer.sh` → `tools/launch.py`) :

| Étape | Détail |
|---|---|
| Python | cherché (`py`, `python`, `python3`, version 3.8 ou plus) ; absent : installé — `winget` sous Windows, Homebrew ou outils de développement d'Apple sous macOS, gestionnaire de paquets sous Linux (après accord) ; à défaut, la page de téléchargement de python.org s'ouvre |
| Données `data/` | présentes : mises à jour depuis le dépôt si c'est un clone (fiches du poste commitées d'abord, rien d'envoyé) ; sinon une archive `.zip` déposée à côté du lanceur est extraite dans `data/` ; sinon clone du dépôt privé si Git connaît déjà les identifiants — à défaut, la page de premier lancement les demande |
| Serveur | serveur web local de Python sur `http://127.0.0.1`, premier port libre à partir de 8000, avec l'interface de la page de premier lancement (`/__setup/…`, réservée aux pages servies par ce serveur) ; déjà lancé : le navigateur est seulement rouvert |
| Navigateur | ouvert sur la page Premier lancement (l'accueil une fois la suite réglée) |

Laisser la fenêtre du lanceur ouverte pendant l'utilisation ; la fermer (ou Ctrl+C) arrête la suite. Options :
`--port 8010`, `--no-browser`, `--no-data`, `--page apps/cr/mission_cr.html`.

## 2. Les données

Depuis la version 3, **l'application et les données sont séparées** :

| Dépôt | Contenu | Où |
|---|---|---|
| Application (public) — <https://framagit.org/asr/flight_planner> | pages, framework, bases OACI / APD générées, outils, docs, exemples | dossier de votre choix |
| Données (privé, propre à chaque compagnie ; adresse donnée par la compagnie) | flotte et référence, indicatifs, registres et CR, missions générées, affectations, MORA, axes ENR 5.7, base de performances | `data/` **dans** le dossier de l'application (ignoré par git) |

Le dépôt des données est **privé** et propre à chaque compagnie : aucune adresse n'est fournie avec la suite. Tant qu'il
n'y a pas de données, la suite démarre sur les exemples d'`examples/`. Trois façons d'avoir les données, proposées par
la page de premier lancement :

- le **jeu d'essai** livré avec la suite (données fictives, pour la découvrir ; `tools/jeu_essai.py`) ;
- l'**adresse du dépôt de données** de votre compagnie (`https://…` ou `git@…`), avec au besoin vos identifiants :
  le lanceur clone `data/` ;
- demander **un jeu de données par mail** : déposer l'archive `.zip` reçue dans le dossier de l'application (à côté de
  `lancer.cmd`), relancer — elle est extraite dans `data/` (archive reconnue à son fichier `data_tree.js`).

Conseil : un dossier synchronisé (Synology Drive, OneDrive…) convient, **en excluant les dossiers `.git`** de la
synchronisation (la synchronisation de `.git` corrompt les dépôts, voir [AUDIT_2026-09-28.md](technique/AUDIT_2026-09-28.md)).

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

### Tablet or phone on the local network (`--lan`)

To use the Pilot application on a tablet or a phone while flying on the computer, start the launcher with
`lancer.cmd --lan` (`./lancer.sh --lan`), or open the access from the computer's Settings. The console shows the
address to open on the device (`http://<computer's address>:<port>/frame/`) and a 6-digit pairing code. The device
asks for that code once, and then sees the computer's data and the simulator's position.

- Windows asks to allow Python on the network: allow it for **private networks only**.
- The device must be on the same local network. Over plain http, use it only on a trusted network (at home), never
  on public or hotel wifi.
- The access closes with the launcher. On the device the application does not work offline (no https).

## 4. Installation manuelle (avancé)

```bash
git clone https://framagit.org/asr/flight_planner.git
cd flight_planner
git clone <adresse du dépôt de données de votre compagnie> data
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

1. **Profil pilote** — ☰ › Profil pilote : trigramme (page « Mes missions »), ID IVAO (VID), ID VATSIM (CID),
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
| `AircraftDB/update_aircraft_db.py` (depuis `AircraftDB/`) | complète la base des types OACI (Doc 8643, EUROCONTROL, Wikidata), non publiée : type par type (`--only`, `--apd`), aussi depuis Paramètres › Maintenance |
| `tools/bump_versions.py` | `--neutral` : références à `?v=0` (état du dépôt ; le lanceur pose les empreintes réelles en servant) ; sans option : empreintes réelles pour un usage sans lanceur |
| `tools/new_family_pages.py famille.json` | crée les pages d'une nouvelle famille de missions |

### Données SIA (Missions SIA)

Le studio cartographique utilise les données AIRAC du SIA, **hors dépôt** (≈ 80 Mo par cycle) : Paramètres ›
Maintenance › Données aéronautiques, source SIA de la zone France. Le ZIP s'obtient sur la boutique du SIA, page du cycle : compte SIA
(gratuit), « Ajouter au panier » (0 €), « Passer commande » en acceptant la licence, téléchargement depuis la
confirmation ou « Mes commandes ». Puis **Récupérer le ZIP téléchargé** : le serveur du lanceur prend le dernier
`export_xml_bd_SIA_*.zip` du dossier Téléchargements et la page l'extrait dans `data/sia/`. Détail : [manuel administrateur](MANUEL_ADMINISTRATEUR.md), « Données aéronautiques ».

### Clé d'API IVAO (ordres de vols)

« Importer d'IVAO » (activations de zones des ordres de vols : horaires publiés des zones de France, dont le RTBA, et
NOTAM de la division) passe par le lanceur, qui lit la clé d'API IVAO dans la variable d'environnement `IVAO_API_KEY`,
sinon dans `secrets/ivao.json` à la racine de la suite, écrit par Paramètres › Installation › Sources et dossiers › « Clés d'API » (ou à la main : `{ "apiKey": "…" }`). Le dossier `secrets/` est exclu de git ;
la clé n'est jamais envoyée à la page ni écrite dans les données. Sans clé, les activations se saisissent à la main.

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
`python tools/migrate_v3.py --data-url <adresse du dépôt de données>` : `data/` est créé (clone,
ou dépôt local à relier), les données y sont rangées, puis Paramètres › Sources et dossiers › **Dossier du dépôt**.
Anciennes adresses : `CR DEFA/…` → `apps/cr/…`, `SIA XML/…` → `apps/cpco/…`, Paramétrage / Apparence / Maintenance →
`apps/settings/…`, planificateur → `apps/planner/…`, Landing → `apps/landing/…` ; page d'accueil : `index.html`.
