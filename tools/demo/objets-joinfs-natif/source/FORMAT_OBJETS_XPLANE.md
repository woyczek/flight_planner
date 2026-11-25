# Extension objets visibles X-Plane — proposition 0.1, 18 novembre 2026

Champs additifs à `helo-xp-mission 2.0`, acceptés aussi par ce générateur sur l’enveloppe historique 1.0. Cette proposition ne remplace pas la spécification partagée des tiroirs. Elle porte le rendu et le mouvement de l’objet, indépendamment de la règle de découverte de la mission.

```yaml
objects:
  - id: SHIP-1
    name: Bateau recherché
    kind: ship
    control: ai                  # optionnel ; ici mouvement scripté, pas un avion IA X-Plane
    motion: axis                 # static | axis
    lat: 48.72
    lon: -2.10
    course_deg: 65               # cap VRAI, degrés
    speed_kt: 8
    altitude_mode: water         # bateau : water ; aéronef : msl ; terrestre : terrain
    start_delay_min: 0           # après le démarrage de la session, à synchroniser avec H du vol
    lifetime_min: 120            # durée de présence à partir du départ
    detection_range_nm: 2
    detection_height_ft: 3000    # écart vertical absolu pilote/objet pour la confirmation
    visual:
      asset: sailboat            # identifiant logique ; aucun chemin dans la mission
      offset_m: 0                # correction visuelle du pivot du modèle ; pas une altitude mission
    constraints:
      require_water: true
      min_speed_kt: 0
      max_speed_kt: 15
      min_clearance_ft: 50       # utilisé pour les objets MSL, pas pour le bateau
```

Pour un aéronef : `kind: aircraft`, `motion: axis`, `altitude_mode: msl`, `altitude_ft: 4500`, vitesse strictement positive, `visual.asset` associé à un modèle d’aéronef. La garde au terrain est contrôlée par la sonde ; en cas de garde insuffisante ou terrain absent, aucun placement n’est confirmé. C’est un mobile visuel à trajectoire imposée, sans aérodynamique. Pour une cible `control: user`, ne pas créer de copie : le générateur la refuse, la position réelle doit venir du réseau/TCAS et de son indicatif dans un autre adaptateur.

Pour un objet terrestre fixe : `motion: static`, `speed_kt: 0`, `altitude_mode: terrain`. L’altitude est calculée localement par X-Plane. Pour un nageur/objet flottant : le genre peut rester `person` ou `raft` avec `altitude_mode: water`, après association à un modèle compatible. Un chien utilise `kind: animal` dans cette proposition ; ne pas convertir silencieusement un `person` historique.

## Catalogue du poste

Fichier séparé de la mission, non synchronisé par défaut. Par exemple :

```json
{
  "sailboat": { "kind": "ship", "mode": "library", "path": "lib/ships/SailBoat.obj" },
  "car-red": { "kind": "vehicle", "mode": "file", "path": "Resources/default scenery/1000 roads/objects/cars/static/sedan_2_red.obj" }
}
```

Les chemins virtuels de bibliothèque sont résolus par `XPLMLookupObjects` pour la latitude/longitude de départ. Le premier objet correspondant est chargé ; les bibliothèques régionales/composites ou variants spéciaux doivent être validées localement. Un fichier physique est limité au dossier X-Plane choisi, y compris après résolution des liens ; aucun chemin absolu, réseau, URL ou remontée de dossier. La variante de voiture rouge est un fichier précis car `lib/cars/car_static.obj` pourrait sélectionner une autre couleur. Le catalogue peut ajouter `heading_offset_deg` (−180..180°) pour les modèles dont l’axe natif diffère.

## Bornes et valeurs par défaut

- 1 à 32 objets par session ; identifiants mission/objet/asset : 1 à 64 caractères ASCII lettres, chiffres, tiret, point ou soulignement, commençant par lettre/chiffre. Nom affiché : 120 caractères au plus dans le paquet.
- Latitude −90..90°, longitude −180..180°, cap 0..359,999°. Tous les nombres doivent être finis ; aucun nombre sous forme de texte.
- Vitesse : 0..80 kt pour le bateau, 0..1000 kt autrement ; aéronef mobile >0. Les contraintes explicites min/max doivent encadrer la vitesse demandée, sans dépasser ces limites. Ce sont des bornes de format, pas des performances certifiées du modèle.
- Altitude MSL −1500..60 000 ft, exigée pour `msl`. Garde au terrain 0..10 000 ft, 50 par défaut. Décalage du modèle −20..100 m, 0 par défaut.
- Départ : 0..1440 min, 0 par défaut. Présence : 1..1440 min, 120 par défaut. Horloge de simulation, suspendue en pause ; un nouveau vol qui remet l’horloge en arrière exige de recharger le script et de régénérer une session.
- Portée : 0,001..100 NM ; 1 NM si absente, avec avertissement. Écart vertical : 1..60 000 ft ; 3000 ft si absent, avec avertissement. Les valeurs de M-023 fournies sont explicites et restent des paramètres d’exercice à valider.
- Mission source ≤2 Mo. Catalogue : chemins relatifs OBJ ≤400 caractères. Le générateur n’interprète que les champs connus des objets ; les autres données de mission ne deviennent pas du code.

Les contraintes supplémentaires de navigation (taux de virage, variation de vitesse, montée, route à étapes, tenue à la mer) restent à spécifier avant implémentation. Ne pas supposer qu’un champ inconnu agit sur la trajectoire du prototype.

## Événements vers l’application

UDP sur 127.0.0.1:47910, JSON versionné, 4096 octets maximum par message. Chaque paquet porte `protocol: 1`, `session`, un `token` généré hors de la mission, `mission`, `run`, `seq`, `type`, `object`, `sim_sec` et `reason`. Le jeton n’est pas exposé par l’API de lecture ni écrit au journal des événements.

Types :

- `spawned` : une instance est créée ; aucune preuve qu’un humain la voit.
- `spawn_failed` : indisponibilité modèle/terrain/eau/garde au sol.
- `removed` : instance retirée, période terminée, éloignement ou arrêt.
- `candidate_fov` : position projetée dans un champ de caméra approximatif, à portée. Visibilité non vérifiée, ne valide jamais la découverte.
- `object_found` : geste explicite « Objet en vue », à portée horizontale ET verticale. Ce type transmet aussi les positions du pilote et de l’objet. Le pont vérifie mission, session, objet, période, trajectoire déclarée, portée et hauteur. Le moteur de mission revalide ensuite le vol actif, la position qu’il lit et la règle du tiroir avant d’écrire au carnet commun.

Le test `candidate_fov` transmet les mêmes deux positions pour contrôle de portée. Le point de l’objet est l’ancrage du modèle avant `visual.offset_m`, afin que la portée ne dépende pas du pivot de la géométrie.

Acquittement UDP : `ACK <session> <run> <seq>` après validation et écriture au journal local. Retransmission toutes les 2 secondes ; dédoublonnage par run/seq dans la session. Maximum 128 messages non acquittés dans le script ; au-delà, avertissement et nouveau geste requis si une confirmation n’a pas pu être mise en file. Le pont garde 20 000 événements par session et expose les 1000 derniers avec curseur et indication de lacune. Ce mécanisme tolère un pont temporairement absent, mais ne remplace pas l’acquittement métier du carnet de vol partagé.

Le jeton est une séparation de sessions locales, pas une attestation cryptographique de ce qu’un pilote voit : un processus local qui lit le paquet peut simuler ses événements. Aucune découverte distante n’est automatiquement crue.
