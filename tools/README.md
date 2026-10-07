# Outils de la suite (`tools/`)

Scripts de maintenance de l'application et du dépôt de données, lancés **à la racine du dépôt** (`python tools/…`),
Python 3 et bibliothèque standard sauf mention contraire. Chaque script détaille son usage dans son en-tête
(`python tools/<script>.py --help` n'existe pas toujours : lire l'en-tête). Les pages HTML s'ouvrent dans le
navigateur (servies par `tools/save_textures.py` quand elles écrivent des fichiers).

Sommaire navigable de tous les outils, avec ces explications : **`tools/index.html`** (dépôt servi par le lanceur ;
sans lui, seuls les outils décrits ici sont listés).

Trois familles :

1. **Outils courants** — à relancer à chaque fois que leur source change ;
2. **Ateliers graphiques** — fabrication des images des designs skeuomorphes ;
3. **Migrations ponctuelles** — déjà passées sur les données actuelles ; gardées pour une installation ancienne
   (ou une réimportation), elles peuvent être archivées.

---

## 1. Outils courants

| Outil | Quand | Ce qu'il fait |
|---|---|---|
| `bump_versions.py` | après toute modification d'un script, d'une feuille ou d'une image | Versions de cache `?v=` par **empreinte du contenu** (8 caractères de SHA-1) : chaque référence reçoit l'empreinte du fichier visé ; une version ne change que si son fichier change (une page n'est modifiée que si l'un de ses fichiers l'est). Couvre les attributs `src` / `href` des pages, les chargements écrits dans les scripts (`'fichier.js?v=…'`), la table `FILE_V` de `repository_nav.js` (feuilles de design) et les images des feuilles des designs ; un script qui versionne ses images avec son propre `?v=` a une empreinte qui couvre ces images (`DEPENDANCES` dans le script). Idempotent ; signale les références vers un fichier absent. Relance aussi `build_mission_prompt.py`, `build_docs_bundle.py` et le contrôle des images. |
| `publish_dist.py` (`publish_dist.sh`, `publish_dist.cmd`) | après la publication d’une version (tag `vx.y.z` poussé, `docs/MANUEL_EXPLOITATION.md` §6) | Archive de livraison `dist/xplane-web-suite-<version>.zip` : le **code seul** au tag (fichiers suivis par git, ni `data/` ni `examples/`), sous `xplane-web-suite-<version>/`, avec les **vraies images LFS** (prises dans `.git/lfs/objects`, `git lfs fetch` si besoin — `git archive` livrerait des pointeurs) ; archive reproductible (dates du commit tagué). Écrit l’empreinte (`.zip.sha256`) et la rubrique « Livraison » de la section de la version dans `docs/CHANGELOG.md` (à commiter ; `--sans-changelog` pour l’éviter). Sans argument : version publiée (`config/repository_tree` › `release`) ; `--dist <dossier>` (ex. `E:/DEFA/dist`), `--force` pour refaire. Les archives ne sont jamais commitées (`dist/` ignoré). |
| `build_map_planner.py` | après toute modification de `apps/cpco/map_parser.html` (studio du Centre) | Génère la page publique **Cartes de vol** (`apps/planner/map_planner.html`) depuis le studio : même moteur, même bloc Route, sans le bloc Mission ; ajoute le bloc « Cartes du vol ». La page générée ne s'édite pas à la main. |
| `build_mission_prompt.py` | après modification de `docs/technique/PROMPT_GENERATEUR_MISSIONS.md` | Recopie le prompt du générateur de missions (bloc ```text du document) dans `apps/cpco/mission_prompt.js`, lu par le bouton « Commander à ChatGPT ». |
| `aero_fetch.py` | à la demande (ou boutons de Paramètres › Maintenance › Données aéronautiques, par le lanceur) | Télécharge les données aéronautiques libres d'autres pays dans `data/sia/<source>/` : `openaip <pays…>` (exports openAIP), `faa [sua mtr class]` (FAA ADDS, contours simplifiés), `enaire` (AIXM 5.1 de l'Espagne), `ukmil` (UK Mil AIP ENR 5.2, lu par `ukmil_aip.py`), `navcan` (Designated Airspace Handbook de NAV CANADA, lu par `navcan_dah.py`) ; `--data <dossier>`. Lues à la reconstruction de la base aéronautique, pour les zones actives (`shared/aero_zones.js`, `shared/aero_sources.js`). |
| `ukmil_aip.py` | (module, appelé par `aero_fetch.py ukmil`) | Lit le PDF officiel de l'ENR 5.2 de la MILAIP britannique (AIDU, OGL v3.0, adresse fixe) sans bibliothèque externe : zones de vol à basse altitude (LFA, sol à 2000 ft AGL ; contours décrits en toutes lettres approchés par des segments droits), Valley Aerial Tactics Area, zone d'évitement TVAA → `data/sia/zones/gb/ukmil_enr52.geojson` ; zones de ravitaillement (AARA) en axes IP → CP → `ukmil_aara-tracks.xml` (format des axes de la DIRCAM). Essai : `python tools/ukmil_aip.py ENR-5-2.pdf [dossier]`. |
| `navcan_dah.py` | (module, appelé par `aero_fetch.py navcan`) | Lit le Designated Airspace Handbook de NAV CANADA (TP 1820, édition en vigueur `dah<AAAAMMJJ>.pdf` trouvée sur la page des guides opérationnels) sans bibliothèque externe : flux d'objets, polices CID décodées par leur table ToUnicode ; partie 5 → `data/sia/zones/ca/navcan_dah.geojson` : zones dangereuses (CYD, D), réglementées (CYR, R), consultatives (CYA : opérations militaires en MOA, autres en A), arcs et cercles, fiches à plusieurs secteurs séparées, plus bas plancher et plus haut plafond des tranches, horaires et organisme de contrôle. Partie 6 (drones seuls) ignorée. Essai : `python tools/navcan_dah.py dah.pdf [dossier]`. |
| `build_aero_zones.py` | rarement (nouvelle version de Natural Earth, regroupement de zones) | Écrit `shared/carto/aero_zones_geo.js` : une zone par pays (la France regroupe métropole et outre-mer), noms en 4 langues, contours simplifiés, depuis Natural Earth 1:50m (domaine public) ; fichier GeoJSON en argument, sinon téléchargé (jsDelivr). |
| `build_docs_bundle.py` | lancé par `bump_versions.py` (après modification d'un document de `docs/`) | Recopie tous les documents Markdown de `docs/` dans `apps/aide/docs_bundle.js` : la page Aide s'ouvre ainsi aussi depuis le disque (`file://`, sans lanceur) ; servie par le lanceur, elle lit les fichiers eux-mêmes. |
| `doc_traductions.py` | après une relecture du français des manuels ou des index (`docs/`) | Lignes changées dans le français depuis la dernière traduction (`docs/en`, `docs/de`, `docs/es`), d'après les empreintes de `docs/traductions.json` ; `--valider` une fois les traductions faites. Le français relu doit être commité. |
| `build_skeuo_icons_css.py` | après ajout ou retouche d'icônes dans `shared/icons/skeuo/` | Régénère la section « jeux d'icônes skeuomorphes » de `shared/block_icons.css` : une règle par icône et par jeu (Laiton → `cabinet/`, Acier → `field/`, Gel → `aqua/`, Aviation → `flightlog/` : jeux lus dans le registre des designs, `repository_tree` › `designs.list`, designs `skeuo:true`), alias, chevrons et poignée des blocs. Puis `bump_versions.py`. |
| `check_assets.py` | lancé par `bump_versions.py` ; seul : `python tools/check_assets.py` | Contrôle les images des designs (`shared/deco`, `shared/textures`, `shared/icons/skeuo`) : format réel conforme à l'extension (un PNG renommé en `.webp` est refusé), poids au-delà de 400 ko, images nommées par `design_deco.js` ou les feuilles des designs mais absentes, images que plus rien ne nomme (orphelines). Code de sortie 1 s'il y a une erreur. |
| `format_sources.py` | après une retouche de code compacté, ou avant une relecture | Met en forme le JavaScript, le CSS et les blocs `<script>` / `<style>` des pages (jsbeautifier, cssbeautifier ; gabarits `` `…` `` protégés : jsbeautifier en abîme le contenu imbriqué). Seuls les blancs changent ; lignes coupées au-delà de 140 caractères (hors chaînes et gabarits) : pas de code compacté sur une ligne, appels `[fr, en, de, es]` à une langue par ligne. À relancer après chaque retouche de code. Contrôle obligatoire ensuite : `tools/verify_format.html` (dépôt servi) compare avant / après — arbres syntaxiques JS (acorn) et règles CSS lues par le navigateur. `--check` : liste sans écrire. Hors champ : bibliothèques, fichiers générés (relancer leur générateur). |
| `check_binaries.py` | crochet pre-commit (une fois : `--install`) | Refuse tout binaire (image, archive, PDF…) qui entrerait dans git sans Git LFS. `--staged` : fichiers du commit en cours ; `--repo data --install` : même crochet pour le dépôt de données. |
| `update_suite.py` | mise à jour d'une installation | Mise à jour par git selon le canal (`master` stable, `develop` early bird) : `python tools/update_suite.py` (état), `channel develop`, `update`, `doctor` (contrôle de l'installation). Même logique que Paramètres › Maintenance › Mises à jour. |
| `update_cities_geonames.py` | rarement (villes du studio) | Met à jour `shared/carto/villes_geonames.csv` depuis GeoNames (CC BY 4.0) : outre-mer français (≥ 500 hab.) et monde (≥ 15 000 hab. par défaut) ; `--world N`, `--min N`, `--no-world`, liste de pays. Télécharge depuis download.geonames.org. |
| `launch.py` | appelé par `lancer.cmd` / `lancer.sh` | Lanceur : données (`data/`), serveur local avec l'interface du premier lancement (`/__setup/`), navigateur ; options `--port`, `--page`, `--no-browser`, `--no-data` |
| `assets_status.py` | à chaque livraison d'images | État des assets des designs à matières : par famille et par design, présents et manquants ; `--new` : images déposées depuis le dernier relevé, `--mark` : noter le relevé |
| `imp_audit.html` + `merge_imp_rules.py` | refactoring des couches CSS | Audit des renforts `:not(#imp)` (retirés un à un, styles relevés sur toutes les pages × designs × tons) puis fusion de ceux qui ne servent à rien |
| `defa_reference.py` | lancé par le lanceur une fois par jour (ou à la main) | Construit la référence **anonymisée** (`data/references/defa_reference.js` : pilotes par trigramme, appareils, terrains de rattachement) depuis la page « Log des vols ». Seules des informations agrégées sortent ; les champs saisis à la main sont conservés. `--dry-run`, `--out=CHEMIN`. Le lanceur lit lui-même la page publique du site (`/__setup/defa-site`, `shared/defa_site.js`). |
| `../AircraftDB/update_fleet.py` | lancé par le lanceur une fois par jour (ou à la main, depuis la racine) | Flotte (`data/references/aircraft_fleet.js`) depuis la page « Flotte virtuelle » du site, fusionnée avec le fichier (mêmes règles que « Coller la page Flotte du site… »). `--out=CHEMIN`. |
| `../AircraftDB/update_aircraft_db.py` | type par type, par Paramètres › Maintenance (ou à la main, **depuis `AircraftDB/`**) | Types d'aéronefs (OACI Doc 8643, service JSON) et performances EUROCONTROL APD (`--apd CODES`), non publiés ; `--only CODES`, `--add`, `--no-network`. Jamais toute la base EUROCONTROL d'un coup. Détail : manuel d'exploitation § 4.3. |
| `family_letters.py` | (module) | Table des lettres de famille des missions (M HEMS, S SAR, T AIRLIFT…), partagée par les scripts de missions ; même table que `SiaMission.FAMILY_LETTERS` et le prompt. |
| `new_family_pages.py` | ajout d'une famille de CR | Crée les deux pages d'une nouvelle famille du Mission Report Core (saisie de CR et reporting, copiées de HEMS) et les déclare dans `repository_tree`, d'après un petit fichier JSON (famille, dossier, préfixe, couleur). Reste à déclarer la famille dans `shared/mission_core/vocab.js`. |
| `migrate_missions_schema.py` | après une montée du format de mission | Passe les YAML de `data/missions` au format `helo-xp-mission` courant (2.0) ; aperçu sans `--write`. Les fichiers hors format sont signalés, pas modifiés. |
| `data_template/` | création d'un dépôt de données | Squelette du dépôt `data/` (README, `data_tree.js`), repris par `migrate_v3.py`. |
| `install_hooks.sh` | une fois par clone | Pose dans les crochets git locaux (post-commit, post-checkout, post-merge) l'appel de `write_build.sh`, puis l'exécute. |
| `write_build.sh` | appelé par les crochets git | Écrit `config/build.js` (commit, branche, étiquette courants, hors dépôt) : le pied de page affiche la version exacte, même en `file://`. |
| `planche_rubriques.py` | après retouche des en-têtes de l'ordre de mission | Planche contact des en-têtes de l'ordre de mission par organisme, pour chaque design à matières (`docs/technique/planches/rubriques_<design>.jpg` et planche d'ensemble), d'après les règles de `apps/pilot/mes_missions.html`. |

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
| `cut_tabs.py` | Découpe les onglets de page d'un design (`python tools/cut_tabs.py [design…]`) depuis sa planche `docs/technique/planches/onglets_<design>.webp` : `shared/deco/<design>/tabs/rail.webp`, `tab.webp`, `tab-on.webp`, sans texte ; montage « plaques » (Cabinet) ou « cellules » (Carnet de vol : rail à fenêtres, poussoir dans chaque cellule, lueur de la page courante) ; cadrages dans `CONFIG` ; affiche les tailles utiles aux découpes 9 parties de `designs_skeuo.css`. Pillow. Consigne : `docs/technique/ASSETS_A_FOURNIR.md` § 6. |
| `cut_register_sheet.py` | Découpe une feuille de registre (`python tools/cut_register_sheet.py cabinet\|flightlog\|field [--write]`) en morceaux `shared/deco/<design>/sheet-*.webp` : coins aux bords intérieurs fondus, tranches raccordables, pièces d'en-tête facultatives, papier de fond ; affiche les jetons de géométrie `--sh-*` et, avec `--write`, réécrit le bloc « découpe » du design dans `designs_skeuo.css` (les « réglages » restent à la main). Planches sources non versionnées (configurations en tête du script) ; accessoire du bord gauche (ficelle, crayon) livré à part ; ImageMagick 7. |
| `gauges_from_sheets.html` | Découpe des boîtiers de cadrans (laiton → Cabinet, métal sombre → Carnet de vol, plaque sombre → Durci, chrome → Aqua). |

Après une découpe ou une retouche d'icônes : `python tools/build_skeuo_icons_css.py` puis `python tools/bump_versions.py`.
**Jeux composés (fond + glyphe SVG)** : déposer dans le dossier du jeu (`shared/icons/skeuo/<jeu>/`, `<jeu>` = `aqua`,
`cabinet`, `field`, `flightlog`) le fond vide `vierge.webp` et celui du Centre `vierge.rouge.webp` (cuivre, rouge ; à défaut
`vierge.gris.webp`), puis relancer les deux
commandes : le jeu passe au fond commun avec le glyphe du registre par-dessus (les images d'icônes du jeu ne servent
plus et peuvent être retirées ; relancer après). Fond carré (256 × 256 conseillé), transparent autour, sans glyphe ;
zone du glyphe ≈ le centre (marge de 24–26 % par côté) ; éclairage par le haut (l'ombre du glyphe tombe vers le bas).
Aqua : fond gris `vierge.gris.webp` teinté à la couleur Aqua choisie sur son disque intérieur (cerclage gris), même bulle
pour le Centre (glyphe jaune). Réglages (couleurs, ombre, marge, rayon teinté) : tableau `GLYPH` du générateur ; la
liste des jeux composés est écrite dans `repository_tree` (barre latérale, page Apparence).
Les retouches manuelles se font directement dans les `.webp`,
même nom de fichier ; relancer ensuite les deux mêmes commandes.

## Bancs d'essai

| Outil | Ce qu'il fait |
|---|---|
| `skeuo_regression.html` | Non-régression des designs à matières : relève les styles calculés des composants du framework sur six pages témoins (4 designs × 2 tons), puis compare un état ultérieur à cette référence, propriété par propriété. À lancer avant et après toute retouche de `designs_skeuo.css` (dépôt servi par `python -m http.server 8767 --bind 127.0.0.1`, puis `http://127.0.0.1:8767/tools/skeuo_regression.html`). |
| `stub_marker_offset.html` | Marqueurs des points de route (bloc Route) comparés aux positions exactes dessinées par la carte ; boutons de décalage X / Y au pixel, ancre, étiquettes : mesure du décalage à corriger. Ouvrir tel quel. |
| `jeu_essai.py` | au premier lancement (carte « Jeu d’essai », par le lanceur : `POST /__setup/jeu-essai`), ou à la main | Installe dans `data/` le jeu d’essai livré avec la suite (`tools/jeu_essai/` : missions, pilotes et flotte fictifs ; disponibilités, affectations et heure H de l’exercice datées de la semaine en cours) : `python tools/jeu_essai.py --data DOSSIER [--week AAAA-MM-JJ] [--force]` ; refuse un dossier qui a déjà `data_tree.js`, sauf `--force`. |
| `jeu_fantome.py` | Jeu de test « fantôme », **sur une branche de test du dépôt de données** (jamais `main`) : déclarations de disponibilités d'une semaine (défaut : la semaine en cours) pour des pilotes de la référence sans déclaration réelle, et missions du registre affectées à ces pilotes (disponibles au décollage, appareil de la flotte libre, patrouilles de chasseurs). Tout est marqué `phantom: true`, `by: FANTOME`. Sans option : aperçu ; `--write` : écrit ; `--clean --write` : retire les fantômes ; `--week`, `--pilots`, `--missions`, `--seed`. PyYAML. |
| `audit_i18n.html` | Audit des traductions : charge chaque page de l'index dans une langue (`?lang=en`, `de` ou `es` ; `&auto` lance aussitôt, `&only=<expression>` filtre les pages) et relève les textes visibles et infobulles restés en français. Les données (missions, noms propres) peuvent rester en français : liste de pistes. |
| `verify_format.html` | Contrôle obligatoire après `format_sources.py` : compare avant / après les arbres syntaxiques JavaScript (acorn) et les règles CSS lues par le navigateur ; seuls les blancs doivent avoir changé. |

## Chantier des couches CSS

Outils du refactoring `docs/technique/REFACTORING_TOOLKIT.md` (designs qui l'emportent sur l'application sans `!important`) ;
chaque passage se vérifie au banc `skeuo_regression.html`. Tous ont `--check` (aperçu sans écrire).

| Outil | Ce qu'il fait |
|---|---|
| `strip_page_important.py` | Retire les `!important` des styles propres d'une page ou d'une feuille (préalable aux couches) ; `--bump` les convertit plutôt en règles renforcées `:not(#imp)`. |
| `layer_pages.py` | Range les styles d'une page en couches (`lib` < `page` < hors couche) ; les règles propres aux designs restent hors couche. |
| `layer_app.py` | Modèle « app » : socle, styles des scripts et des pages dans une seule couche `app`, bibliothèques dans `lib`, designs au-dessus (`--css` pour les feuilles du socle). |

## 3. Migrations ponctuelles (déjà passées)

À ne relancer que sur une installation ou des données **antérieures** à la migration ; toutes ont un `--dry-run`
(ou un aperçu par défaut). Candidates à l'archivage (`tools/archive/`) quand plus aucune installation ne les attend.

| Outil | Migration |
|---|---|
| `migrate_v3.py` | v2 → v3 : les données sortent de l'application et vont dans le dépôt privé `data/` (clone ou dépôt neuf, rangement, bilan). |
| `reletter_missions.py` | Identifiants « lettre de série » (A001…J046C) → « lettre de famille » (M001, S002A…). |
| `renumber_missions.py` | Renumérotation : lettre de famille + numéro d'opération sur 3 chiffres + lettre d'équipe ; un sous-dossier par mission. |
| `migrate_operation_ids.py` | Migration des identifiants d'une opération ou d'une mission rangée (`BFM-001` → `A-001`) : toutes les références suivent (opération, organisation, participants, cartes, textes), `former_id`, fichiers renommés, rien de supprimé. |
| `dash_mission_ids.py` | Tiret dans les identifiants : M001 → M-001 (dossiers, fichiers, YAML, Markdown). |
| `renumber_reports.py` | Numéros des CR du registre `data/cr/missions.yaml` alignés sur les missions (CRM-016A-1…). |
| `import_pdf_missions.py` | Import de missions livrées en vrac (PDF du générateur, ZIP de cartes) : YAML et résumé reconstruits depuis le texte du PDF, points à compléter. Nécessite `pypdf`. |

---

Ordre habituel après une modification de code : **(générateurs concernés)** → `bump_versions.py` → vérifier les pages
modifiées dans le navigateur (console sans erreur) → commit.
