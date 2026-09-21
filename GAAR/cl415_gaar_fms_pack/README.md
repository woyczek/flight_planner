# Pack CL-415 GAAR / Pélican – Simulation X-Plane

Routes fictives et plausibles pour simulation uniquement. Elles ne reproduisent pas des plans opérationnels réels.

## Hypothèses CL-415
- Base principale: LFTW Nîmes-Garons.
- Rôle: Canadair CL-415, avion amphibie bombardier d'eau.
- Emport eau simulé: 6 137 L.
- Plein carburant simulé: ~4 600 kg utilisables (ordre de grandeur).
- Vitesse transit: 155–165 kt.
- Vitesse de patrouille/mission: 130–150 kt.
- Vitesse proche écopage: ~70 kt / 130 km/h.
- Altitudes circuits: 2 000 à 8 500 ft selon relief et transit.
- Rechargement: pour le CL-415, l'élément déterminant est l'écopage; les pélicandromes servent surtout aux avions retardant type Dash/Milan. Les bases proposées indiquent l'atterrissage/refuel/repos équipage possible, pas le rechargement eau principal.
- Temps écopage+rejointe: chaque cycle ajoute une marge de 3 à 5 minutes en plus du transit eau-feu.

## Structure
- circuits/: 12 circuits de patrouille au départ/retour LFTW, classés VERT, JAUNE, ORANGE, ROUGE.
- deroutements/: 12 scénarios feu -> plan d'eau -> feu, avec base de soutien proposée.
- manifest_missions.csv: synthèse des temps, distances, carburant, altitudes et remarques.

## Fichiers .fms
Format simple compatible X-Plane 11/12 FMS. Les points sont des user waypoints, avec noms courts.
