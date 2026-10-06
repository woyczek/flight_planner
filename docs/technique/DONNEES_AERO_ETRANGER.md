# Données aéronautiques hors de France — sources possibles

*[← Documentation technique](README.md)* · Recherche du 6 octobre 2026 : équivalents des données SIA (AIXM 4.5 « all
FR », XML_SIA) et DIRCAM / MILAIP (RTBA, AZBA, ENR 5.7) pour le Royaume-Uni, le reste de l'Europe et les États-Unis.
**[V]** = vérifié sur le site ; **[?]** = non confirmé, à vérifier avant de développer.

## Dans la suite (6 octobre 2026)

Réalisé : lecteurs AIXM 5.1, GeoJSON (openAIP, FAA ADDS, générique), OpenAir et X-Plane (`shared/aero_sources.js`),
lus par la base SIA (`shared/sia_base.js`, version 16) ; sources actives ou non dans Paramètres › Maintenance ›
Données aéronautiques ; téléchargements ENAIRE, FAA (zones, routes MTR, classes) et openAIP par
`tools/aero_fetch.py` (lanceur : `POST /__setup/aero-fetch`). Essais : Espagne (520 espaces, 147 balises, 901 tronçons),
États-Unis (1 542 zones, 3 654 segments MTR), Belgique et Luxembourg (openAIP), avec le SIA du cycle 2026-10-01.
À faire : Royaume-Uni (fichier NATS à déposer à la main ; zones de vol à basse altitude de la Mil AIP à extraire des
PDF, comme l'ENR 5.7) ; format exact de `earth_mora.dat` à confirmer sur un X-Plane 12 installé.

## Royaume-Uni

- **Civil — NATS pour la CAA** (<https://nats-uk.ead-it.com/cms-nats/opencms/en/Publications/digital-datasets/>) :
  « UK ICAO AIP Dataset » au cycle AIRAC, obstacles, VRP, SRD, zones UAS ; **AIXM 5.1** (plus KML, XLS, CSV) **[V]**.
  Téléchargement après inscription **[V]**, gratuite probablement ; conditions de réutilisation non lues **[?]**.
- **Militaire — UK Mil AIP (No 1 AIDU)** (<https://www.aidu.mod.uk/aip/aipVolumes.html>) : accès libre, **Open Government
  Licence v3.0** (redistribution avec attribution) **[V]** ; **PDF seulement** — ENR 5.2 (zones d'exercice), ENR 6-15 / 6-16
  (Low Flying Areas jour / nuit) **[V]**. Données numériques réservées aux usages militaires **[?]**. À extraire du PDF,
  comme notre ENR 5.7. Le réseau basse altitude britannique est fait de zones, pas de routes comme le RTBA.

## Reste de l'Europe

- **EUROCONTROL EAD** : EAD Basic gratuit (PDF d'AIP seulement) ; AIXM 5.1 réservé aux signataires d'un accord, EAD Pro
  sous licence annuelle **[V]** — hors de portée d'une suite de loisir.
- **Allemagne (DFS)** : AIP consultable gratuitement (<https://aip.dfs.de/basicAIP/>) **[V]** ; jeux AIXM 5.1.1 signalés
  par EUROCONTROL, accès et licence inconnus **[?]**.
- **Espagne (ENAIRE)** (<https://aip.enaire.es/AIP/DatosDigitales-en.html>) : AIXM 5 (espace aérien, en route,
  aérodromes, obstacles, terrain) et CSV, au cycle AIRAC **[V]** ; réutilisation encadrée **[?]**.
- **Italie (ENAV)** : eAIP sur inscription gratuite **[V]** ; flux AIXM (SWIM) probablement sous contrat **[?]**.
- **Pays-Bas (LVNL)** (<https://geoportaal.lvnl.nl/datasets>) : CSV, KML, GeoJSON gratuits **[V]**.
- **Militaire** : zones R / D / TRA / TSA dans les jeux civils ; aucun équivalent numérique public du RTBA trouvé **[?]**.

## États-Unis (FAA) — domaine public

- **NASR** (abonnement de 28 jours, sans compte) : AIXM 5.1, espaces à usage spécial (SAA) en AIXM 5.0, CSV, shapefile ;
  **routes d'entraînement militaire (MTR IR / VR / SR)** en CSV **[V]**. Téléchargement manuel (le site refuse les robots).
- **CIFP** (ARINC 424) gratuit, cycle de 28 jours **[V]**.
- **ADDS — ArcGIS Open Data** (<https://adds-faa.opendata.arcgis.com/>) : espaces à usage spécial (MOA, R, W, A, P),
  segments MTR, classes d'espace, balises et points, en **GeoJSON**, CSV, KML, shapefile **[V]** ; CORS probable **[?]**.

## Agrégateurs

- **openAIP** : **CC BY-NC 4.0** (non commercial, attribution) **[V]** ; exports quotidiens par pays en GeoJSON / OpenAir
  (`https://s3.openaip.net/openaip-system-exports/{cc}_{layer}.geojson`), types MTA, MTR, TRA, TSA compris **[V]** ;
  qualité inégale (données communautaires) ; CORS non testé **[?]**.
- **OurAirports** (<https://ourairports.com/data/>) : domaine public, aérodromes, pistes, balises ; pas d'espaces **[V]**.
- **X-Plane** : données de navigation du simulateur (earth_nav, fix, awy, **earth_mora.dat** : grille MORA mondiale) —
  à lire chez l'utilisateur seulement, licence non précisée **[?]**.
- **Navigraph / Jeppesen** : licence personnelle, sans diffusion ; lecture chez l'utilisateur seulement **[V]**.

## Recommandation

- Garder le modèle actuel : le fichier est **téléchargé par l'utilisateur** et importé (dossier mémorisé), sans
  requête de la page vers les sites officiels.
- Ajouter un **lecteur AIXM 5.1** générique : Royaume-Uni, Espagne, Allemagne (si accessible), États-Unis en partie.
- **États-Unis** : le plus simple et le plus complet — GeoJSON ADDS (SUA, MTR, classes) et NASR ; les **MTR** sont
  l'équivalent le plus proche du RTBA ; domaine public : des extraits peuvent même être livrés avec la suite.
- **Royaume-Uni** : AIXM 5.1 de NATS ; militaire en PDF (OGL), à extraire.
- **Reste de l'Europe** : **openAIP** par pays (usage non commercial, attribution), complété par l'AIXM national quand il
  est libre ; militaire : zones R / D / TRA / TSA seulement.
- **Grille MORA** : calculée comme aujourd'hui, ou lue dans `earth_mora.dat` de X-Plane chez l'utilisateur.
- **À vérifier avant de développer** : conditions de réutilisation NATS, CORS d'ADDS et d'openAIP, licence DFS.
