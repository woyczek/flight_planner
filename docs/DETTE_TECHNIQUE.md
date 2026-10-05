# Dette technique

Points connus, gardés en l'état par choix, à reprendre plus tard. Chaque entrée : ce qui se passe, pourquoi on le
garde, ce qu'il faudrait faire.

| Depuis | Sujet | Constat | Pourquoi on garde | À faire |
|---|---|---|---|---|
| 05/10/2026 | ODV, fenêtre « Affecter les pilotes libres » | « Enregistrer (2) » affiché dès l'ouverture d'un créneau qui a déjà des missions (les affectations existantes comptent comme modifications) | pas gênant à l'usage | ne compter que les changements par rapport aux affectations lues à l'ouverture (`apps/cpco/odv_assign.js`) |
| 05/10/2026 | Données partagées sur la branche `test` | le `data/` commun aux trois espaces de travail (`E:\DEFA\data`) est sur la branche `test`, qui porte le jeu de test fantôme (`tools/jeu_fantome.py`) ; c'est la seule base de référence | pas de mission réelle sur cette suite : la base de test sert de référence | avant une mise en service réelle : revenir sur `main`, décider du sort des affectations du jeu de test |
