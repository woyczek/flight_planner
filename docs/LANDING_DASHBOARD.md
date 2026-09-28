# Landing Performance Dashboard

Page : `apps/landing/LandingPerformance_Dashboard_MultiCSV_i18n.html` — ☰ ›
Landing Performance Dashboard. Application autonome de la suite : analyse de la qualité des
atterrissages (score, taux de chute, G…) à partir des journaux exportés du simulateur, par
avion et dans le temps.

Code : la page elle-même (thème sombre « landing »), `shared/landing_ui.js` (actions du menu
☰, langue), composants du framework : bandeau et menu ☰, blocs déplaçables / masquables,
**période TimePeriod** (voir [FRAMEWORK.md](FRAMEWORK.md)). Bases partagées :
`AircraftDB/aircraft_db.js` et `aircraft_icons.js`. Le script de mise à jour de la base
d'aéronefs utilisée par la page est documenté dans
[apps/landing/README.md](../apps/landing/README.md).

## 1. Données

- **Fichier** : « Choose file » (ou glisser-déposer) — CSV ou LOG. Deux formats reconnus :
  - **riche** : score source, FPM, G, vitesse sol, assiette, inclinaison… — la progression est
    évaluée surtout sur le score ;
  - **historique réduit** (sans score ni G final) : la progression est estimée à partir du
    taux d'atterrissage brut, de la qualité d'arrondi, du taux de tangage et du flottement ;
    les colonnes Metric2, Metric6 et Metric7 ne sont pas interprétées.
- Le dernier fichier est gardé dans le navigateur (IndexedDB `LandingPerformanceDashboardCache`)
  et rechargé à l'ouverture ; il sert aussi au Flight Planner (avions connus).
- Préférences (langue, avion, filtres, période par fichier…) : `LandingPerformanceDashboardPrefsV12`.
- Jeu d'essai : `generate_test_landings.py` crée un CSV de plusieurs milliers d'atterrissages
  sur plus de 200 types.

## 2. En-tête

- **Avion** : tous, ou un type (icône OACI).
- **Période** — composant commun **TimePeriod** (le même que les reportings de missions) :
  préréglages (toutes les dates, aujourd'hui, 7 / 30 derniers jours, mois, année en cours),
  dates de début et de fin, **◀ reculer / 🔍− zoom arrière ×2 / ▶ avancer** (bornés par les
  données du fichier et de l'avion). La période est mémorisée **par fichier**.
- **Zoom depuis les graphiques** : glisser horizontalement sur un graphique temporel (ou sur
  la bande de navigation) sélectionne la période — à la milliseconde près ; le composant de
  période l'affiche et ses boutons permettent de revenir en arrière.
- **Méthode de tendance** : asymptote (ajustement exponentiel : plateau estimé, gain restant),
  premier ↔ dernier quart, moyenne glissante (fenêtre réglable).
- Imprimer / PDF.

## 3. Options de l'analyse (menu ☰ › Options de l'analyse)

- **Plausibilité** : exclut les mesures manifestement impossibles (format riche : vitesse sol
  < 25 ou > 250 kt, |FPM| > 5000, G < 0,10 ou > 12, |assiette| > 40°, |inclinaison| > 45° ;
  format réduit : taux non fini ou > 5000, |tangage| > 50°/s, flottement > 60 s).
- **95P** : exclut, par avion, les 5 % d'atterrissages accidentels les plus forts.
- **Crash** : exclut les atterrissages déclenchés (FPM ≤ seuil, G ≥ seuil ; logique FPM ou G,
  FPM et G, FPM seul, G seul).
- Estimation des valeurs manquantes, calibration.

## 4. Lecture

- **Synthèse** : nombre d'atterrissages, score moyen / min / max, FPM, G, proportion « Butter
  / Very good »… ; conclusion de progression (amélioration / régression probable ou légère,
  pas de tendance nette, données insuffisantes — au moins quatre mesures).
- **Évolution** : score, taux de toucher (FPM), G, nuage FPM × G, indice technique relatif
  (format réduit : 45 % taux brut, 25 % arrondi, 20 % tangage, 10 % flottement, normalisé par
  avion — ce n'est pas un score officiel), avec tendance.
- **Synthèse par avion**, **qualité des données** (mesures retenues, écartées et motifs).
- Bandeau d'analyse en bas de page (taille réglable) : chiffres clés de la période.

## 5. Services externes

Aucun : le fichier est lu dans le navigateur.
