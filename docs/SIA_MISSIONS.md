# Missions SIA — générateur de mission et studio cartographique

Dossier `apps/sia/` — ☰ › **Générateur de mission (SIA)** et ☰ › **Studio cartographique (SIA)**.
Application de la suite qui prépare le **dossier de mission** d'un vol de simulation : le
brief (textes, points, participants, consignes, PDF final) et les **cartes** produites depuis
les données aéronautiques officielles du SIA (cycle AIRAC), sur fond OpenStreetMap ou local.

```
Mission (YAML / Markdown) ──► Générateur de mission ──► Studio cartographique ──► cartes PNG / SVG + ZIP
                                   │   ▲                                               │
                                   │   └─────────── ZIP des cartes ◄───────────────────┘
                                   ├──► PDF final du dossier (textes + cartes)
                                   └──► Créer le CR DEFA (compte rendu pré-rempli)
```

Code : les deux pages, `apps/sia/aero_symbols.js` (lecture de l'AIXM : aérodromes, pistes,
radionavigation, obstacles ; symbologie de la carte), `shared/aar_tracks.js` (axes de
ravitaillement ENR 5.7), composants du
framework (bandeau et menu ☰, blocs, `FileAccess`, fenêtres de copier-coller, sauvegarde locale).
Bibliothèques livrées dans le dossier : MapLibre GL (`maplibre-gl.js/.css`), jsPDF
(`jspdf.umd.min.js`) ; js-yaml est celui du framework. Notes de conception :
[SIA_XML_INTEGRATION.md](SIA_XML_INTEGRATION.md).

## 1. Données

| Fichier | Rôle | Dépôt |
|---|---|---|
| `AIXM4.5_all_FR_OM_<date>.xml` | AIXM 4.5 complet du SIA : contours R / D / P / CTR / TMA avec classes et limites verticales, zones AZBA (RTBA), aérodromes et pistes, VOR / DME / TACAN / NDB, **13 800 obstacles** | hors dépôt (≈ 44 Mo par cycle) |
| `XML_SIA_<date>.xml` | Export XML-SIA complet : contours de tous les espaces (SIV, RMZ/TMZ, AP, FIR…), inventaire | hors dépôt |
| `sia-airspaces-<date>.xml` | Ancien fichier dérivé de XML_SIA : facultatif, ignoré quand XML_SIA est présent | hors dépôt |
| `miam-enr-5-7-tracks.xml` | **Axes de ravitaillement** MILAIP ENR 5.7 nommés et corrigés (31 axes + 6 circuits heavy) | versionné |
| `miam-enr-5-7-coordinates.xml` | Coordonnées ENR 5.7 d'origine (sans noms) | versionné |
| `mora.csv` | **Grille MORA** 1° × 1° calculée (§ 4.6) | versionné |
| `villes_geonames.csv` | Villes (GeoNames cities500, CC BY 4.0) | versionné |
| `Carte france vierge.png` | Fond local (Lambert, calibré ouest −6,5° / sud 40,5° / est 12,5° / nord 52°) | versionné |

Les données AIRAC se téléchargent sur le site du SIA (produits numériques, export XML) et se
déposent dans le dossier `apps/sia/` ; `.gitignore` les tient hors du dépôt.

**Un seul cycle** : quand le dossier contient plusieurs cycles, le studio ne lit que le plus récent (les autres sont
signalés, à archiver) et mémorise le cycle dans la base (`airac`, résumé `siaBaseInfo:v1` pour la pastille « AIRAC » de
l'en-tête). Procédure de mise à jour : ☰ › Paramètres › Maintenance › Mise à jour des données SIA — pas à pas ; `map_parser.html?relire=1`
relit le dossier mémorisé.

**Dossier mémorisé** : « Dossier SIA XML : … » (studio, bloc 1) choisit le dossier une fois ;
il est retenu comme les autres dossiers de la suite (☰ › Paramétrage) et les sélecteurs de
fichiers des deux pages s'y ouvrent. « Relire le dossier » après un nouveau cycle AIRAC. La base
analysée (contours, villes, MORA, obstacles, axes ENR 5.7) est gardée dans le navigateur
(IndexedDB `sia-map-parser`) : le studio s'ouvre sans relire les 80 Mo d'XML. Une base d'une
version précédente est relue automatiquement si l'accès au dossier est déjà accordé.

## 2. Format des missions

Pour faire produire une série par un assistant externe (ChatGPT…) : prompt complet, aligné sur ce que lit
la suite, dans [PROMPT_GENERATEUR_MISSIONS.md](PROMPT_GENERATEUR_MISSIONS.md).

**Identifiants** : lettre de la famille + tiret + numéro d'opération sur 3 chiffres, compté par famille, + lettre d'équipe
quand l'opération engage plusieurs équipes — « M-016 », « S-002A », « S-002B ». Lettres : M HEMS / MEDEVAC, H HADR,
F FIRE, S SAR, T AIRLIFT, R AAR, P AIRBORNE, N MARITIME, I ISR, L LE, C COMMAND, O SOF, V FI, G SURVEY, X SPECIAL
(`SiaMission.FAMILY_LETTERS`, `tools/family_letters.py`) ; `mission.series` = rang de la série dans la famille ;
`mission.former_id` = identifiant d'avant renumérotation. Les **CR** reprennent l'identifiant : `CRM-016-1`
(CR + mission + n° d'essai ; CR sans mission : `CRM-A01-0`, voir MANUEL_EXPLOITATION.md § 2.1). Prochains numéros : `SiaMission.nextNumbering(famille)`
(d'après le registre des missions). Rangement : `data/missions/<lettre>_<FAMILLE>/<identifiant>/` (YAML, résumé,
cartes, PDF) ; outils `tools/renumber_missions.py` (séries importées), `tools/import_pdf_missions.py` (dossiers PDF
et ZIP de cartes), `tools/dash_mission_ids.py` (passage au format avec tiret), trace dans `data/missions/RENUMEROTATION.md`.

Schéma YAML `helo-xp-mission` (exemples : `data/missions/T_AIRLIFT/T-001/missionT-001.yaml`,
`data/missions/M_MEDEVAC/`) :

| Clé | Contenu |
|---|---|
| `schema`, `schema_version` | `helo-xp-mission`, `1.0` |
| `mission` | `series`, `number`, `id`, `type` (AIRLIFT, MEDEVAC, TRAINING…), `subtype` |
| `title`, `summary`, `detailed_description` | Titre et textes du brief |
| `operation` | Opération à plusieurs équipes : `id`, `name`, `missions` (une mission complète par équipe : 41A, 41B…) |
| `aircraft` | `type`, `callsign`, `operator`, `role` (l'aéronef DEFA de la mission) |
| `origin`, `destination`, `target` | `name` (code OACI entre parenthèses : « BA 123 Orléans-Bricy (LFOJ) »), `lat`, `lon` |
| `turning_points`, `rendezvous` | `id`, `name`, `lat`, `lon`, `role`, `participants` |
| `teams` | Équipes (nom, service, département, type — un aéronef connu devient appareil du CR) |
| `payload`, `objectives`, `risks`, `notes`, `zones` | Charge, objectifs, risques (conséquence / parade), consignes |
| `maps` | Cartes à produire : `filename`, `type` (general, target, detail, zone…), `description`, emprise (`bbox`, ou `centre_ref` + `range_km` / `width_km` × `height_km`) |
| `rendering` | `north_up`, `draw_routes`, `add_markers`, `attribution_required` |

Le **Markdown** est accepté aussi : titres `## Summary` / `## Description détaillée`, ou ancien
format à blocs (`TYPE:`, `SOUS-TYPE:`, `TARGET:`, `TURNING POINTS:` avec lignes
`- PT1 | SIMIP | 46.444167 | 1.486000 | rôle`, `RDV:`, `ZONE:`, `MAPS TO PRODUCE:`, `NOTES:`) —
exemple : `examples/missions/Mission 02.md` (ravitaillement en vol sur l'axe SIMONE).

Le Markdown des missions générées (`summaryNN.md`) porte aussi ses données, lues même sans le YAML :
lignes `Type :`, `Sous-type :`, `Aéronef :`, `Callsign :`, `Départ :`, `Destination :` (avec
« — lat, lon » éventuel) de l'introduction, tableau `## Points tournants`, liste `## Rendez-vous`
(`**RDV-1 — Nom** — lat, lon — participants : A, B — rôle`), tableau `## Équipes engagées`,
`## Charge / personnel`, objectifs, `## Ravitaillement en vol` (`- clé: valeur`), risques. Le YAML
prime quand les deux sont chargés. La cible et les zones n'ont pas de coordonnées dans ce Markdown
(elles viennent du YAML) ; les Markdown MEDEVAC n'ont que textes, équipes et risques.

**Lot de missions** (opération à plusieurs équipes, série) : une sélection de plusieurs missions — fichiers
(`missionM-016A.yaml`, `summaryM-016A.md`, `missionM-016B.yaml`…) ou texte collé d'un seul tenant — réponse de ChatGPT
copiée en Markdown (« Fichier : … » + blocs ```), copiée depuis la page (« Fichier : … », « yaml », « Copier le
code »), ou YAML et Markdown des missions simplement à la suite (« schema: helo-xp-mission », « # Mission … ») ;
le texte hors mission (introduction, VALIDATION, « Mission suivante ») est écarté — est découpée et regroupée par
mission (identifiant `mission.id`, ou titre « # Mission M-016A ») ; la première est affichée, les autres avec
**◀ Mission M-016A — titre (1/3) ▶** dans l'en-tête du générateur et du studio (même lot, partagé entre les deux
pages et mémorisé dans le navigateur : `siaMissionBatch:v1`). Les modifications de chaque mission sont gardées
en passant de l'une à l'autre. Générateur : **Exporter les N PDF** — un brief par mission. Studio :
**Afficher toutes les cartes (N missions)** — aperçus de toutes les missions, groupés par mission ;
**Générer les N missions** (bloc et pied de page) — un seul ZIP, un dossier par mission avec ses cartes et sa
carte d'assemblage ; profils et cases ZIP de chaque carte gardés d'une mission à l'autre pendant la session.
Le générateur lit ce ZIP : chaque mission y trouve ses cartes et sa propre carte d'assemblage.

**Assemblage de l'opération.** Studio : **carte de l'opération** (`carte_operation.png`, à la racine du ZIP de
toutes les missions, et en tête des aperçus) — points de toutes les missions (rendez-vous communs une fois), trajet
de chaque équipe (départ → points tournants → arrivée) dans sa couleur, légende (mission, indicatif, aéronef),
emprise englobant tout, profil de la carte générale. Générateur : **Dossier d'opération (un PDF)** — page de garde
(nom de l'opération, tableau des missions : indicatif, aéronef, départ, titre ; rendez-vous communs à plusieurs
missions ; carte de l'opération si le ZIP a été chargé), puis le brief complet de chaque mission à la suite. Les fichiers annexes
d'une série (`maps_manifest.md`, `AAR_TRACKS_REFERENCE.md`, `VALIDATION.txt`, consignes) sont ignorés et
signalés. Une mission dont le bloc `operation` annonce d'autres missions affiche déjà le sélecteur (missions non
chargées grisées, « à charger ») ; une mission de la même opération collée ou ouverte ensuite **rejoint** le lot
(réponse de ChatGPT livrée mission par mission). Un chargement d'une mission hors de l'opération efface le lot.

## 2 bis. Registre des missions générées

Page `apps/sia/mission_registry.html` (☰ › Registre des missions (SIA), barre latérale « Registre »), construite par
`shared/mission_registry.js`.

- **Missions du registre** : dossier `data/missions/` du dépôt (dossier mémorisé `__missions`) lu récursivement — chaque
  sous-dossier de série, YAML et Markdown groupés par mission (`SiaMission.fromTextsBatch`) ; « Ajouter des
  fichiers… » pour tout navigateur. Relecture automatique à l'ouverture si le dossier est autorisé.
- **Choisir une mission** : filtres type, sous-type, rendez-vous (avec / sans), équipes engagées (min – max), type
  d'équipe ou d'aéronef, ravitaillement en vol, théâtre (déduit des coordonnées), statut, recherche ; **Tirer au
  sort** parmi les missions filtrées ; fiche : équipes, indicatifs, rendez-vous ; **Ouvrir dans le générateur**,
  **dans le studio**, **Créer le CR** ; statut, date de vol, notes.
- **Statuts** : commandée, générée, planifiée (ouverte dans le générateur ou le studio), volée, CR fait (CR du
  registre dont `metadata.missionNumber` est l'identifiant de la mission), abandonnée.
- **Commander une mission** (bloc commun avec le générateur, `shared/mission_order.js`) : type, sous-type (liste du § 2 du prompt), théâtre(s), série (numéro, auto par défaut) et
  **identifiant** calculé (`SiaMission.nextNumbering`), équipes DEFA en vol, types d'équipes (une ligne par équipe A, B,
  C… ; vide = automatique ; complétion par les types courants et la flotte DEFA, un même type possible pour plusieurs
  équipes), rendez-vous, équipes au sol, ravitaillement → prompt réglé (paramètres
  `PROCHAINS_NUMEROS`, `SOUS_TYPE`, `RENDEZ_VOUS`, `TYPES_EQUIPES`, `ÉQUIPES_SOL`, `RAVITAILLEMENT`) copié, ChatGPT ouvert ; la commande est
  rapprochée de la mission générée (même série) à la relecture du dossier.
- **Comptes rendus de la mission** (fiche) : tous les CR de la mission (`CR<mission>-<vol>`, du plus récent au plus
  ancien), chacun ouvrant sa page de CR ; colonne **CR** (nombre de vols) ; une mission récurrente (ravitaillement sur
  SIMONE, dix fois par mois) reste disponible — « Nouveau CR (vol n) » prend le n° de vol suivant. Le CR renvoie à
  la mission (sous le champ « Mission » : lien vers le registre, `?mission=M-016`).
- **Mission mémorisée** : la mission affichée est gardée (`missionRegistrySelected:v1`) ; `?mission=M-016` la choisit.
  Le générateur et le studio ouverts depuis le registre affichent **← Registre (M-016)** dans l'en-tête.
- **Mission reçue dans le générateur** (fichiers ou collage de la réponse ChatGPT) : inscrite aussitôt au registre (la
  commande « commandée » devient « générée ») et rangée dans `data/missions/<lettre>_<FAMILLE>/<identifiant>/`
  (`mission<ID>.yaml`, `summary<ID>.md`) si le dossier des missions est autorisé ; sinon « Ranger dans le dossier des
  missions… » (demande l'autorisation). Noyau partagé : `MissionRegistryCore.record`.
- **Nettoyer le registre (n)** : relit le dossier puis retire les missions « fichier absent » (renumérotées, déplacées
  ou supprimées) ; statut, notes, date de vol, commande et CR passent à la mission qui les remplace (même `former_id`,
  sinon même titre, même type et même lettre d'équipe) quand elle est encore « générée ». Les commandes en attente
  restent.
- Données : `missionRegistry:v1` (navigateur, sauvegardé avec les données locales) et `data/missions/mission_registry.yaml` ;
  export CSV de la sélection.

## 2 ter. Durée estimée et route probable

`shared/mission_estimate.js` (`MissionEstimate`), affiché dans le générateur (bloc **Durée estimée**, recalculé à chaque
modification) et dans le registre (colonne **Durée est.**, fiche de la mission) :

- **Route probable** : origine → points dans l'ordre → **retour base** (destination, de préférence la base de départ).
  Ordre : `route_order` de la mission, sinon cheminement du profil vertical, sinon points tournants dans l'ordre et
  chaque point de travail (TARGET, rendez-vous, zones) après le point tournant le plus proche.
- **Appareil** : `aircraft[].cruise_speed_kt`, sinon profil du planificateur (même type OACI), sinon fiche EUROCONTROL
  APD (`AircraftDB/aircraft_perf.js`), sinon valeur type (hélicoptère, turbopropulseur, réacteur) ; niveau
  `cruise_level` / `vertical_profile.cruise` ; montée et descente aux varios du type, tronçons courts volés plus bas.
- **Temps sur place** : `time_on_task_min` des points (sinon valeur type selon la famille et le rôle : poser,
  treuillage, recherche, hippodrome…) ; approche + 2 à 5 min ; bloc = vol + mise en route et roulage.
- **Phases comme les CR** : aller, sur zone, retour, vol, bloc ; **options de retour** (`return_options` : hôpital
  selon l'état du patient, dégagement…) avec leur durée (fourchette) ; **briefs successifs** (`phases` B, C…) : la
  route suit la partie à partir de son point de déclenchement, heure de remise estimée (T + …) ; la durée annoncée
  par la mission (`timing`) est rappelée.
- **Comparaison avec les CR** de la mission (vol réel, écart, aller / sur zone / retour) ; dans le CR, sous le champ
  Mission : « vol estimé 1h48 — ce vol 2h05 (+17 min, +16 %) ».
- **Afficher la route probable** (case, mémorisée) : croquis de la route et des retours possibles (tireté),
  tableau des tronçons.
- Brief PDF : chaque partie B, C… sur sa propre page, « PLI À REMETTRE — à ouvrir : 10 min après RDV-1 ».

## 3. Générateur de mission (brief)

Page `apps/sia/mission_editor.html`.

1. **Importer une mission** : YAML et / ou Markdown d'une mission, ou **collage** de son contenu ; sous-bloc
   **Créer une mission avec ChatGPT** à côté du collage : **même bloc que « Commander une mission » du registre**
   (`shared/mission_order.js`, § 2 bis) — type, sous-type, théâtre(s) (second théâtre : acheminement Guyane – métropole,
   relève Corse – continent…), série, identifiant calculé, équipes DEFA en vol et aéronef de chaque équipe, rendez-vous,
   équipes au sol, ravitaillement ; réglages partagés (`missionRegistryOrder:v1`) ; « Commander » inscrit la mission au
   registre (« commandée »), copie le prompt réglé pour une seule mission et ouvre ChatGPT dans un nouvel onglet (coller,
   envoyer, puis charger ou coller `mission<ID>.yaml` et `summary<ID>.md`). Le prompt vient de
   [PROMPT_GENERATEUR_MISSIONS.md](PROMPT_GENERATEUR_MISSIONS.md), embarqué dans `apps/sia/mission_prompt.js` par
   `tools/build_mission_prompt.py` (relancé par `tools/bump_versions.py`) : pas de lecture réseau du dossier docs/.
   (« ou coller son contenu… », Markdown reconnu à ses titres `##`) (fusionnés, lecture commune avec le
   studio : `SiaMission.fromTexts`), et les cartes (PNG ou
   ZIP livré par le studio).
2. **Identification** : titre, numéro, série, type, sous-type, auteur, date, schéma.
3. **Textes de mission** : résumé, description détaillée, rubriques libres. Quand le fichier
   n'a ni résumé ni description, ils sont **proposés à partir des données** (à relire) : type,
   cible, zone, participants des rendez-vous, points tournants et rendez-vous avec
   coordonnées, consignes (`NOTES`) et, pour un ravitaillement, l'**axe ENR 5.7** (entrée, fin
   d'axe, route, longueur des branches, largeur, sens des virages).
4. **Toutes les données YAML** (bloc masqué par défaut) : éditeur sans schéma imposé, clés
   supplémentaires conservées.
5. **Cartes du dossier final** : ordre et légendes ; la carte d'assemblage passe en tête du PDF.

Exports : **YAML**, **Markdown**, **PDF final** (jsPDF : faits de la mission, aéronef,
coordination, résumé, description, risques, rubriques, cartes). Nom des fichiers :
`S<série>-M<numéro>_<TYPE>_<titre>` — par ex. `S1-M11_AIRLIFT_Pont_logistique_vers_Solenzara` ;
quand le titre n'est que « Mission 02 », la cible le remplace
(`M02_TRAINING_VAILLANT_31_Axe_SIMONE`).

**Mission partagée avec le studio** (`apps/sia/mission_store.js`) : un seul document (YAML, textes,
fichiers d'origine) avec numéro de révision, enregistré à chaque modification et relu aussitôt par
l'autre page ouverte — emprises appliquées, cartes ajoutées ou supprimées dans le studio
apparaissent dans le générateur (et dans ses exports YAML / Markdown / PDF), et inversement.

En-tête : **Transmettre au studio cartographique →** (ouvre le studio sur la mission partagée) et **Créer le
CR DEFA →** : nouveau compte rendu de la famille correspondant au type (MEDEVAC → HEMS,
AIRLIFT → AIRLIFT, AIR-TO-AIR REFUELLING → AAR, TRAINING → SPECIAL…), pré-rempli : nom et numéro, objectif, terrains de
départ / arrivée, points et coordonnées, appareils (type OACI du catalogue commun : A400M Atlas
→ A4M ; indicatif), exploitant, charge. Le CR demande confirmation avant de remplacer un
brouillon.

Brouillon : la mission partagée est le brouillon ; « Mémoriser / Recharger » l'enregistrent / le relisent.

## 4. Studio cartographique

Page `apps/sia/map_parser.html`. Une mission décrit ses cartes ; chaque carte est dessinée avec
un **profil d'affichage**, puis le studio produit PNG / SVG et un ZIP.

Blocs : 1. Mission (et boutons « Afficher toutes les cartes », « Générer les cartes et le ZIP ») ·
2. Profils d'affichage · 3. Cartes (aperçus, carte d'assemblage) · 4. Base de données SIA ·
5. Données complémentaires.

### 4.1 Mission (bloc 1)

Fichier Markdown / YAML ou **collage** dans la fenêtre commune (× / Fermer / Lire la mission →
Valider) : la mission devient la **mission partagée** avec le générateur ; à l'ouverture, le studio
reprend la mission partagée.

### 4.2 Cartes (bloc 3)

Aperçus de toutes les cartes et **carte d'assemblage** ; « Afficher toutes les cartes » et
« Générer les cartes et le ZIP » sont dans le bloc Mission (voir § 4.5). Type de sortie (PNG,
SVG éditable) et largeur des PNG : **menu ☰ › Sorties des cartes**.

### 4.3 Profils d'affichage (bloc 2)

À gauche, quatre onglets de réglages (Fond de carte, Zones, Symboles OACI, Éléments) ; à droite, la **carte de contrôle**, ses commandes, la liste
des cartes et le **profil de la carte choisie** (nom, **fond de carte**, Sauvegarder / Nouveau /
Dupliquer / Supprimer — « Nouveau » et « Dupliquer » affectent le profil à la carte choisie). Le
profil modifié est toujours celui de la carte sélectionnée dans la liste. Colonnes 60 / 40 réglables par la barre
de redimensionnement (double-clic : 60 / 40). Profils communs à toutes les missions, gardés dans
le navigateur et dans la sauvegarde locale de la suite.

**Fonds de carte** : fond local PNG ; raster OSM standard, OpenTopoMap (relief et courbes) ;
vectoriels OSM Shortbread, OpenFreeMap Liberty / Bright / Positron, VersaTiles Colorful /
Graybeard / Shadow / Eclipse.

- **Onglet Fond de carte** : couches OSM (sol, hydrographie, routes / rail, bâtiments,
  frontières — sur tous les fonds vectoriels ; relief ombré, courbes de niveau, sommets),
  libellés des sommets ; cadre **Villes et agglomérations**, trois lignes à curseur de population
  logarithmique (1 000, 2 000, 5 000, 10 000… habitants) : villes en **symboles OACI** (≥ 100 000
  hab. tache orange, ≥ 20 000 jaune cerclée d'orange, localité point jaune) au-dessus de leur
  seuil ; **libellés de villes** au-dessus du leur (les plus peuplées d'abord, sans recouvrement) ;
  **surfaces bâties** aucune / contour / remplissage (jaune) / les deux — contour orange autour des
  villes ≥ 100 000 hab., jaune autour des autres —, dessinées par le
  studio sur tous les fonds, seulement autour des villes au-dessus du troisième seuil (20 000 par
  défaut ; polygones d'occupation du sol OpenMapTiles /
  OpenFreeMap, visibles dès l'échelle régionale — les fichiers du SIA ne décrivent aucun contour
  d'agglomération). Points d'intérêt
  et numéros de rue masqués sur les fonds publiés.
- **Onglet Zones** : familles R / D / P, contrôlés (CTR, TMA, CTA, SIV), autres (TRA, RMZ, TMZ,
  PJE — parachutage), case « toutes » par famille ; toutes les zones (outre-mer compris) sont sélectionnables, seules celles de l'emprise affichée
  sont dessinées ; **opacité** des espaces, **libellés** des espaces (case) ;
  taille des libellés des espaces, **affichage des altitudes** (facultatif) ;
  **sélection des zones** :
  - **liste blanche** (seules les zones de la liste ; liste vide = toutes les zones des
    familles cochées) ou **liste noire** (toutes sauf celles de la liste) ;
  - ajout avec **complétion** sur toutes les familles, limites verticales indiquées ;
    **groupes** « R 166 — 4 zones (A1, A2, B, C) » (tout ce qui partage l'identifiant de base,
    sans confondre R 1 et R 12) ; **fragments** (« R 1 » : tout ce qui contient R1) ; zones
    déjà retenues retirées des choix ;
  - **Coller une liste** (une zone par ligne), **Tout supprimer**, puces supprimables avec le
    nombre de contours reconnus ;
  - **alias** communs aux profils (« @RTBA » : proposé d'après les zones publiées sur les
    cartes AZBA, modifiable ; autres alias à créer) ;
  - **zones retenues** listées à côté, triées par famille (R, P, D, CTR, TMA, SIV) puis par
    numéro (12 avant 118). Comparaison sans espaces, tirets ni accents (« LF-R 45 A » = « R 45 A ») ;
  - **tranche affichée** (plancher / plafond en ft) : seules les zones qui la recoupent ;
  - **symbologie des cartes OACI** (légende SIA / IGN au 1 : 500 000) : espaces contrôlés par
    classe (A bande rouge, B / C / D trait et bande bleus, E bande bleu clair, classe en carré dans
    le cartouche), R / D hachurées, P quadrillées, **RTBA** en bande rouge hachurée de blanc,
    croix rouge pour une zone trop petite à l'échelle (cochée par défaut), cartouches « nom /
    plafond / plancher » ;
  - **libellés sans recouvrement** : chaque cartouche est posé au centre de la zone, sinon le long
    de son contour ; celui qui ne trouve pas de place libre n'est pas écrit. Ordre : symboles des
    balises et aérodromes, puis libellés des zones (les plus grandes d'abord), puis valeurs MORA,
    décalées d'une case si elles recouvrent un symbole ou un libellé.
- **Onglet Symboles OACI** : **aérodromes** (piste en dur > 2300 m orientée, 1000–2300 m, < 1000 m, bande, hélistation ;
  ouvert à la CAP en bleu plein avec repères, restreint en clair, État en rouge ; **filtres** :
  civils ouverts à la CAP, restreints, État / militaires, hélistations, bandes / ULM, et
  contrôlés — tour ou situés dans une CTR — / non contrôlés) ;
  **radionavigation** (types au choix : VOR / VOR-DME, TACAN / VOR-TACAN, DME, NDB, **ILS** ;
  cartouche « (D) ROA 110.25 », nom en clair, rose au nord magnétique de taille réglable en vue
  détaillée ; **priorité** en cas de recouvrement entre balises : TACAN > VOR > DME > NDB > ILS >
  DME d'ILS (bout de piste) ; entre aérodromes : les plus grands et contrôlés d'abord ; une balise
  ne masque pas un aérodrome, elle est dessinée par-dessus) ;
  **listes** d'aérodromes et de balises (blanche / noire, complétion, « LFR* », fragment de nom),
  comme pour les zones ; cases « libellés » séparées ; **survol interdit** (installations portant une marque
  distinctive : au-dessous de 1000 m / 3300 ft, symbole ⊗ ; 198 sites de l'AIXM ; symboles non
  superposés, les plus grands sites d'abord) et parcs / réserves naturels (contour vert tireté,
  ou symbole vert pour les 117 que l'AIXM réduit à un point), dans le même cadre que les
  **obstacles** (≥ 300 / 500 / 1000 ft AGL, élevés, groupes, balisés de
  nuit, éoliennes ; cote AMSL et (hauteur) en vue détaillée ; regroupés à l'écran, le plus haut
  représentant le groupe).
- **Onglet Éléments** — un bloc par élément, réglages grisés quand il est décoché :
  points tournants (libellés 11 pt et couleur des libellés / du contour, taille et couleur de remplissage ; rouge par
  défaut) ; méridiens et parallèles (libellés en bordure en degrés
  et minutes) ; grille MORA (valeurs, opacité, espacement minimal) ; libellés des zones et des
  villes ; hippodrome de ravitaillement ; cercle de la zone de mission.

**Carte de contrôle** : la carte choisie de la mission, dessinée avec le profil **en cours de
modification**, actualisée à chaque réglage ; bouton ⤢ pour l'agrandir (Échap pour revenir),
bouton ⧉ pour l'ouvrir dans une **fenêtre séparée synchronisée** (même page réduite à la carte,
`#fenetre` ; mission, profils, alias et carte choisie transmis à chaque réglage).
Zones avec leurs libellés et limites (« R 69 — 800 ft ASFC – 2700 ft ASFC »), quadrillage, MORA,
hippodrome, points tournants, villes. La position (zoom, déplacement à la souris) est **conservée**
quand on change un réglage ; ⌂ revient à la position définie.

**Erreurs de fond de carte** : message expliqué (fond inaccessible, trop lent, moteur absent,
erreur inattendue), **secours** automatique sur OSM standard pour un fond vectoriel ou
OpenTopoMap, et bouton **Copier le rapport d'erreur** (détail technique à coller dans la
conversation de développement).

Sous la carte :

- **Commandes** : Refresh ; **Reprendre le cadre** (le cadre zoomé / déplacé à la souris devient
  l'emprise de la carte) ; ⌂ (revenir à la position définie) ; **Rétablir** (emprise de la mission) ;
  **Appliquer** (écrit l'emprise `bbox: [O, S, E, N]` dans la mission partagée) ; ⧉ fenêtre
  séparée ; ⤢ agrandir. Les valeurs de la mission sont gardées tant qu'on n'applique pas ; ✎ marque une carte
  dont l'emprise est modifiée.
- **Cartes de la mission**, une ligne chacune : affichage dans la carte de contrôle, **profil**
  (ou **Désactivé** : carte ni générée, ni prévisualisée, ni sur l'assemblage), case **ZIP** (cochée à chaque
  chargement de mission ; décochée : carte non générée, absente du ZIP, mais toujours prévisualisable et sur
  l'assemblage — le choix n'est pas enregistré dans la mission ; même case sur la carte de contrôle et sur chaque
  aperçu de « Afficher toutes les cartes »), suppression (×). Le bouton **Générer les cartes et le ZIP** est
  doublé dans le pied de page semi-fixe (collé en bas de la fenêtre, avec le nombre de cartes du ZIP).
- **+ Carte** : nouvelle carte (nom, type générale / cible / détail / zone) avec la vue affichée
  pour emprise, ajoutée à la mission partagée.

### 4.4 Base de données SIA (bloc 4) et données complémentaires (bloc 5)

Dossier SIA XML (mémorisé), inventaire des XML analysés, rechargement de la base mémorisée.
Bloc 5 : calcul de la grille MORA (§ 4.6), sources (GeoNames, SIA, IGN) et calibration du fond
local (utile au seul fond « PNG local »).

### 4.5 Production des cartes

- **Profil par carte** : proposé d'après la carte (détail, cible, rendez-vous → VFR détaillé ;
  mission dont le titre contient « IFR » → IFR ; sinon VFR simplifié), modifiable sous la carte de
  contrôle.
- **Emprise** : `bbox` de la mission, sinon centre + rayon / largeur × hauteur, sinon d'après le
  nom du fichier (général : tous les points ; cible ≈ 50 km ; détail ≈ 8 × 5 km ; zone).
- Aperçu de toutes les cartes, **carte d'assemblage** (emprises de toutes les cartes).
- **Générer les cartes et le ZIP** : PNG (largeur réglable) et / ou SVG ; chaque carte est
  indépendante — une carte en échec (fond indisponible, délai) n'arrête pas les autres : le ZIP
  contient les cartes réussies et `rapport_generation.txt`, et « Réessayer seule » relance la
  carte en échec. Un fond lent (OpenTopoMap) est utilisé tel quel, avec l'avertissement « fond
  partiel ».

### 4.6 Grille MORA

Grille de 1° × 1° **calculée** (valeurs non certifiées) : pour chaque cellule, le point le plus
haut entre le relief (tuiles Terrarium, AWS Terrain Tiles : passe à ~200 m puis relecture à
~25 m autour des maxima), les sommets OpenStreetMap (`natural=peak`, Overpass) et les obstacles
de l'AIXM SIA ; + 1000 ft (2000 ft au-delà de 5000 ft) ; arrondi à la centaine supérieure.
Sans les sommets OSM (Overpass indisponible), le relief est majoré de 100 m pour couvrir
l'écrêtage des sommets par le modèle de terrain. Le `mora.csv` versionné (150 cellules,
1000 à 18 100 ft) a été calculé ainsi.

Affichage : **valeurs seules**, centrées dans les carrés du quadrillage (notation 3⁵ = 3500 ft) ;
en zoom arrière, cellules fusionnées par 2 × 2 puis 4 × 4 en gardant la valeur la plus haute,
sous l'« espacement minimal » réglable.

La carte ENR 6.1 du SIA ne porte pas de grille MORA (ses valeurs sont celles de zones
irrégulières) : elle ne sert pas de source.

### 4.7 Hippodromes de ravitaillement en vol

`miam-enr-5-7-tracks.xml` (produit depuis le PDF MILAIP ENR 5.7, voir
[MANUEL_EXPLOITATION.md](MANUEL_EXPLOITATION.md)) donne, pour chaque axe, ARIP, ARCP, points
particuliers S1 (milieu) et S2 (largeur, côté). Géométrie exacte (`shared/aar_tracks.js`) :
branche aller IP → CP, branche retour décalée de la largeur (14 NM) du côté de S2, virages en
demi-cercles ; côté non publié (pas de S2) → tracé en pointillés.

**Hippodromes de la mission** (onglet Éléments, liste à cocher) : **Automatique** = l'axe dont le
plus de points sont à moins de 2 km d'un point de la mission, ou dont le nom figure dans la
mission (la raison est affichée : « SIMONE — SIMIP, SIMCP, S1, S2 à moins de 2 km »), et / ou
n'importe lesquels des 31 axes ; rien de coché = aucun hippodrome.

### 4.8 Profil vertical

Sous l'aperçu de la carte, cadre **Profil vertical** : un **cheminement** (virgules ou lignes)
fait de tous les points connus — points du brief (tout point du YAML avec coordonnées : points
tournants, cible, rendez-vous…, par id ou par nom), aérodromes (OACI), balises (VOR > TACAN > NDB >
DME), points RNAV / points de report de l'AIXM, **radiale / distance** « REN300010 » (balise REN,
radiale magnétique 300, 10 NM ; déclinaison de l'aérodrome le plus proche) ou coordonnées
« lat lon » —, chacun avec une **altitude prévue** facultative (`SIMIP/3000`, `TARGET/FL65`) ;
homonymes : le plus proche du point précédent. Sans cheminement enregistré, le studio **propose**
origine, points tournants dans l'ordre et destination ; les **points de la mission** (origine,
destination, cible, points tournants, rendez-vous) sont listés sous le champ, un clic les ajoute
(avant la destination si le cheminement s'y termine). Exemple : `LFOJ, BRY/4500, REN300010, SIMIP/3000, TARGET/FL65, SIMCP/5500, LFOT`.
« /3000 » = altitude à atteindre au point ; **groupes vitesse / niveau** du plan de vol
(`N0180A085`, `N0450F350`…) = niveau à partir du point ; **niveau seul** sur une ligne entre deux
points (`FL105`, `5500 ft`) = « on monte (ou on descend) au FL105 » après le point précédent
(exemple : `LFOT` / `FL105` / `SIMIP` / `SIMCP` / `FL065` / `LFOJ`) ; **VFR** = pas de niveau ; la case 15 d'un
plan de vol est acceptée. **Niveau de croisière** (`FL65` ou `6500`) : niveau par défaut dès le départ,
quand le cheminement n'en donne pas au premier point ; les altitudes du cheminement restent prioritaires.
Sans niveau ni altitude, la trajectoire n'est pas tracée (message sous le bouton). La **trajectoire prévue** (violet) monte selon l'**appareil** choisi parmi les
profils du Flight Performance & Fuel Planner (modèle de performances : vario et TAS selon l'altitude) et
descend à son vario ; à défaut, aux taux saisis (montée / descente en ft/min et kt) ; appareil et taux
enregistrés dans la mission ; **TOC** et **TOD** ; départ
et arrivée au sol, sauf altitude donnée pour ces points.
Le cheminement est **tracé sur les cartes** (tireté violet ; case cochée par défaut). **Tracé carte par carte**
(liste des cartes, `maps[].trace`) : *Sans tracé*, *Brief : cheminement* (tireté violet), *Organisation : route
probable* (trait orange, durée de vol, retours possibles en tireté avec leur durée — `shared/mission_estimate.js`),
ou les deux : une carte brief et une carte organisation dans la même mission. **↺ Route probable** (au-dessus du
cheminement) remplace le cheminement par la route probable : le profil vertical suit alors la route probable.

Le profil vertical est une **carte comme les autres** : entrée `profil_vertical.png` dans la liste
des cartes, avec son **profil d'affichage** (par défaut **Profil vertical**, créé automatiquement :
toutes les familles d'espaces, aucune autre case) ; la choisir montre le cheminement dans la carte
de contrôle et règle ce profil ; son emprise suit le cheminement.

**Tracer le profil** dessine la coupe (second aperçu, cliquable pour l'agrandir) : relief le long
du trajet (tuiles Terrarium z10, maximum sur ± 1 km), obstacles de l'AIXM à moins de 1 NM si le
profil les coche (trait, cote AMSL des plus hauts), espaces du profil traversés (bande plancher →
plafond, planchers / plafonds ASFC suivant le relief ; ceux entièrement au-dessus du plafond de la
coupe sont omis) avec les **libellés de tous** (place libre, sinon trait de rappel vers la bande),
points avec distances cumulées (NM, sur deux lignes si nécessaire) et altitude prévue (violet).
Plancher et plafond de la coupe réglables (plafond 0 = automatique : relief, obstacles, altitudes prévues et planchers
des espaces traversés jusqu'au FL 195). Case **Noms abrégés** (onglet Zones) : nom seul, sans le
type de zone, sur les cartes comme sur la coupe. La même coupe est proposée dans le **Flight
Performance & Fuel Planner** (route saisie ou importée de SimBrief, profil d'affichage du studio,
base SIA mémorisée par le studio) : voir [FLIGHT_PLANNER.md](FLIGHT_PLANNER.md).

Cheminement, niveau de croisière, plafond et case **« profil_vertical.png dans les sorties »** (cochée par défaut) sont enregistrés dans le
YAML de la mission (`vertical_profile: {route, cruise, ceiling_ft, output}`), donc partagés avec le
générateur ; l'image est ajoutée au ZIP (largeur des PNG) et le brief PDF la place après les cartes.

## 5. Stockage dans le navigateur

| Clé | Contenu |
|---|---|
| `siaMissionShared:v1` | **Mission partagée** générateur ⇄ studio (YAML, textes, révision) ; copie dans `missionGeneratorDraft` pour les anciennes versions |
| `siaOutput` | Sorties (PNG, SVG, largeur) |
| `siaMissionToCr:v1` | Mission transmise au CR DEFA (effacée à la lecture) |
| `siaDisplayProfiles` | Profils d'affichage |
| `siaZoneAliases` | Alias de zones |
| `siaProfileTab`, `siaProfileSplit` | Onglet ouvert, rapport des colonnes |
| IndexedDB `sia-map-parser` | Base SIA analysée (contours, villes, MORA, aérodromes, radionavigation, obstacles, axes) |

## 6. Services externes

Appelés seulement quand la fonction est utilisée : tuiles OpenStreetMap, OpenTopoMap,
OpenFreeMap, VersaTiles, relief Terrarium (AWS), Overpass API (sommets). Les données de mission
et SIA restent dans le navigateur et les fichiers choisis.
