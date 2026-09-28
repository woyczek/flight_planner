# Intégration de l'application « SIA XML » — analyse et plan

Notes de conception de l'intégration (2026-09-24 / 25). **Documentation de l'application :
[SIA_MISSIONS.md](SIA_MISSIONS.md).** Tout le plan du § 2 est réalisé : en-tête et menu communs,
blocs, thème `sia` et `assets/favicon-sia.svg`, js-yaml commun, dossier SIA mémorisé
(`FileAccess`, `__sia`), collage de mission et de listes de zones (`pastePanel`), couche des
hippodromes, passerelle vers CR DEFA (`?from=sia`, `siaMissionToCr:v1`,
`MissionVocab.familyForType`, `fromSia` dans `core.js`). Évolutions ensuite : profils d'affichage
(onglets, carte de contrôle), sélection des zones (listes, groupes, alias RTBA), grille MORA
calculée (l'import de la carte ENR 6.1 est abandonné : elle n'a pas de grille), générateur
Python et pdf.js retirés. Le tableau du § 1 décrit l'état **initial** du dossier.

## 1. Ce que contient le dossier

| Élément | Rôle |
|---|---|
| `mission_editor.html` — « Générateur complet de mission » | Import YAML (`schema: helo-xp-mission`) / Markdown de mission, identification, textes, éditeur YAML sans schéma, cartes du dossier (ZIP livré par le générateur de cartes), export Markdown et **PDF** (jsPDF). Brouillon : `missionGeneratorDraft` ; passage au générateur de cartes : `missionGeneratorHandoff`. |
| `map_parser.html` — « Studio cartographique aéronautique SIA » | Dossier SIA XML (sélection de dossier, base mémorisée en IndexedDB `sia-map-parser`), fond (PNG local, OSM raster ou vectoriel MapLibre, couches réglables), mission (MD / YAML), zones R / D / P, CTR, TMA…, MORA (CSV / PDF), villes (GeoNames), sorties **SVG / PNG / ZIP** et carte d'assemblage. Réglages : `siaMapSource`, `siaOsmLayers`, `siaCities`, `siaPopulation`, `siaDetailLayerProfile`, `siaFolderName`. |
| Données SIA (AIRAC 2026-10-01) | `XML_SIA_2026-10-01.xml` (27 Mo), `AIXM4.5_all_FR_OM_2026-10-01.xml` (44 Mo), `sia-airspaces-2026-10-01.xml` (6 Mo), `miam-enr-5-7-coordinates.xml` (MILAIP ENR 5.7 : axes de ravitaillement), `mora.csv`, `villes_geonames.csv`, fonds `Carte france vierge*.png`. |
| Bibliothèques | `maplibre-gl.js/.css`, `pdf.min.js` + worker, `jspdf.umd.min.js`, `js-yaml.min.js` (doublon de `shared/mission_core/vendor/js-yaml.min.js`). |
| `.git` propre | **Dépôt git imbriqué** (2 commits, PNG en Git LFS) — à décider avant intégration (§ 4). |
| Sauvegardes `*.backup-20260924-*.html` | Versions intermédiaires (à ne pas intégrer). |

Données de test : `examples/missions/Mission 02.md` (ravitaillement en vol, axe SIMONE, patrouille
MISTRAL 41/42 + tanker VAILLANT 31), `data/missions/AIRLIFT_serie_1_precomplete/` (missions 11 à 15 :
YAML `helo-xp-mission`, résumés, `maps_manifest.md`), `data/missions/MEDEVAC_serie_1..3_OSM/` (cartes
produites : général, cible, détail cible, zone, assemblage).

## 2. Intégration dans la suite (plan — réalisé)

1. **Emplacement** : garder `apps/sia/` comme dossier de l'application (menu ☰ : « Missions SIA ›
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

### XML corrigé et nommé depuis le PDF MILAIP

Le XML d'origine étant incomplet (pas de noms, points EPT mêlés), un second fichier est produit
depuis le PDF officiel (`MIAM_OACI_ENR 5.7.pdf`, AMDT 10/24 du 05 SEP 24, pages 1 à 5) :
`data/sia/miam-enr-5-7-tracks.xml` (le fichier d'origine est conservé).

- `parseEnr57(textePages)` (texte extrait par pdf.js) : points DMS nommés et minutes décimales,
  **comparés** ; axes IP / CP / points particuliers ; noms complets (colonne du tableau : SIM →
  SIMONE, SCY → STACY) ; renvois communs à toutes les pages (3, 8, 9 : 30 NM ; 5 : 40 NM ;
  4 : « ne pas dégager à l'ouest » ; 6, 11) ; axes « heavy » FOXnn → ROMnn par paires.
- Règles de la MILAIP : lignes droites **48 NM** sauf renvoi (30 NM pour la page 4), **largeur
  14 NM** (distance entre deux points particuliers) ; **côté** donné par S2 — inconnu sans S2
  (16 axes : YVETTE, OLIVIA, ZOE, FABIOLA, TANIA, NADIA, KATIA, URSULA, REGINA, VIVIANE, ZORA,
  VALENTINA, TIPHAINE, OCEANE, STEPHANIE, ALOHA).
- `toXml(résultat)` → XML 2.0 (`miam:Track name kind page lengthNm expectedLengthNm widthNm
  heading side remark`, points avec rôle ARIP / ARCP / S1 / S2 et leurs deux écritures
  d'origine, liste `miam:issues`) ; `parseTrackXml(xml)` le relit ; `trackRacetrack(axe)` trace.
- Résultat : 31 axes + 6 circuits heavy. **Anomalies du PDF** relevées :
  AMEIP (DMS 000°45'43.80W recopiée de LUCIP ; minutes décimales 000°23.87'W retenues → AMELIE
  30,1 NM) et A1 (0,3 NM, minutes décimales retenues) ; TANIA, NADIA, KATIA, REGINA, TIPHAINE
  mesurent 30 NM sans renvoi ; URSULA 30 NM pour un renvoi « 40 NM » et U à 3,7 NM du milieu ;
  LUCIE 36,9 NM pour 30 NM (L1 à 2,9 NM du milieu) ; DIANA 49,5 NM (D1 à 0,7 NM du milieu).

## 4. Réponses (2026-09-24)

1. Dépôt imbriqué : historique rejoué linéairement sous `apps/sia/`, `.git` imbriqué supprimé.
2. Données AIRAC hors dépôt (`.gitignore`).
3. XML incomplet : corrigé par le XML nommé ci-dessus.
4. Largeur : dans le PDF (14 NM) ; côté : seulement quand S2 existe.
5. Sauvegardes `*.backup-*` et générateur Python en ligne de commande supprimés (remplacé par le
   studio).
