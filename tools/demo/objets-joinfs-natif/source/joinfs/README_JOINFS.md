# JoinFS natif — mode d’emploi, 18 novembre 2026

Le transport multijoueur est confié à JoinFS : aucun service WebSocket/UDP DEFA supplémentaire n’est requis pour diffuser ces objets. L’export prépare un enregistrement natif `.jfs`. Un seul poste le rejoue ; JoinFS diffuse les objets aux autres participants. Il ne s’agit pas de faire reconnaître automatiquement les instances du précédent script FlyWithLua.

## Ce qui est prêt sur ce poste

Installation repérée dans les fichiers de configuration/les raccourcis existants :

- X-Plane : `D:\Jeux\X-Plane 12`.
- JoinFS X-Plane : `D:\Program Files\JoinFS\XPlane\JoinFS-XPLANE.exe`, version 3.2.17.
- Format d’enregistrement exporté par défaut : **21003**, adapté au lecteur installé. Le format 21023 récent comporterait des champs supplémentaires, notamment après les pistes ; il n’est pas utilisé par défaut.
- Bateau : `bateau/scenario-bateau.jfs`, 15 minutes, cap vrai 065°, vitesse 8 kt, modèle voilier existant.
- Aéronef : `hippodrome/scenario-hippodrome.jfs`, 15 minutes, 4500 ft MSL, 110 kt, branches de 3 NM, rayon de virage 1 NM, axe 065° vrai, virages à droite.
- Voiture rouge M-023 : plan, modèle CSL et sonde ponctuelle prêts. L’enregistrement définitif attend l’altitude terrain mesurée dans X-Plane ; aucune altitude zéro n’est présentée comme l’altitude de la voiture en Corse.

Les deux enregistrements sont lus intégralement jusqu’au dernier octet par le lecteur de la version JoinFS 3.2.17 installée (chargement de ses seules classes de décodage, sans démarrage du programme, de réseau ou de simulateur). Le lecteur statistique de contrôle fourni dans les sources actuelles de JoinFS les reconnaît aussi. C’est une preuve de compatibilité de fichier, PAS encore une recette de rendu/diffusion sur deux postes.

## Lancer le scénario bateau avec deux joueurs

1. Sur les deux postes X-Plane, disposer du paquet `DEFA_MISSION_OBJECTS` sous `Resources/plugins/JoinFS/Resources/CSL/`. Le préparer depuis les ressources du X-Plane local avec la commande `models` ci-dessous. Le paquet préparé sur ce poste est dans `CSL-a-installer/DEFA_MISSION_OBJECTS`.
2. Après ajout du CSL, relancer X-Plane pour que le plugin charge les modèles, et faire **Scan For Models** dans JoinFS. Les trois noms exacts attendus sont indiqués dans `CSL-a-installer/modeles-attendus.json`.
3. Joindre la session JoinFS habituelle. Sur les postes receveurs, autoriser plusieurs objets du propriétaire du scénario (**Allow Multiple Objects**). Une seule autorité rejoue le fichier : ne pas ouvrir le même `.jfs` sur chaque poste.
4. Sur le poste organisateur, ouvrir `scenario-bateau.jfs` dans l’enregistreur de JoinFS, puis lancer la lecture. Les autres postes reçoivent le bateau à la position courante. Vérifier son option de diffusion/Broadcast.
5. Si le modèle est substitué, choisir exactement le modèle CSL attendu via **Substitute**. Ne pas valider une substitution par défaut en C172. Le système d’association de modèles peut sinon choisir un avion lorsqu’un CSL manque ; le fichier ne peut pas désactiver ce choix à distance.
6. Pour la première recette d’un objet caché, désactiver les étiquettes JoinFS afin qu’elles ne donnent pas sa position, et laisser l’injection TCAS désactivée : le plugin X-Plane de JoinFS utilise son chemin de rendu XPMP2 pour ces objets aussi. Leur exclusion individuelle du TCAS et des labels n’a pas été vérifiée en vol. Aucune affirmation que le bateau est un avion réel n’est faite dans l’enregistrement : sa piste est bien une piste objet.
7. Comparer sur les deux postes : même bateau, même déplacement, même sens, arrivée en retard pendant la lecture, pause/reprise par l’organisateur et suppression à l’arrêt. Ne pas activer une boucle d’enregistrement sur le bateau à axe ouvert : à la fin des 15 minutes il reviendrait brusquement au début. Pour une présence plus longue, exporter une durée plus longue ou une trajectoire géométriquement fermée.

Les lanceurs `.cmd` fournis ciblent explicitement le JoinFS X-Plane installé. À utiliser JoinFS fermé pour éviter une seconde instance. Ils n’installent rien et ne désignent aucun hub nouveau. Si JoinFS est déjà ouvert, utiliser son enregistreur. Les autres joueurs n’ont pas besoin de FlyWithLua pour recevoir et afficher les objets de ces fichiers ; JoinFS et les modèles CSL suffisent pour cette partie.

## M-023 : relever le terrain une seule fois

Le script `M-023/DEFA_JoinFS_terrain_probe.lua` est une préparation ponctuelle, sans réseau ni création d’objet. Le placer dans le dossier FlyWithLua/Scripts de l’installation active. Charger un vol près de 42.17588 N, 9.17412 E, puis macro **DEFA : relever le terrain du scénario JoinFS**. Il écrit `DEFA_JoinFS_terrain.json` dans ce même dossier Scripts. Il refuse de prétendre connaître le terrain d’une scène distante non chargée.

Puis générer le fichier natif :

```powershell
node .\source\joinfs\export.mjs record .\M-023\plan-joinfs.json .\M-023\scenario-M-023.jfs "D:\Jeux\X-Plane 12\Resources\plugins\FlyWithLua\Scripts\DEFA_JoinFS_terrain.json"
```

Le profil doit avoir l’empreinte exacte du plan. Un relevé absent, décalé ou indisponible bloque la conversion. Le même `.jfs` résolu est ensuite lu par l’organisateur et diffusé ; chaque receveur ne recalcule pas une altitude différente. Désactiver **Elevation Correction** de JoinFS pour une recette à altitude MSL commune ; les scènes locales doivent rester compatibles avec le placement commun. Cette option est sous le contrôle de JoinFS et peut sinon modifier l’altitude près du sol. La sonde peut être retirée après préparation ; elle n’est pas un connecteur permanent.

## Exporter une autre mission

Aucune nouvelle dépendance à installer : Node pour préparer le fichier ; le lecteur YAML existant de DEFA pour les entrées YAML. Une entrée JSON fonctionne sans lecteur YAML.

```powershell
node .\source\joinfs\export.mjs plan .\DEMO-SHIP.json .\catalogue-joinfs-local.json "D:\Jeux\X-Plane 12" .\nouveau 900 1
node .\source\joinfs\export.mjs models .\catalogue-joinfs-local.json "D:\Jeux\X-Plane 12" .\nouveau\plan-joinfs.json .\mes-CSL
node .\source\joinfs\export.mjs record .\nouveau\plan-joinfs.json .\nouveau\scenario.jfs
```

`plan` produit les trajectoires, la liste des modèles requis et une sonde terrain liée à leur empreinte. `models` regroupe une copie locale des OBJ et de leurs textures dans un paquet CSL. Pour un modèle `mode: library`, renseigner `file` avec sa variante physique exacte dans le catalogue : la bibliothèque virtuelle seule ne désigne pas une variante garantie. Les modèles et textures sont préparés depuis les ressources de chaque utilisateur ; les sources de JoinFS, pas les ressources graphiques de Laminar, constituent la base du format.

## Routes, hippodrome et AGL pris en charge par l’export

- `static`, `axis` : repris du prototype précédent.
- `route.points` : références de points existants, chaque passage peut revenir, vitesse et altitude au passage. `repeat: once|loop|pingpong`. Vitesse interpolée linéairement dans le temps du tronçon ; niveau interpolé entre les passages. **Virages fly-over anguleux** : pas de rayon de raccord implicite. Une contrainte de virage déclarée provoque un refus si elle n’est pas tenue. La route n’est pas un modèle de vol et n’est pas vendue comme une trajectoire arrondie.
- `racetrack` : branches et demi-cercles tangents, axe, rayon, sens et vitesse ; parcours continu. Le modèle visuel peut prendre le roulis géométrique correspondant. Les transitions de roulis et l’aérodynamique complète ne sont pas simulées.
- `altitude_mode: agl` avec `height_agl_ft` : profil X-Plane préalable obligatoire ; converti en MSL commun pour l’enregistrement. Les contraintes de garde et de vitesse verticale sont vérifiées sur les relevés résolus. Ce n’est pas un évitement du relief en temps réel. Un changement AGL/MSL à l’intérieur d’une route demande une transition préalablement résolue ; il est refusé dans ce premier export.
- Une route eau sans profil reste une hypothèse de niveau marin 0 MSL : le générateur l’annonce. Fournir le profil pour vérifier que chaque point est réellement aquatique. Sans profil, ni l’eau du parcours du bateau de démonstration ni le relief sous l’avion MSL de démonstration ne sont mesurés.

## Ce que ce mode ne fait pas encore

Le fichier décrit une trajectoire prévue avant le vol. Un ordre tactique reçu en direct, une modification de route en vol, une correction AGL continue, la reprise automatique après perte du poste organisateur ou le changement de propriétaire exigent une autre interface d’écriture dans JoinFS. Nous n’avons pas ajouté un serveur DEFA pour cela ni modifié le protocole réseau de JoinFS. Le hub JoinFS ne devient pas lui-même le moteur de trajectoire : c’est le poste qui rejoue le fichier qui fait autorité.

L’observation caméra et le geste « Objet en vue » restent une fonction locale de l’application. JoinFS transporte l’objet et les aéronefs ; ce lot ne prétend pas transmettre les tiroirs ou la découverte métier par son protocole. Le pont local précédent peut être utilisé pour les déclarations, mais il n’est pas requis pour la synchronisation native de ces objets.

La recette sur deux simulateurs n’a pas été exécutée. Aucun vol n’était actif lors de la préparation. Le décodeur installé et les tests sont vérifiés ; le scan des CSL, leur rendu XPMP2, les labels/TCAS, la correction terrain et la diffusion réelle doivent être constatés sur deux postes avant usage de mission.

## Installation effectuée pendant ce lot

Le paquet CSL des trois modèles a été copié dans le plugin JoinFS de `D:\Jeux\X-Plane 12`. La sonde ponctuelle M-023 a été placée dans FlyWithLua/Scripts ; elle ne mesure le terrain qu’après activation de sa macro. Aucun exécutable JoinFS/X-Plane, réglage réseau ou fichier de mission source n’a été modifié. Aucun vol ni connexion JoinFS n’a été lancé.

Le scénario `coordonne/scenario-coordonne.jfs` réunit les deux démonstrations dans un seul enregistrement : 901 relevés d’aéronef et 901 relevés d’objet. Le lanceur `Ouvrir-scenario-coordonne-JoinFS.cmd` le charge dans le JoinFS X-Plane installé. Le scan de modèles reste à faire dans l’interface JoinFS après chargement du plugin ; la réception par un autre poste reste à constater.
