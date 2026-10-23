# Extraction des itinéraires VFR : constat sur le corpus local

Inspection du 23 octobre 2026. Sources lues sans modification.

## Corpus

- Racine fournie : E:\SynologyDrive\DOCS\Flight.
- Les VAC exploitables sont dans Charts\VAC\VAC, et non dans l'ancien PDF_BMJ de l'Atlas.
- 424 fichiers PDF : 418 aérodromes et 6 documents SIV.
- Les 418 codes de l'index Javascript AeroArraysVac.js ont tous leur PDF local.
- Ce rapprochement établit la couverture de cet index métropolitain local, pas celle de tous les aérodromes français et ultramarins actuels.
- Le dossier SIA XML ne contient actuellement aucun fichier .xml visible ; un fichier HTML de sauvegarde de générateur de missions y est présent.
- Les fichiers Javascript de l'Atlas sont des index et des fonctions de consultation ; aucun graphe national d'itinéraires n'a été identifié dans les fichiers examinés.
- La page d'index VAC contient le marqueur 2505_. Ce n'est pas une preuve de validité de chaque document ni un manifeste AIRAC global.

## Informations à récupérer

Il faut conserver séparément : les points de compte rendu, les séquences de passage, la géométrie à suivre et les conditions d'utilisation. Chaque information doit référencer le fichier, son empreinte SHA-256, la page PDF et, après validation, la désignation/date de la page SIA.

Exemples constatés dans les PDF locaux :

| AD | Pages PDF utiles | Forme publiée | Conséquence pour l'extracteur |
|---|---|---|---|
| LFBD | 5–6 | Points, tableau par piste, visibilité par branche, altitude et exception SW | Lire les cellules et la légende ; préserver les exceptions. |
| LFBO | 8 | Itinéraires nommés NA1, WH1 et EN1, minima et observation de suivi d'autoroute | Séparer identifiant de route, séquence, catégorie et consignes. |
| LFCH | 4–5 | Cheminement NE vers N via autoroute et lac, caps, conditions sur les aéronefs | Une liaison entre coordonnées ne décrit pas la trajectoire publiée. |
| LFMN | 5 | Arrivées et départs distincts, points, verticale tour, suivi du Var/autoroute et variantes ATC | Ne pas déduire automatiquement une route inverse. |
| LFMA | 7 | Points avec usages conditionnels : panne radio ou instruction ATC | Préserver les restrictions au niveau du point et de son usage. |
| LFCD | 2 | Points et consigne d'arrivée/départ selon secteur | Texte et table à rapprocher, sans liaison inventée entre les points. |

Les dates anciennes imprimées sur certaines pages sont des dates de page. Elles ne permettent pas, seules, de dater la dernière mise à jour de l'ensemble local.

## Travail réalisé

audit_vac.py lit les PDF, calcule leurs empreintes, extrait le texte en cache si demandé et produit un inventaire JSON paginé avec des signaux de recherche. Le balayage complet a lu 424 documents et 1 614 pages sans erreur de lecture. 126 documents contiennent au moins un signal textuel.

Ces signaux sont des aides au repérage. Ils ne constituent ni une extraction validée des points, ni des routes utilisables. Les cartes graphiques et les colonnes mal ordonnées nécessitent encore une interprétation de mise en page. L'absence de signal ne prouve pas l'absence d'itinéraire.

## Mise à jour à construire

1. Découvrir le cycle et les documents officiels dans les index SIA ; conserver un manifeste explicite de publication et de validité. Ne pas utiliser la date de modification Windows comme date aéronautique.
2. Télécharger dans une zone de préparation les sources XML et les VAC correspondantes. Valider leur identité avant extraction.
3. Comparer les empreintes avec le manifeste précédent. Une différence déclenche un réexamen du document ; elle ne prouve pas une modification de procédure.
4. Réextraire les documents modifiés et contrôler les modifications de points, routes, géométries et conditions. Distinguer fichier disparu, téléchargement échoué et suppression officielle.
5. Publier un JSON versionné avec son cycle, ses sources et le statut de validation. Les conditions demeurant en texte doivent être conservées explicitement ; une géométrie inconnue reste inconnue.

Le script fournit déjà la comparaison de deux inventaires via --previous. Il n'effectue aucun téléchargement, aucune publication et ne met en place aucune tâche planifiée.

Exemple d'exécution (Python avec pypdf) :

```powershell
python audit_vac.py --source 'E:\SynologyDrive\DOCS\Flight\Charts\VAC\VAC' --output nouvel-audit.json --text-dir cache --previous audit-vac-local.json
```

La prochaine étape de l'extracteur est une lecture des tables avec leurs positions et des consignes associées, vérifiée sur les six cas ci-dessus avant extension. Le JSON national des itinéraires n'est pas encore produit.
