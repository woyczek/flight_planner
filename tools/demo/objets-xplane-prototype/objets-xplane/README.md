# Objets de mission dans X-Plane — prototype 0.1, 18 novembre 2026

Ce paquet génère un script FlyWithLua depuis les objets d’une mission, sans déplacer l’avion du pilote, sans occuper d’emplacement IA et sans installer de scène. Il contient une voiture rouge statique dérivée de M-023, un bateau mobile et une démonstration d’aéronef mobile. Les deux derniers sont des exemples techniques, pas des missions opérationnelles complètes.

État : générateur et pont testés automatiquement (21 tests), scripts Lua produits et relus, exécution Lua/SDK et rendu NON testés dans X-Plane. Ce n’est pas encore un plugin validé en vol. Rien n’a été installé ou activé dans le simulateur. Les missions M-023 et M-036 du dépôt n’ont pas été modifiées.

## Contenu

- `M-023/` : les deux scripts à charger ensemble et `session-local.json` pour le pont.
- `DEMO-SHIP/`, `DEMO-AIR/` : deux autres sessions, à utiliser séparément.
- `source/` : générateur réutilisable, moteur Lua, pont local, adaptateur d’application et tests.
- `catalogue-local.json` : correspondance entre une référence logique et une ressource installée.
- `FORMAT_OBJETS_XPLANE.md` : champs, contraintes et contrat des événements.

## Essai dans X-Plane, à faire une fois sur un vol d’essai

Prérequis : X-Plane 11.50+ ou 12, FlyWithLua NG 64 bits, Node.js (déjà utilisé par l’atelier). Les bibliothèques socket et ffi sont fournies avec FlyWithLua NG. Le SDK d’instanciation est fourni par X-Plane. Aucune dépendance n’a été téléchargée pour préparer ce paquet.

1. Ouvrir un vol près de 42.17588° N, 9.17412° E pour M-023. La voiture est posée sur le terrain échantillonné par X-Plane, pas à une altitude terrain inventée. En Corse, vérifier d’abord les scènes et le relief locaux.
2. Copier uniquement les deux fichiers `M-023/DEFA_objects.lua` et `M-023/DEFA_objects_core.lua` dans le dossier `Resources/plugins/FlyWithLua/Scripts` de l’installation X-Plane réellement utilisée. Le dossier inspecté ici était `E:\SynologyDrive\XP11`, qui contient une collection de ressources ; il ne suffit pas à identifier l’installation active.
3. Lancer le pont dans un terminal :

```powershell
node .\source\bridge.mjs .\M-023\session-local.json
```

4. Recharger les scripts FlyWithLua ; ouvrir le moniteur : `http://127.0.0.1:8790/`. Le pont écoute exclusivement sur 127.0.0.1 : UDP 47910, HTTP 8790. Le port HTTP sert uniquement des lectures ; les événements viennent du script par UDP authentifié par un jeton de session.
5. Menu FlyWithLua → Macros → `DEFA : objets de la mission`. Le bouton `Objet en vue : Véhicule rouge sorti de route` déclare le contact. On peut aussi assigner `DEFA/objects/found/OBJ-1` à une touche ou un bouton de joystick.
6. Vérifier les événements `spawned`, éventuellement `candidate_fov`, puis `object_found` après déclaration à moins de 0,8 NM et avec un écart vertical inférieur à 2000 ft. Hors portée, le script ET le pont refusent la confirmation.
7. Vérifier que la voiture est rouge, posée au bon endroit et retirée au déchargement des scripts. Si un modèle manque, un événement d’échec remplace sa création. Vérifier également que le bateau suit 065° vrai à 8 kt et n’est pas posé à terre.

Une seule session de ce prototype peut être chargée à la fois. Pour passer au bateau, remplacer les deux scripts par ceux de `DEMO-SHIP/`, arrêter l’ancien pont et relancer avec le nouveau `session-local.json`. Supprimer les deux scripts puis les recharger retire les instances. Les ressources 3D d’origine ne sont jamais copiées ni redistribuées.

## Générer une autre mission

Le catalogue doit correspondre aux ressources réellement présentes sur le poste du pilote. `visual.asset` est obligatoire ; le générateur ne choisit pas un modèle arbitraire à partir du nom de l’objet.

```powershell
node .\source\export.mjs .\M-023-objet-statique.json .\catalogue-local.json "C:\X-Plane 12" .\nouveau-paquet "E:\DEFA\frame\lib\js-yaml.min.js"
```

Les entrées JSON ne nécessitent pas de lecteur YAML. Pour le YAML, le générateur réutilise js-yaml déjà livré par DEFA avec CORE_SCHEMA. Les extensions inconnues et les fichiers source ne sont pas exécutés. Les scripts de sortie sont du code généré par cet outil ; un script Lua fourni par un tiers ne doit pas être traité comme une simple mission de données.

M-023 utilise actuellement l’enveloppe historique 1.0 ; elle est acceptée sans réécriture du fichier source. La copie fournie complète uniquement l’objet : véhicule, modèle rouge, référence terrain, portée et orientation. M-036 n’est pas maquillée : le naufragé et le chien y sont actuellement tous deux `kind: person` ; aucun modèle de personne/chien exploitable n’a été identifié dans les bibliothèques inspectées. Leur association reste à faire avec les ressources de l’installation active.

## Informer l’application

Le pont expose `GET /api/events?after=<curseur>`. L’application active peut consommer `source/application-adapter.mjs` : `onHint` reçoit l’indice géométrique, `onFound` reçoit la déclaration. Les origines locales DEFA 8000 et Atelier 8787 sont autorisées ; aucun accès extérieur n’est ouvert.

```javascript
const stop = watchObjectEvents({
  mission: 'M-023',
  onHint(event) { /* information indicative, ne pas ouvrir de tiroir */ },
  onFound(event) { /* revalider le vol actif, la mission, l’objet et la portée,
                    puis écrire la découverte dans le carnet de vol commun */ },
  onGap(reason) { /* réconcilier avec le journal local, sans ouvrir à l’aveugle */ }
});
```

Le moniteur est un consommateur déjà fonctionnel. Le branchement à l’ouverture des tiroirs et au carnet partagé de la V3 n’a pas été modifié dans ce lot : le pont n’écrit pas dans les fichiers DEFA, et ne peut pas décider à lui seul quel vol réel est actif. L’adaptateur et le contrat sont fournis pour ce raccordement.

Le pont écrit `events-local.ndjson` à côté de sa session avant d’acquitter chaque nouvel événement. Le script retransmet toutes les 2 secondes jusqu’à acquittement. Les doublons sont dédupliqués par session/exécution/séquence. Le journal et les positions restent locaux, ne pas les ajouter au dépôt des missions. Régénérer la session pour un nouveau vol ; ne pas réutiliser des découvertes d’un ancien vol. Maximum 20 000 événements par session et 1000 événements dans la fenêtre de lecture ; un trou de curseur doit être réconcilié.

## Limites de ce premier lot

- `candidate_fov` indique qu’un point 3D est dans une approximation du champ de la caméra. Il ne vérifie ni occlusion par arbres/bâtiments/cockpit, ni ligne de vue terrain, éclairage, météo ou perception humaine. La VR, les projections asymétriques et plusieurs écrans ne sont pas validés. Il n’ouvre aucun tiroir.
- Le mouvement est un axe à cap/vitesse constants et altitude MSL constante pour l’avion. Ni virage, montée/descente, gestion carburant, pilote automatique, collisions physiques, avion IA ou trafic réseau/TCAS. Les garde-fous sont des refus de rendu ; ils ne planifient pas une route évitant le relief ou la terre.
- Le bateau doit être sur une surface eau signalée par la sonde X-Plane. À terre ou en cas de tuile non chargée il est retiré et signalé indisponible. Pas d’animation de vagues/sillage ou de physique maritime.
- Chargement dans un rayon de 25 NM autour du pilote ; trajectoire maintenue pendant l’absence de rendu. Le chargement OBJ est synchrone, donc susceptible de provoquer une brève pause. Limite : 32 objets, aucune variante composite.
- Le modèle visuel est celui installé localement. Les animations intrinsèques, l’orientation, l’origine verticale et la licence du modèle restent à vérifier en vol. Le modèle C172 de démonstration provient du décor VR de Laminar et ne constitue pas un avion pilotable.

## Sources techniques vérifiées

- https://developer.x-plane.com/sdk/XPLMLookupObjects/ — résolution des bibliothèques selon la position.
- https://developer.x-plane.com/sdk/XPLMCreateInstance/ — instances 3D.
- https://developer.x-plane.com/sdk/XPLMInstanceSetPosition/ — déplacement en boucle de vol, jamais en callback de dessin.
- https://developer.x-plane.com/sdk/XPLMProbeTerrainXYZ/ — terrain et eau.
- https://developer.x-plane.com/sdk/XPLMCameraPosition_t/ — caméra.
- https://github.com/X-Friese/FlyWithLua — FlyWithLua, FFI et commandes.

Réutilisé : missions du registre, ressources OBJ/LIB existantes, lecteur YAML de DEFA, bibliothèques FFI/socket et commandes/fenêtres de FlyWithLua, instances et sonde du SDK. Le pont et le générateur sont des modules neufs car les essais existants d’UDP OBJN/OBJL ne fournissaient ni cycle de vie fiable, ni mouvement SDK, ni retour « objet trouvé ».
