# Suite DEFA Virtual — X-Plane Web Suite

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

   Le lanceur installe Python si besoin, récupère les données, démarre la suite et ouvre le navigateur sur les
   **Paramètres**.
3. **Dans la page qui s'ouvre** : cliquer sur le bouton de la **première ligne** (« Dossier du dépôt ») et choisir **ce
   dossier** (celui qui contient `lancer.cmd`). Tous les autres dossiers en sont déduits.
4. Suivre **Mises à jour** (lien proposé), et c'est prêt.

Les fois suivantes : relancer `lancer.cmd` / `lancer.sh`, laisser sa fenêtre ouverte pendant l'utilisation, la fermer
pour arrêter.

## Les données

Les données DEFA (flotte, missions, registres…) sont dans un **dépôt privé**, rangé dans le dossier `data/`. Le lanceur
le récupère tout seul si vous y avez accès (compte framagit). Sinon :

- demandez l'accès au Centre, puis relancez le lanceur ;
- ou demandez **un jeu de données par mail** : déposez l'archive `.zip` reçue dans ce dossier, à côté de `lancer.cmd`,
  puis relancez — elle est installée automatiquement.

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

---

*English*: a set of local web pages for DEFA Virtual flight operations (mission reports, reporting, fuel and SIA
charts, Centre missions, pilot page). Download the folder, run **`lancer.cmd`** (Windows) or **`sh lancer.sh`**
(macOS / Linux), then in the Settings page that opens choose **this folder** on the first row. Data come from a private
repository (or a `.zip` set sent by mail, dropped next to the launcher). Full documentation:
[docs/PRESENTATION_en.md](docs/PRESENTATION_en.md).

CC RBR — DEFA Virtual. Licences des composants tiers : [docs/PRESENTATION.md](docs/PRESENTATION.md#licence-et-crédits).
