# Intégration de l'application « SIA XML » — analyse et plan

État au 2026-09-24 : **analyse seulement**, aucun fichier du dossier `SIA XML/` n'est modifié
(application en cours de développement). Préparé hors du dossier : `shared/aar_tracks.js`
(géométrie des hippodromes de ravitaillement en vol), testé sur les données réelles.

## 1. Ce que contient le dossier

| Élément | Rôle |
|---|---|
| `mission_editor.html` — « Générateur complet de mission » | Import YAML (`schema: helo-xp-mission`) / Markdown de mission, identification, textes, éditeur YAML sans schéma, cartes du dossier (ZIP livré par le générateur de cartes), export Markdown et **PDF** (jsPDF). Brouillon : `missionGeneratorDraft` ; passage au générateur de cartes : `missionGeneratorHandoff`. |
| `map_parser.html` — « Studio cartographique aéronautique SIA » | Dossier SIA XML (sélection de dossier, base mémorisée en IndexedDB `sia-map-parser`), fond (PNG local, OSM raster ou vectoriel MapLibre, couches réglables), mission (MD / YAML), zones R / D / P, CTR, TMA…, MORA (CSV / PDF), villes (GeoNames), sorties **SVG / PNG / ZIP** et carte d'assemblage. Réglages : `siaMapSource`, `siaOsmLayers`, `siaCities`, `siaPopulation`, `siaDetailLayerProfile`, `siaFolderName`. |
| `generate_operational_map.py` + `README-map-generator.md` + `example_map_request.json` | Générateur de carte en ligne de commande (ImageMagick), ancêtre du studio. |
| Données SIA (AIRAC 2026-10-01) | `XML_SIA_2026-10-01.xml` (27 Mo), `AIXM4.5_all_FR_OM_2026-10-01.xml` (44 Mo), `sia-airspaces-2026-10-01.xml` (6 Mo), `miam-enr-5-7-coordinates.xml` (MILAIP ENR 5.7 : axes de ravitaillement), `mora.csv`, `villes_geonames.csv`, fonds `Carte france vierge*.png`. |
| Bibliothèques | `maplibre-gl.js/.css`, `pdf.min.js` + worker, `jspdf.umd.min.js`, `js-yaml.min.js` (doublon de `shared/mission_core/vendor/js-yaml.min.js`). |
| `.git` propre | **Dépôt git imbriqué** (2 commits, PNG en Git LFS) — à décider avant intégration (§ 4). |
| Sauvegardes `*.backup-20260924-*.html` | Versions intermédiaires (à ne pas intégrer). |

Données de test : `SIA XML/Mission 02.md` (ravitaillement en vol, axe SIMONE, patrouille
MISTRAL 41/42 + tanker VAILLANT 31), `Missions/AIRLIFT_serie_1_precomplete/` (missions 11 à 15 :
YAML `helo-xp-mission`, résumés, `maps_manifest.md`), `Missions/MEDEVAC_serie_1..3_OSM/` (cartes
produites : général, cible, détail cible, zone, assemblage).

## 2. Intégration dans la suite (à faire au « go »)

1. **Emplacement** : garder `SIA XML/` comme dossier de l'application (menu ☰ : « Missions SIA ›
   Générateur de mission », « Missions SIA › Studio cartographique »), thème et favicon existants
   (favicon SVG en ligne des pages → fichier `assets/`).
2. **En-tête du framework** : `<header>` avec `<h1>`, `repository_tree` en tête,
   `repository_nav.js`, `content_i18n.js`, `app_framework.js` en fin de page ; le bouton
   « Transmettre au générateur de cartes » et le lien retour passent dans la barre d'en-tête ou
   dans les actions du menu ☰ (`RepositoryNav.addAction`).
3. **Blocs masquables / déplaçables** : envelopper les `<section>` dans un `<main>` (le framework
   ne gère que les blocs d'un `<main>`), un `data-block-id` stable par section, blocs secondaires
   masqués par défaut (`data-default-hidden="1"` : sauvegardes intermédiaires, XML analysés…).
4. **Composants communs** au lieu des doublons : `js-yaml` du framework ; sélecteur de dossier
   → `FileAccess` (dossier « SIA XML » mémorisé et affiché, ouverture des fichiers dans ce dossier) ;
   zone « coller son contenu » → `FileAccess.pastePanel` (× / Fermer / Charger → Valider) ;
   sauvegarde locale (`browser_store`) des brouillons et réglages.
5. **Hippodromes de ravitaillement** (voir § 3) : dans le studio, couche « Axes AAR (ENR 5.7) »
   dessinée depuis `miam-enr-5-7-coordinates.xml` avec `AarTracks` ; dans une mission, l'axe
   désigné (SIMONE, point SIMIP / S1…) est retrouvé par proximité et tracé exactement.
6. **Passerelles avec CR DEFA** : la mission générée (`helo-xp-mission`) pré-remplit un CR
   (famille d'après `mission.type`, terrains, points tournants, appareils / indicatifs) ; le
   catalogue commun fournit appareils et indicatifs (VAILLANT, MISTRAL…).
7. Documentation (`docs/SIA_XML.md`, README, changelog) et version.

## 3. Hippodromes de ravitaillement en vol — géométrie exacte

`miam-enr-5-7-coordinates.xml` : 126 points de la MILAIP ENR 5.7, par page, dans l'ordre du
document, **sans nom** d'axe. Les points d'un axe se suivent : **IP** (entrée), **CP** (fin d'axe),
**S1** (milieu exact de l'axe), puis parfois **S2**, décalé **perpendiculairement** à l'axe depuis S1 :
centre de la branche retour, donc **largeur** et **côté** du circuit.

Exemple vérifié — SIMONE (Mission 02) : SIMIP 46,444167 / 1,486 → SIMCP 47,231833 / 1,689 :
**48 NM au 010°**, S1 au milieu (44,5 km de chaque extrémité), S2 à **14,1 NM au 280°** →
branche retour à l'**ouest**, virages en demi-cercles de 14,1 NM de diamètre. S2 tombe au milieu
de la branche retour calculée à 117 m près.

Inventaire : 25 axes reconnus (48 NM et 30 NM), dont 4 avec largeur mesurée (S2) ; 47 points
restants (zones EPT en quadrilatères de la page 5, groupes irréguliers) à traiter à part.

`shared/aar_tracks.js` : `parsePages(xml)`, `groups(pages)` (IP / CP / S1 / S2, tolérances),
`racetrack(axe, { defaultWidthNm, defaultSide })` → cap, longueur, largeur, côté, contour
(polygone), branche retour ; `toGeoJson(tracks)` pour MapLibre / SVG ; `nearest(tracks, point)`
pour retrouver l'axe d'un point de mission.

## 4. Questions avant le « go »

1. **Dépôt imbriqué** `SIA XML/.git` : fusionner son historique dans le dépôt de la suite
   (`git subtree`), l'intégrer sans historique, ou le garder séparé (sous-module) ?
2. **Données SIA** (~ 80 Mo par cycle AIRAC) : les laisser hors du dépôt (chargées par le
   sélecteur de dossier, comme aujourd'hui) — recommandé — ou les versionner (Git LFS) ?
3. **Noms des axes ENR 5.7** : le XML n'en contient pas ; table de noms à constituer (depuis le
   PDF MILAIP) — qui la fournit, et sous quelle forme ?
4. **Axes sans S2** (21 sur 25) : largeur et côté par défaut (proposition : 10 NM, virages à
   droite) ou valeurs de la MILAIP à saisir dans la table des noms ?
5. **Fichiers `*.backup-*`** et `generate_operational_map.py` : à exclure de l'intégration ?
