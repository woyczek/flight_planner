# Pack GAAR Milan X-Plane — version simulation

Créé le 2026-07-06.

## Nature du pack
Routes fictionnelles mais plausibles pour simulation X-Plane / VA. Ce ne sont pas des plans de vol opérationnels réels de la Sécurité civile.

## Hypothèses de calcul
- Avion simulé : Dash 8 Q400MR "Milan".
- Capacité retardant/eau retenue : 10 000 L.
- Carburant plein retenu pour planification : 6 500 kg utilisables (ordre de grandeur Q400).
- Réserve simulation : 1 800 kg.
- Vitesse sol moyenne planifiée :
  - transit/patrouille : 300 kt,
  - déroutement chargé/mission : 300 kt.
- Consommation planifiée :
  - GAAR : 2 500 kg/h,
  - déroutement/intervention : 2 700 kg/h.
- Largage simulé : entrée axe 150–170 kt, 150–250 ft AGL selon relief/scénario, dégagement en montée vers altitude sécurité.
- Rechargement :
  - LFTW : 25 min bloc-bloc simulation,
  - pélicandrome avancé LFMP/LFMK : 18 min simulation.
- Altitudes dans les .fms : altitudes de navigation/transit, pas altitudes de largage.

## Couleurs de risque
- Vert : surveillance courte/proche, secteurs plaine/garrigue.
- Jaune : extension vers relief et zones sèches.
- Orange : grands massifs et éloignement.
- Rouge : secteurs profonds, temps d'action long, logique de prépositionnement/rechargement.

## Contenu
- fms/circuits_gaar/ : 12 circuits GAAR au départ/retour LFTW.
- fms/deroutements/ : 12 déroutements vers feux crédibles avec base de rechargement proposée.
- manifest_missions.csv : synthèse distances, temps, carburant, altitude, rechargement.

## Installation
Copier les fichiers .fms dans Output/FMS plans de X-Plane.
