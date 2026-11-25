# Provenance et vérification JoinFS

Sources consultées le 18 novembre 2026 : dépôt officiel actif https://github.com/tuduce/JoinFS, commit 1753511505706a210c79a25f32e3d8f695365abc. Dépôt historique https://github.com/omx5o/JoinFS consulté pour le lecteur 21003.

Contrats utilisés :
- JoinFS/Recorder.cs et JoinFS/Sim.Object.cs : lecture/relecture native et diffusion des objets du Recorder.
- JoinFS.Recording/LegacyJfsImporter.cs : structure historique, ordre des pistes et relevés, chaînes BinaryReader.
- JoinFS/Sim.Data.cs : unités et structure des positions/vitesses.
- JoinFS/Substitution.cs et JoinFS/XPlane.cs : titres CSL, format xsb_aircraft et association exacte.
- JoinFS-XP/JoinFS-XP.cpp : injection et rendu XPMP2 ; émission du modèle/position de l’aéronef utilisateur seulement, sans collecte générique d’instances FlyWithLua.
- docs/recording/jfs2/tools/jfsstat.py : lecteur de contrôle indépendant, exécuté sur les deux exports.

Le générateur utilise le format historique 21003 par défaut, sans les champs ajoutés en 21004/21008. Le lecteur installé JoinFS 3.2.17 a lui-même décodé les fichiers générés jusqu’à la fin exacte : 901 relevés objet pour le bateau, 901 relevés aéronef pour l’hippodrome. Le test initial avec 21023 a révélé des octets restants ; cet export a été remplacé par 21003.

VerifyInstalledJoinFS.cs est un outil de vérification hors vol. Il charge la bibliothèque installée sans appeler son point d’entrée et cherche uniquement les deux lecteurs d’objets par leur signature. Il n’appelle pas l’interface, ne connecte aucun simulateur et n’ouvre aucun socket. Il s’arrête si leur disposition diffère. Le nom de certaines classes étant masqué dans la version installée, leur signature et leur relation de classe sont utilisées. Aucun contournement d’authentification ou de fonction sous licence n’est réalisé.

Les fichiers .jfs et les déclarations CSL sont générés par notre code. Le lecteur statistique upstream n’est pas une dépendance d’exécution. La licence MIT des sources JoinFS consultées est jointe pour les références/outils utilisés. La lecture d’un fichier par le décodeur n’atteste pas son rendu ou sa réception sur un autre poste.
