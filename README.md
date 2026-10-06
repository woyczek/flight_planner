# Special Ops Virtual Suite — X-Plane Web Suite

Mission reports, reporting, flight preparation (fuel, SIA charts), Centre missions, and the pilot **“My Missions”** page: web pages that run **on your own computer**, in your browser. No account required, no complicated installation.

## SO Group Virtual — Concise Project Overview

**SO Group Virtual is an integrated suite for planning, preparing, documenting and analysing virtual flight operations.** It connects pilots and an operations centre through a shared workflow, from the initial mission brief to the final debrief.

The suite supports civil protection, humanitarian, transport and defence scenarios across **16 mission families**, including medical evacuation, firefighting, search and rescue, airlift, air-to-air refuelling and reconnaissance.

Its main capabilities include:

- **Operational planning:** match missions with pilot availability, aircraft capabilities, simulator compatibility and fleet location.
- **Mission preparation:** create detailed briefs, coordinated exercises and tailored maps using French SIA aeronautical data.
- **Flight planning:** prepare routes, inspect terrain and airspace profiles, and estimate fuel requirements.
- **Assisted reporting:** reuse mission information, import flight plans and capture flight milestones through IVAO or VATSIM tracking.
- **Activity analysis:** review mission outcomes, fleet and crew activity, and landing performance.

A shared pilot profile, four interface languages and connected tools reduce repeated data entry. The suite currently runs locally in a browser, with file-based data storage, backups and optional Git synchronisation between users.

**The project gives virtual flying a structured operational purpose: coordinated missions, practical preparation and measurable outcomes.**

## Getting started (one-time setup)

1. **Download the folder**: click **“Code › Download ZIP”** at  
   <https://framagit.org/asr/flight_planner>, then extract the ZIP wherever you want (Documents, etc.).  
   *(With Git: `git clone https://framagit.org/asr/flight_planner.git`.)*

2. **Launch it**:
   - **Windows**: double-click **`lancer.cmd`**;
   - **macOS / Linux**: open a terminal in the folder and run **`sh lancer.sh`**.

   The launcher installs Python if required, starts the suite, and opens the **First Run** page.

3. **On this page**, complete four steps:
   1. **Data**: enter your Framagit credentials (or use the archive received by email);
   2. **Profile**: callsign/trigram, IVAO, VATSIM, SimBrief, and DEFA website credentials;
   3. **Folders**: select **this folder** (the one containing `lancer.cmd`) — all other paths are derived from it — then select the OneDrive folder containing the ODV workbook (or the Excel file itself);
   4. **Finish**: the SIA data update will then start automatically.

On subsequent launches, simply run `lancer.cmd` / `lancer.sh`, leave its window open while using the suite, and close it when you want to stop it.

## Data

SO group data (fleet, missions, logs, etc.) is stored in a **private repository**, located in the `data/` folder. The First Run page retrieves it using your Framagit credentials (password, or an access token if your account uses two-factor authentication).

Do not have access yet? Request **a data package by email** and provide the `.zip` archive on the same page (or place it next to `lancer.cmd` and relaunch the suite).

Without the data package, the suite starts with a small set of sample data.

## Browser

Use **Chrome** or **Edge**. **Brave** also works with one additional setting (folder access): see  
[docs/INSTALL.md](docs/INSTALL.md#brave).

Firefox and Safari can display the pages, but do not support direct saving to folders.

## Documentation

Everything is available in [docs/](docs/README.md): detailed installation instructions, tutorial, operations manual, and release notes.

## Folder structure

| Folder / file | Contents |
|---|---|
| `lancer.cmd`, `lancer.sh` | launchers (Windows, macOS / Linux) |
| `index.html` | home page |
| `apps/` | application pages |
| `shared/`, `assets/`, `AircraftDB/` | shared code and resources |
| `config/` | suite configuration (pages, themes, sources, version) |
| `data/` | your data (private repository, not included in the download) |
| `docs/` | documentation |
| `examples/` | sample data (used when `data/` is absent) |
| `tools/` | maintenance tools |
| `repository_tree` | compatibility relay for older versions (update checks), temporary — nothing to do here |


# Suite Special Ops Virtual — X-Plane Web Suite

Comptes rendus de mission, reporting, préparation des vols (carburant, cartes SIA), missions du Centre et page pilote
« Mes missions » : des pages web qui tournent **sur votre ordinateur**, dans le navigateur. Ni compte, ni installation
compliquée.

## Démarrer (une seule fois)

1. **Récupérer le dossier** : bouton « Code › Télécharger (zip) » sur
   <https://framagit.org/asr/flight_planner>, puis décompresser le zip où vous voulez (Documents…).
   *(Avec Git : `git clone https://framagit.org/asr/flight_planner.git`.)*
2. **Lancer** :
   - **Windows** : double-cliquer sur **`lancer.cmd`** ;
   - **macOS / Linux** : dans un terminal ouvert sur le dossier, taper **`sh lancer.sh`**.

   Le lanceur installe Python si besoin, démarre la suite et ouvre la page **Premier lancement**.
3. **Dans cette page**, quatre étapes :
   1. **Données** : vos identifiants framagit (ou l'archive reçue par mail) ;
   2. **Profil** : trigramme, IVAO, VATSIM, SimBrief, identifiants du site DEFA ;
   3. **Dossiers** : choisir **ce dossier** (celui qui contient `lancer.cmd`) — tous les autres en sont déduits —, puis
      le dossier OneDrive du classeur ODV (ou le fichier Excel) ;
   4. **Terminer** : la mise à jour des données SIA s'enchaîne.

Les fois suivantes : relancer `lancer.cmd` / `lancer.sh`, laisser sa fenêtre ouverte pendant l'utilisation, la fermer
pour arrêter.

## Les données

Les données DEFA (flotte, missions, registres…) sont dans un **dépôt privé**, rangé dans le dossier `data/`. La page
de premier lancement le récupère avec vos identifiants framagit (mot de passe, ou jeton d'accès si votre compte a la
double authentification). Pas encore d'accès ? Demandez **un jeu de données par mail** et donnez l'archive `.zip` à la
même page (ou déposez-la à côté de `lancer.cmd` et relancez).

Sans données, la suite démarre sur de petits exemples.

## Navigateur

**Chrome** ou **Edge**. **Brave** fonctionne avec un réglage (accès aux dossiers) : voir
[docs/INSTALL.md](docs/INSTALL.md#brave). Firefox et Safari : pages utilisables, sans enregistrement direct dans les
dossiers.

## Documentation

Tout est dans [docs/](docs/README.md) : installation détaillée, tutoriel, manuel d'exploitation, notes de version.

## Organisation du dossier

| Dossier / fichier | Contenu |
|---|---|
| `lancer.cmd`, `lancer.sh` | lanceurs (Windows, macOS / Linux) |
| `index.html` | page d'accueil |
| `apps/` | les pages des applications |
| `shared/`, `assets/`, `AircraftDB/` | code et ressources communs |
| `config/` | configuration de la suite (pages, thèmes, sources, version) |
| `data/` | vos données (dépôt privé, absent du téléchargement) |
| `docs/` | documentation |
| `examples/` | données d'exemple (sans `data/`) |
| `tools/` | outils de maintenance |
| `repository_tree` | relais pour les anciennes versions (contrôle des mises à jour), provisoire — rien à y faire |

---

*English*: a set of local web pages for DEFA Virtual flight operations (mission reports, reporting, fuel and SIA
charts, Centre missions, pilot page). Download the folder, run **`lancer.cmd`** (Windows) or **`sh lancer.sh`**
(macOS / Linux), then in the Settings page that opens choose **this folder** on the first row. Data come from a private
repository (or a `.zip` set sent by mail, dropped next to the launcher). Full documentation:
[docs/PRESENTATION_en.md](docs/PRESENTATION_en.md).

CC RBR — DEFA Virtual. Licences des composants tiers : [docs/PRESENTATION.md](docs/PRESENTATION.md#licence-et-crédits).
