# Outils de la suite (`tools/`)

Scripts de maintenance de l'application et du dépôt de données, lancés **à la racine du dépôt** (`python tools/…`),
Python 3 et bibliothèque standard sauf mention contraire. Chaque script détaille son usage dans son en-tête
(`python tools/<script>.py --help` n'existe pas toujours : lire l'en-tête). Les pages HTML s'ouvrent dans le
navigateur (servies par `tools/save_textures.py` quand elles écrivent des fichiers).

Trois familles :

1. **Outils courants** — à relancer à chaque fois que leur source change ;
2. **Ateliers graphiques** — fabrication des images des designs skeuomorphes ;
3. **Migrations ponctuelles** — déjà passées sur les données actuelles ; gardées pour une installation ancienne
   (ou une réimportation), elles peuvent être archivées.

---

## 1. Outils courants

| Outil | Quand | Ce qu'il fait |
|---|---|---|
| `bump_versions.py` | après toute modification d'un fichier `shared/…js|css` | Change la version de cache `?v=AAAAMMJJx` dans toutes les pages HTML (et les chargements internes de `repository_nav.js`) : les navigateurs rechargent les fichiers modifiés. `python tools/bump_versions.py` (lettre suivante du jour) ou `… 20261001a` (version imposée). Relance aussi `build_mission_prompt.py`. Les scripts propres à une page (`mission_store.js`, `odv_core.js`…) sont listés dans le script : en ajouter un nouveau à cette liste. |
| `build_map_planner.py` | après toute modification de `apps/cpco/map_parser.html` (studio du Centre) | Génère la page publique **Cartes de vol** (`apps/planner/map_planner.html`) depuis le studio : même moteur, même bloc Route, sans le bloc Mission ; ajoute le bloc « Cartes du vol ». La page générée ne s'édite pas à la main. |
| `build_mission_prompt.py` | après modification de `docs/PROMPT_GENERATEUR_MISSIONS.md` | Recopie le prompt du générateur de missions (bloc ```text du document) dans `apps/cpco/mission_prompt.js`, lu par le bouton « Commander à ChatGPT ». |
| `build_skeuo_icons_css.py` | après ajout ou retouche d'icônes dans `shared/icons/skeuo/` | Régénère la section « jeux d'icônes skeuomorphes » de `shared/block_icons.css` : une règle par icône et par jeu (Laiton → `cabinet/`, Acier → `field/`, Gel → `aqua/`, Aviation → `flightlog/`), alias, chevrons et poignée des blocs. Puis `bump_versions.py`. |
| `check_binaries.py` | crochet pre-commit (une fois : `--install`) | Refuse tout binaire (image, archive, PDF…) qui entrerait dans git sans Git LFS. `--staged` : fichiers du commit en cours ; `--repo data --install` : même crochet pour le dépôt de données. |
| `update_suite.py` | mise à jour d'une installation | Mise à jour par git selon le canal (`master` stable, `develop` early bird) : `python tools/update_suite.py` (état), `channel develop`, `update`, `doctor` (contrôle de l'installation). Même logique que Paramètres › Maintenance › Mises à jour. |
| `update_cities_geonames.py` | rarement (villes du studio) | Met à jour `shared/carto/villes_geonames.csv` depuis GeoNames (CC BY 4.0) : outre-mer français (≥ 500 hab.) et monde (≥ 15 000 hab. par défaut) ; `--world N`, `--min N`, `--no-world`, liste de pays. Télécharge depuis download.geonames.org. |
| `defa_reference.py` | après un nouvel export du journal des vols DEFA | Construit la référence DEFA **anonymisée** (`data/references/defa_reference.js` : pilotes par trigramme, appareils, terrains de rattachement) depuis la page « Log des vols » enregistrée. Seules des informations agrégées sortent ; les champs saisis à la main sont conservés. `--dry-run`. |
| `family_letters.py` | (module) | Table des lettres de famille des missions (M HEMS, S SAR, T AIRLIFT…), partagée par les scripts de missions ; même table que `SiaMission.FAMILY_LETTERS` et le prompt. |
| `new_family_pages.py` | ajout d'une famille de CR | Crée les deux pages d'une nouvelle famille du Mission Report Core (saisie de CR et reporting, copiées de HEMS) et les déclare dans `repository_tree`, d'après un petit fichier JSON (famille, dossier, préfixe, couleur). Reste à déclarer la famille dans `shared/mission_core/vocab.js`. |
| `migrate_missions_schema.py` | après une montée du format de mission | Passe les YAML de `data/missions` au format `helo-xp-mission` courant (2.0) ; aperçu sans `--write`. Les fichiers hors format sont signalés, pas modifiés. |
| `data_template/` | création d'un dépôt de données | Squelette du dépôt `data/` (README, `data_tree.js`), repris par `migrate_v3.py`. |

## 2. Ateliers graphiques (designs skeuomorphes)

Pages HTML à ouvrir via le petit serveur d'écriture : `python tools/save_textures.py`, puis
`http://localhost:8765/tools/<page>.html` (le serveur sert le dépôt et n'accepte que l'écriture de `.webp` dans
`shared/textures/` ; l'arrêter par Ctrl+C une fois les images écrites).

| Outil | Ce qu'il fait |
|---|---|
| `save_textures.py` | Serveur local des ateliers (lecture du dépôt, écriture des textures). `--src DOSSIER` : photos sources pour `textures_from_photos.html`. |
| `textures_generator.html` | Textures procédurales des designs à matières (cartes, radar, caoutchouc…). |
| `textures_from_photos.html` | Textures photographiques d'après des matières CC0 d'ambientCG (JPG `*_color` / `*_normal` du dossier `--src`). |
| `icons_from_sheets.html` | Découpe des icônes et décors dans les planches de maquette (Cabinet, Durci, Aqua, Carnet de vol). |
| `icons_skeuo_generator.html` | Fabrique, dans le style des planches, les icônes du registre qui n'y figurent pas. |
| `gauges_from_sheets.html` | Découpe des boîtiers de cadrans (laiton → Cabinet, métal sombre → Carnet de vol, plaque sombre → Durci, chrome → Aqua). |

Après une découpe ou une retouche d'icônes : `python tools/build_skeuo_icons_css.py` puis `python tools/bump_versions.py`.
**Jeux composés (fond + glyphe SVG)** : déposer dans le dossier du jeu (`shared/icons/skeuo/<jeu>/`, `<jeu>` = `aqua`,
`cabinet`, `field`, `flightlog`) le fond vide `vierge.webp` et celui du Centre `vierge.gris.webp` (ou, à part,
`<jeu>-bg/normal.webp` et `centre.webp`), puis relancer les deux commandes : le jeu passe au fond
commun avec le glyphe du registre par-dessus. Fond carré (256 × 256 conseillé), transparent autour, sans glyphe ; zone
du glyphe ≈ le centre (marge de 24–26 % par côté) ; éclairage par le haut (l'ombre du glyphe tombe vers le bas) ; en
Aqua, fond normal peint dans le bleu de référence (teinte 214°), ramené à la couleur Aqua choisie.
Les retouches manuelles se font directement dans les `.webp`,
même nom de fichier ; relancer ensuite les deux mêmes commandes.

## Bancs d'essai

| Outil | Ce qu'il fait |
|---|---|
| `stub_marker_offset.html` | Marqueurs des points de route (bloc Route) comparés aux positions exactes dessinées par la carte ; boutons de décalage X / Y au pixel, ancre, étiquettes : mesure du décalage à corriger. Ouvrir tel quel. |

## 3. Migrations ponctuelles (déjà passées)

À ne relancer que sur une installation ou des données **antérieures** à la migration ; toutes ont un `--dry-run`
(ou un aperçu par défaut). Candidates à l'archivage (`tools/archive/`) quand plus aucune installation ne les attend.

| Outil | Migration |
|---|---|
| `migrate_v3.py` | v2 → v3 : les données sortent de l'application et vont dans le dépôt privé `data/` (clone ou dépôt neuf, rangement, bilan). |
| `reletter_missions.py` | Identifiants « lettre de série » (A001…J046C) → « lettre de famille » (M001, S002A…). |
| `renumber_missions.py` | Renumérotation : lettre de famille + numéro d'opération sur 3 chiffres + lettre d'équipe ; un sous-dossier par mission. |
| `dash_mission_ids.py` | Tiret dans les identifiants : M001 → M-001 (dossiers, fichiers, YAML, Markdown). |
| `renumber_reports.py` | Numéros des CR du registre `data/cr/missions.yaml` alignés sur les missions (CRM-016A-1…). |
| `import_pdf_missions.py` | Import de missions livrées en vrac (PDF du générateur, ZIP de cartes) : YAML et résumé reconstruits depuis le texte du PDF, points à compléter. Nécessite `pypdf`. |

---

Ordre habituel après une modification de code : **(générateurs concernés)** → `bump_versions.py` → vérifier les pages
modifiées dans le navigateur (console sans erreur) → commit.
