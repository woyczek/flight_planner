# Maquette Données : carte, groupes, fiche pays, liste du cycle (SOG-0258, 0259, 0262)

Fichiers : `liste_cycle.html` (autonome, bouton « état » en haut pour passer de « en cours de cycle » à « tout à jour »), captures `liste_cycle_390.png`, `liste_cycle_1280.png`, et `liste_cycle_monde_1280.png` (carte en vue monde).

## Ce qu'elle montre
- A. Entrée = carte du monde schématique : pays en pastilles, couleur = état (vert, ambre, rouge, gris) ET mot dans les groupes ; hachure = procédures disponibles ; contour bleu = groupe ouvert.
- B. 20 groupes de pays (83 pays), les groupes à faire d'abord ; le groupe ouvert montre ses pays et cadre la carte. La liste plate des pays n'existe plus.
- C. Fiche pays (Portugal ouvert) : bas d'écran à 390, panneau latéral à 1280. Par source : 3 coches avec date et édition, fichiers attendus / vus / manquants, geste bleu « Prendre le fichier téléchargé », lien « Choisir un autre fichier… », « Mettre à jour ce pays ».
- D. « Ce qui reste à faire ce mois-ci » : une ligne par source, chaque ligne ouvre la fiche du pays ; les faits sont repliés.
- E. « Publier » dit d'abord ce qui part avec ; pas d'envoi d'une seule zone.
- F. Cycle suivant, Quand ça change, Vu par le poste : repliables comme avant.

## Décisions proposées
- Les coches ne sont jamais posées par l'utilisateur ; une source commune (NATS, openAIP) le dit sur la fiche.
- « Mettre à jour » ne publie jamais ; seul « Publier » envoie, avec un plan d'abord.
- Griser = toujours une raison écrite à côté.

## Questions ouvertes
1. Les chiffres : 15 lignes dont 5 à faire donnent « 10 faits sur 15 » et « Tout mettre à jour (2) » ; « 12 sur 15 » et « (3) » ne sont pas compatibles avec les données du poste (Portugal, DIRCAM, UK Mil, FAA classes en retard). À arbitrer.
2. Vue monde : l'Europe y est illisible ; garder le cadrage automatique à l'ouverture d'un groupe ?
3. Le Portugal « à faire » rend aussi l'Europe de l'Ouest « à faire » : un pays sans fichier compte-t-il avant la première édition ?
4. Fiche pays sur mobile : vrai panneau qui recouvre, ou fiche dans la page comme ici ?
5. Pays sans source (gris) : le dire « sans état » suffit-il, ou proposer d'ajouter une source ?
