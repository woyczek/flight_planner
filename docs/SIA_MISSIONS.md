# Missions SIA — générateur de mission et studio cartographique

Dossier `SIA XML/` — ☰ › **Générateur de mission (SIA)** et ☰ › **Studio cartographique (SIA)**.
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

Code : les deux pages, `SIA XML/aero_symbols.js` (lecture de l'AIXM : aérodromes, pistes,
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
| `sia-airspaces-<date>.xml` | Contours d'espaces (SIV et compléments) | hors dépôt |
| `XML_SIA_<date>.xml` | Export XML-SIA complet (inventaire) | hors dépôt |
| `miam-enr-5-7-tracks.xml` | **Axes de ravitaillement** MILAIP ENR 5.7 nommés et corrigés (31 axes + 6 circuits heavy) | versionné |
| `miam-enr-5-7-coordinates.xml` | Coordonnées ENR 5.7 d'origine (sans noms) | versionné |
| `mora.csv` | **Grille MORA** 1° × 1° calculée (§ 4.6) | versionné |
| `villes_geonames.csv` | Villes (GeoNames cities500, CC BY 4.0) | versionné |
| `Carte france vierge.png` | Fond local (Lambert, calibré ouest −6,5° / sud 40,5° / est 12,5° / nord 52°) | versionné |

Les données AIRAC se téléchargent sur le site du SIA (produits numériques, export XML) et se
déposent dans le dossier `SIA XML/` ; `.gitignore` les tient hors du dépôt.

**Dossier mémorisé** : « Dossier SIA XML : … » (studio, bloc 1) choisit le dossier une fois ;
il est retenu comme les autres dossiers de la suite (☰ › Paramétrage) et les sélecteurs de
fichiers des deux pages s'y ouvrent. « Relire le dossier » après un nouveau cycle AIRAC. La base
analysée (contours, villes, MORA, obstacles, axes ENR 5.7) est gardée dans le navigateur
(IndexedDB `sia-map-parser`) : le studio s'ouvre sans relire les 80 Mo d'XML. Une base d'une
version précédente est relue automatiquement si l'accès au dossier est déjà accordé.

## 2. Format des missions

Schéma YAML `helo-xp-mission` (exemples : `Missions/AIRLIFT_serie_1_precomplete/mission11.yaml`,
`Missions/MEDEVAC_serie_*`) :

| Clé | Contenu |
|---|---|
| `schema`, `schema_version` | `helo-xp-mission`, `1.0` |
| `mission` | `series`, `number`, `id`, `type` (AIRLIFT, MEDEVAC, TRAINING…), `subtype` |
| `title`, `summary`, `detailed_description` | Titre et textes du brief |
| `aircraft` | `type`, `callsign`, `operator`, `role` |
| `origin`, `destination`, `target` | `name` (code OACI entre parenthèses : « BA 123 Orléans-Bricy (LFOJ) »), `lat`, `lon` |
| `turning_points`, `rendezvous` | `id`, `name`, `lat`, `lon`, `role`, `participants` |
| `teams` | Équipes (nom, service, département, type — un aéronef connu devient appareil du CR) |
| `payload`, `objectives`, `risks`, `notes`, `zones` | Charge, objectifs, risques (conséquence / parade), consignes |
| `maps` | Cartes à produire : `filename`, `type` (general, target, detail, zone…), `description`, emprise (`bbox`, ou `centre_ref` + `range_km` / `width_km` × `height_km`) |
| `rendering` | `north_up`, `draw_routes`, `add_markers`, `attribution_required` |

Le **Markdown** est accepté aussi : titres `## Summary` / `## Description détaillée`, ou ancien
format à blocs (`TYPE:`, `SOUS-TYPE:`, `TARGET:`, `TURNING POINTS:` avec lignes
`- PT1 | SIMIP | 46.444167 | 1.486000 | rôle`, `RDV:`, `ZONE:`, `MAPS TO PRODUCE:`, `NOTES:`) —
exemple : `SIA XML/Mission 02.md` (ravitaillement en vol sur l'axe SIMONE).

Le Markdown des missions générées (`summaryNN.md`) porte aussi ses données, lues même sans le YAML :
lignes `Type :`, `Sous-type :`, `Aéronef :`, `Callsign :`, `Départ :`, `Destination :` (avec
« — lat, lon » éventuel) de l'introduction, tableau `## Points tournants`, liste `## Rendez-vous`
(`**RDV-1 — Nom** — lat, lon — participants : A, B — rôle`), tableau `## Équipes engagées`,
`## Charge / personnel`, objectifs, `## Ravitaillement en vol` (`- clé: valeur`), risques. Le YAML
prime quand les deux sont chargés. La cible et les zones n'ont pas de coordonnées dans ce Markdown
(elles viennent du YAML) ; les Markdown MEDEVAC n'ont que textes, équipes et risques.

**Une mission par chargement** : `missionNN.yaml` et / ou `summaryNN.md` d'un même numéro. Une
sélection de plusieurs missions (dossier de série entier) est refusée avec un message ; les fichiers
annexes d'une série (`maps_manifest.md`, `AAR_TRACKS_REFERENCE.md`, `VALIDATION.txt`, consignes)
sont ignorés et signalés.

## 3. Générateur de mission (brief)

Page `SIA XML/mission_editor.html`.

1. **Importer une mission** : YAML et / ou Markdown d'une mission (fusionnés, lecture commune avec le
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

**Mission partagée avec le studio** (`SIA XML/mission_store.js`) : un seul document (YAML, textes,
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

Page `SIA XML/map_parser.html`. Une mission décrit ses cartes ; chaque carte est dessinée avec
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
  points tournants (libellés, taille) ; méridiens et parallèles (libellés en bordure en degrés
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
  (ou **Désactivé** : carte ni générée, ni prévisualisée, ni sur l'assemblage), suppression (×).
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
(`N0180A085`, `N0450F350`…) = niveau à partir du point ; **VFR** = pas de niveau ; la case 15 d'un
plan de vol est acceptée. **Niveau de croisière** (`FL65` ou `6500`) : niveau par défaut dès le départ,
quand le cheminement n'en donne pas au premier point ; les altitudes du cheminement restent prioritaires.
Sans niveau ni altitude, la trajectoire n'est pas tracée (message sous le bouton). La **trajectoire prévue** (violet) monte selon l'**appareil** choisi parmi les
profils du Flight Performance & Fuel Planner (modèle de performances : vario et TAS selon l'altitude) et
descend à son vario ; à défaut, aux taux saisis (montée / descente en ft/min et kt) ; appareil et taux
enregistrés dans la mission ; **TOC** et **TOD** ; départ
et arrivée au sol, sauf altitude donnée pour ces points.
Le cheminement est **tracé sur les cartes** (tireté violet ; case à décocher).

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

Cheminement, niveau de croisière, plafond et case **« profil_vertical.png dans les sorties »** sont enregistrés dans le
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
