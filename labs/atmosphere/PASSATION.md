# Passation — maquette « Atmosphère de la route » (à lire une seule fois, puis supprimer)

> **Session suivante : lisez ce fichier en entier, puis supprimez-le (`git rm labs/atmosphere/PASSATION.md`) dans
> votre premier commit sur cette branche.** Il n'a pas vocation à rester dans le dépôt.

## 1. La demande de l'utilisateur (texte d'origine, 24 octobre 2026)

> Tu as accès à framagit et github. Tu es un agent de conception pour le projet « /flight_planner » (user asr sur
> framagit, woyczek sur github)
>
> Tu sais déjà récupérer la météo, j'ai normalement mis les clef api sinon demandes les moi en variable d'env.
> Je veux avoir un graphe d'évolution de l'atmosphère, nuages, couches d'inversion de température, densité, etc. C'est
> une page autonome de maquette pour l'instant.
> Le module de plan de vol existe, tu dois récupérer les données geograpqhiques du trajet.
> Je veux voir la météo en tranches, le long du trajet, mais aussi en surface : aux altitudes demandées, planifiées,
> calculées (montée / descente), afficher sur la carte les courbes isobariques, température, les nuages.
> La maquette sera une page web, à pousser dans une branche dédiée.

Messages ajoutés en cours de travail :

- « 3 tokens en environnement : ivao, avwx, framagit. Plus sur demande. » — la première session ne voyait que la
  variable du jeton Framagit ; les jetons AVWX et IVAO n'y étaient pas.
- « Donnes-moi les url exhaustives j'ouvre. » puis « un FQDN par ligne. Je ne sais pas comment forcer un refresh de
  ton environnement pour les tokens. » — réponse donnée : liste ci-dessous ; un changement de réglages
  d'environnement (domaines, variables) ne vaut que pour une **nouvelle session**.
- « Tu mettras le prompt complet avec ton environnement le plus détaillé pour ne pas en perdre la trace (à ne lire
  qu'une seule fois, puis effacer) » — ce fichier.

## 2. Dépôt et branche

- Dépôt de travail : `framagit.org/asr/flight_planner` (public ; branche par défaut `master`). Miroir GitHub
  `woyczek/flight_planner` : avancé par la session ergonomie seulement (`.claude/agents/README.md`) ; non poussé ici.
- Branche : **`feature/atmosphere-route`**, tirée de `origin/develop` au commit `66cc22da` (develop = ligne V3 = `v3`).
  Rien sur `develop`, `v3` ni `master`.
- Règles à relire : `CLAUDE.md` (gitmoji, message en français, CHANGELOG en anglais sous « Unreleased »,
  `tools/format_sources.py` puis `tools/verify_format.html`, `?v=0`, quatre langues), `.claude/agents/README.md`
  (rôles, qui pousse quoi), `.claude/agents/v3-fuel.md` et `v3-maps.md` (propriétaires de la météo et des cartes).

## 3. Ce qui existe (fichiers de la maquette)

`labs/atmosphere/` : `index.html` (mise en page, jetons de couleur clair / sombre), `page.js` (chargements et
dessins), `atmo.js` (calculs purs), `demo.js` (jeu de démonstration au format d'Open-Meteo), `README.md` (en anglais :
contenu, sources, quota, limites). Entrée au `docs/CHANGELOG.md`.

Code de la suite réutilisé, sans le modifier : `modules/fuel/winds.js` (niveaux, conversions, `modelFor`,
`samples`), `modules/fuel/weather.js` (`station` : METAR / TAF → catégorie, plafond…), `frame/lib/metar.js`
(`decodeMetars`, `fromAvwxTaf`), `frame/lib/route_text.js` (`tokenize`, `formatLevel`), MapLibre de
`modules/maps/lib/`.

Données du trajet : le vol courant `pilot/<trigramme>/current_flight.json` (schéma : `modules/fuel/INTEGRATION.md`
§ 3 — `route.points[]` avec `alt_ft` des paliers, `level.ft`, `profile` de Carburant avec `tocNm` / `todNm`),
lu à `../../data/pilot/<TRI>/current_flight.json` quand le lanceur sert la page ; sinon l'exemple du schéma, un
fichier, ou un texte de route en coordonnées.

## 4. Choix faits (et interprétation de la demande)

- « En tranches le long du trajet » : coupe verticale le long de la route, plus une **tranche verticale**
  (sondage) choisie par clic, puce de point, ◀ ▶ ou ligne de la table.
- « En surface aux altitudes demandées, planifiées, calculées » : la **carte** à une altitude choisie — sol (niveau de
  la mer), niveau demandé, chaque palier planifié, niveaux fixes, ou trajectoire calculée (route colorée par la
  température rencontrée). Isobares : au sol, pression ramenée au niveau de la mer ; en altitude, **à altitude vraie
  constante** (pression interpolée sur les hauteurs géopotentielles), pour qu'elles se lisent comme au sol.
- Chaque lieu de la route est lu **à l'heure où le vol y passe** (départ + temps estimé, sans vent).
- TOC / TOD de Carburant utilisés seulement au niveau du vol ; à un autre niveau choisi dans la page, les taux et
  vitesses du profil.
- Le poids des demandes Open-Meteo est réduit : la grille de la carte ne lit que les niveaux qui encadrent les
  altitudes proposées (`bracketLevels`) ; la carte arrive après la coupe (sa demande peut prendre ~30 s).
- Écarts assumés avec `CLAUDE.md` : maquette **en français seulement** ; notifications par un toast local (pas
  `AppFramework.notify`, la page étant hors du cadre).

## 5. Ce qui a été vérifié

- Chromium sans interface (Playwright), dépôt servi par `python3 -m http.server 8790 --bind 127.0.0.1` depuis la racine :
  - **démonstration** (`?donnees=demo`) : aucune erreur JavaScript ; coupe, carte (sol, niveau demandé, palier,
    trajectoire, FL100), tranche, infobulles, table, terrains, changement de niveau, texte de route ;
  - **prévision réelle** : chargée une fois de bout en bout (Météo-France AROME / ARPEGE ; METAR réels de
    metar.vatsim.net cohérents avec la prévision : QNH 1022 contre Q1021 à LFRS) ; ensuite le réseau de la session a
    coupé Open-Meteo par intermittence, puis le **quota quotidien gratuit** de l'adresse de sortie a été atteint
    (« Daily API request limit exceeded ») — la page l'annonce désormais en clair ;
  - `tools/format_sources.py` passé, `tools/verify_format.html` : « 4 bloc(s) : aucun écart ».
- **Non vérifié** : TAF par avwx.rest (pas de clé dans la session), clé client Open-Meteo, lecture du vol courant
  par le lanceur, mode sombre à l'œil.

## 6. Pour la session suivante

Prérequis d'environnement (réglages de l'environnement cloud, puis nouvelle session) — domaines, un par ligne :

```
api.open-meteo.com
customer-api.open-meteo.com
metar.vatsim.net
avwx.rest
aviationweather.gov
tiles.openfreemap.org
```

Variables d'environnement proposées pour les jetons (jamais dans le dépôt ni dans un message) : `AVWX_TOKEN`,
`IVAO_TOKEN` ; le jeton Framagit existe déjà. Dans la page, la clé avwx est celle de l'appareil (Réglages de la
suite) ; pour un essai automatisé, la poser dans `localStorage['githubData:avwx']` du navigateur de test.

À faire, au choix de l'utilisateur :

1. Lui faire relire la maquette (lien Framagit de la branche) et recueillir ses retours.
2. Vérifier en réel : TAF avwx, vol courant servi par le lanceur, autres modèles (ICON, GFS) avec une route hors de
   France.
3. Intégration V3 (avec la session ergonomie et `v3-fuel` / `v3-maps`) : module ou étape de Carburant, quatre
   langues par `K.t`, réseau par `ctx.net` (relais du lanceur), noms de points par aerodb, temps de passage avec le
   vent, cache sur l'appareil comme `cache/fuel/aloft.json`.
4. Idées non faites : émagramme oblique (skew-T) avec parcelle et CAPE, turbulence en air clair (cisaillement),
   heure de départ variable en animation, export PNG du dossier.
