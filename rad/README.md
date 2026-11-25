# RouteSim 7 — calcul et précontrôle IFR de simulation

Double-cliquer **Lancer.cmd**, puis ouvrir **http://127.0.0.1:8766** si le navigateur ne s’ouvre pas. Garder le lanceur ouvert. Après une mise à jour, arrêter puis relancer le serveur pour charger le nouveau moteur.

## Saisie et sortie distinctes

La **route saisie** est une demande avec des passages imposés. Exemple :

`LFPO SITET KEPAD EIDW`

Le calcul relie LFPO, SITET, KEPAD puis EIDW, dans cet ordre, et complète les portions par des airways, procédures ou liaisons FRA candidates. Tous les points intermédiaires de la saisie sont imposés. Les AD aux extrémités priment sur les champs Départ/Arrivée. Si la saisie ne comporte pas les AD, les champs Départ/Arrivée sont utilisés.

**Le calcul, le contrôle et la sélection d’une alternative ne remplacent jamais cette saisie.** La route calculée apparaît dans le champ distinct **Route de sortie sélectionnée**. Copier et Rapport utilisent la proposition sélectionnée. Une route impossible n’autorise pas le moteur à supprimer un passage imposé.

**Calculer A → B** complète la demande. **Contrôler** analyse les éléments déjà saisis comme une route existante : des points successifs sans airway indiquent un DCT. Les noms de SID/STAR dans la sortie sont normalisés sans espaces, par exemple `ELCOB2Q`.

## Profil vertical

- Taux par défaut : **2 000 ft/min en montée et 2 000 ft/min en descente**, réglables dans Profil et alternatives. Ce ne sont pas 200 ft/s.
- Vitesse sol en route : **450 kt par défaut**, réglable. Vitesse sol sur procédures : **220 kt par défaut**, réglable séparément.
- Le profil se calcule depuis l’élévation du départ jusqu’à celle de l’arrivée. Il tient compte du temps sur chaque segment, du FL cible, des limites verticales des airways/FRA et des contraintes d’altitude codées aux points des SID/STAR.
- Le profil adapté peut comporter plusieurs paliers. Il conserve les limites exactes de la source, dont les frontières à 19 500 ft ; la parité des niveaux reste hors du contrôle complet.
- Une SID ne peut pas inclure une redescente dans ce modèle ; une STAR et le raccord final ne peuvent pas inclure une remontée.
- Le modèle reste une approximation de simulation en pieds et FL × 100, sans QNH, vent ou modèle de performances avion.

L’onglet **Profil vertical** représente l’altitude prévue et les bandes verticales des segments. Il affiche les paliers effectivement tenus. Un vol trop court peut ne pas atteindre son FL cible.

## Détail des segments

L’onglet **Segments** présente l’état, les points, l’élément suivi, les altitudes prévues, le plancher/plafond et la vitesse sol. Les segments responsables d’une erreur sont rouges, avec le motif exact et l’écart en pieds. Le filtre permet d’afficher uniquement les alertes. Les mêmes alertes sont accessibles en cliquant le segment sur la carte.

Exemple de la base fournie : sur A2, plusieurs sous-segments entre DANBO et OKRIX plafonnent à **19 500 ft**. Un passage prévu à 27 000 ft produit un écart de **7 500 ft**, indiqué sur chaque sous-segment concerné, notamment AVLON–OKRIX.

Les fichiers airways AeroDB utilisés ne fournissent pas de limites de vitesse ni de sens autorisé. Ces champs restent **non renseignés** ; aucune valeur n’est inventée. Les limites de vitesse publiées dans les procédures sont affichées en **kt IAS**, distinctes de la vitesse sol du profil. La conformité IAS n’est pas déduite de la GS.

## SID / STAR

Les procédures sont lues dans `data/proc/manual/<AD>.json`, sinon dans les dossiers de cycle applicables de `data/proc`. Le calcul utilise les séquences complètes dont les positions peuvent être résolues, exclut les fiches douteuses, tronçons manquants, attentes et arcs non modélisés. Les points manquants ne sont pas remplacés par des coordonnées inventées.

La piste peut être imposée pour le départ et l’arrivée. Si elle est laissée vide, le moteur compare les procédures connectées et affiche celle sélectionnée ainsi que sa piste et son cycle. La sélection est guidée par le score de l’objectif choisi, sans choix de piste en fonction du vent, ni clairance ATC.

Les altitudes minimales, maximales ou exactes codées aux points sont utilisées. Les tracés sont des liaisons entre points codés, sans simulation complète des interceptions, virages ou trajectoires ARINC. Les données au statut `check` restent identifiées comme des lectures AeroDB à vérifier. Le raccord depuis le dernier point de STAR jusqu’à l’AD est un **raccord d’approche de simulation**, pas une approche publiée calculée.

Si aucune procédure complète ne peut être reliée au réseau, le résultat signale explicitement le raccord DCT utilisé et les comptes de procédures complètes/incomplètes/douteuses. On peut désactiver l’utilisation des procédures pour comparer.

## FRA

Quatre classeurs EUROCONTROL ont été importés depuis le ZIP fourni dans Downloads : cycles **2609, 2610, 2611 et 2612**. Les originaux extraits figurent dans `sources/fra/`, l’index dans `fra.json.gz`. Le cycle 2611 contient 9 852 lignes renseignées ; les lignes supprimées, coordonnées non lisibles et limites non numériques ne constituent pas des liaisons utilisables.

Le moteur exploite les coordonnées, les rôles **E/X/I** et **A/D**, les AD associés, les limites numériques, H24 ou les fenêtres UTC simples, ainsi que le FLOS lorsqu’il est explicite. Il maintient des états séparés par FRA pour éviter d’entrer arbitrairement par un point intermédiaire I. Les conditions temporelles complexes, remarques et limites non interprétables ne sont pas transformées en autorisations.

Les liaisons FRA sont des **candidates de simulation**. La liste des points ne fournit ni les volumes complets des FRA, ni la géométrie des NPZ, ni toutes les restrictions RAD. Le graphe est une recherche bornée, avec voisins proches, candidats répartis dans huit directions, sorties et progression vers chaque passage imposé. La portée initiale est de 500 NM et une seconde topologie plus dense atteint 900 NM si aucun chemin n’est trouvé : cette distance est une limite de recherche de l’application, pas une limite réglementaire ni une autorisation DCT. Une absence de solution ne démontre pas qu’aucune route réelle n’existe.

Les noms de FRA, rôles, lignes source et limites accompagnent les segments reconnus. Les points d’un cycle futur ne sont pas utilisés avant leur date. Le système conserve l’empreinte SHA-256 des classeurs importés.

## Alternatives

Une incompatibilité ou un calcul impossible déclenche la recherche de jusqu’à **trois propositions**. Le bouton dédié permet aussi d’en demander après un calcul réussi. Chaque proposition conserve les mêmes AD, date et passages imposés, dans le même ordre.

Si les changements de palier sont autorisés, les propositions peuvent utiliser un profil adapté sur le même trajet ou un autre FL de croisière. Une liste de paliers peut être indiquée, par exemple `190, 210, 230` ; ces niveaux sont recherchés en priorité. À défaut, le moteur essaie des niveaux plus bas par pas de FL020. Le niveau, le profil et les motifs d’échec sont affichés. Deux propositions peuvent partager la même route horizontale et avoir des profils verticaux différents.

Chaque proposition est recalculée et contrôlée. Aucune alternative comportant une erreur détectée par le moteur n’est proposée comme compatible. Un point imposé interdit ne sera pas retiré pour fabriquer une alternative.

## Ce qui est contrôlé, ce qui manque

Les erreurs concrètes sont affichées en premier. Les limites de couverture sont regroupées dans **Domaines hors du contrôle complet**, plutôt que répétées pour chaque segment.

Contrôles : identifiants et continuité, passages imposés, profil vertical, contraintes d’altitude de procédures, sous-ensemble d’interdictions RAD simples H24 dont la version active est unique, et contrôles de points FRA décrits ci-dessus.

La grammaire RAD complète, les exceptions complexes, les plafonnements conditionnels, les horaires complexes, les espaces traversés, les volumes FRA/NPZ, les activations EAUP/EUUP et NOTAM ne sont pas tous évalués. Les résultats restent un **précontrôle de simulation**, pas une validation IFPS. « Aucune incompatibilité détectée » s’applique uniquement aux contrôles exécutés.

Les mentions RAD sont des pistes documentaires, pas des infractions établies. Une règle peut s’appliquer sans mention textuelle explicite des points de la route.


## Priorités, préférence FRA et navigation

La priorité **Plus rapide** compare les durées simulées. **Plus économe** compare les kilogrammes estimés avec les débits de phase sélectionnés. La priorité **Distance minimale** conserve le critère géométrique.

La **Préférence de recherche FRA** est facultative et réglable à 0, 10, 25 ou 50 %. Elle diminue le coût de recherche des seuls tronçons FRA. Le score final déduit la même fraction du temps, du carburant ou de la distance attribuable au FRA. **Les minutes et kilogrammes affichés ne sont jamais réduits par cette préférence.** Une préférence peut donc retenir une route un peu plus longue ou lente : le score est pondéré, les estimations restent brutes. Les comparaisons portent sur un nombre borné de candidats, pas sur un optimum global certifié.

Le FRA n’est pas obligatoire par défaut. Le bouton « alternatives » recherche spécifiquement une candidate FRA avant de remplir la liste avec des variantes de niveau. Les badges affichent le nombre de tronçons FRA, leur distance et les espaces concernés. Les lignes FRA sont turquoise. L’option **FRA obligatoire** est disponible séparément : si aucun tronçon FRA reconnu n’est présent, le résultat est rejeté.

Le routage conserve désormais les bandes d’altitude à travers les points imposés : il ne peut pas quitter une bande plafonnée à 19 500 ft et entrer instantanément dans une autre commençant à 24 500 ft au même point. Le profil complet et les contraintes de procédure sont ensuite recalculés sur les candidats.

### Modèle de consommation

La liste avion est lue dans `data/AircraftDB/aircraft_perf.js`, sinon `AircraftDB/aircraft_perf.js`. Lorsqu’un débit SimBrief est disponible, il préremplit les trois phases avec **la même valeur de référence**. Les débits montée / croisière / descente sont éditables en kg/h. Un modèle à débit constant produit le même classement que le temps de vol ; le moteur n’invente pas une polaire en fonction du niveau, de la masse ou de la vitesse. Les estimations ne comprennent ni roulage, ni réserve, ni vent. Sans débit source ou les trois débits saisis, « Plus économe » demande les données manquantes au lieu de produire un score fictif.

### Unable RNAV

Cette contrainte exclut les FRA et les éléments RNAV. Pour les airways françaises, le moteur lit les champs `codeType` / `codeRnp` du fichier AIXM4.5 du cycle sélectionné. Une exigence absente de la base n’est pas assimilée à une autorisation conventionnelle. Les procédures dont l’exigence conventionnelle n’est pas explicitement connue sont également exclues.

Dans le fichier français du 29 octobre 2026 fourni sur ce poste, les 1 493 segments importés sont marqués RNAV. Le calcul IFR « unable RNAV » peut donc échouer faute de réseau conventionnel documenté. Il ne crée pas des DCT entre VOR pour masquer cette absence. FRA obligatoire et unable RNAV sont signalés comme incompatibles dans ce modèle, sans gestion de dérogation.

### VFR

Le mode VFR est distinct : altitude AMSL réglable, tracés géométriques entre AD, points imposés et VRP, sans SID/STAR IFR ni FRA. Les variantes utilisent des VRP proches du trajet. Le moteur échantillonne le tracé tous les 2 NM environ, compare le profil à la MORA de simulation lorsque disponible, signale les zones P / classes A à altitude interprétable et liste les espaces contrôlés ou R/D à examiner.

Ce n’est pas un calcul exhaustif d’évitement des espaces ni une validation VFR : météo, VMC, clairances, activation des zones, limites AGL non interprétées et terrain certifié ne sont pas évalués. La grille MORA est non certifiée et conservatrice ; des zones étroites peuvent être manquées par l’échantillonnage. Le contrôle d’une saisie existante conserve son tracé initial et présente les variantes séparément. Avec unable RNAV en VFR, les passages imposés doivent être identifiés dans la base comme AD, repères visuels ou aides radio.

Référence de contexte PBN : [EUROCONTROL, ERNIP Part 1](https://www.eurocontrol.int/sites/default/files/2022-07/eurocontrol-ernip-part-1-v2-6.pdf). Les exigences effectivement utilisées dans une recherche restent celles des sources et cycles locaux chargés.

## Données et lancement

AeroDB est lu dans `E:\defa\data` sans modification. Les chemins de DEFA et de Python figurent dans `config.json`. Le Python Codex configuré suffit au moteur ; les cartes MapLibre et Leaflet sont fournies localement. Après une mise à jour de Codex qui déplace Python, corriger ce chemin.

Les RAD fournis couvrent le 29 octobre au 23 décembre 2026. Le fichier RAD 2612 nommé V1.6 affiche V1.7 en couverture : le titre interne est conservé. Les textes barrés des RAD sont retirés à l’import. `Importer-RAD.cmd` réimporte les RAD placés directement dans `sources/` ; il ne traite pas les classeurs FRA du sous-dossier.

Les airways sont actuellement disponibles pour la France au cycle du 29 octobre 2026 et pour la Grande-Bretagne au cycle du 1er octobre 2026. Le moteur indique le vieillissement du cycle britannique. Les autres zones peuvent avoir des AD et points sans airways. Les données FRA et les procédures enrichissent ce réseau, sans rendre sa couverture exhaustive.

OpenFreeMap fournit le fond vectoriel via MapLibre. Sans WebGL, le fond relief Natural Earth d’OpenFreeMap est utilisé via Leaflet. Les calculs restent locaux ; les requêtes de fond cartographique concernent la zone affichée. Les licences des bibliothèques sont dans `web/`.

Tests : lancer `python -m unittest test_engine test_v2 test_modes -v` depuis ce dossier avec le Python de `config.json`.


## Recherche v4 et passages imposés

Le moteur utilise A* avec une borne inférieure de distance géodésique passant par les points imposés dans l’ordre. Le coût minimum par NM du graphe rend cette heuristique admissible malgré la préférence FRA. Les états portent le point, l’indice du prochain passage, l’usage FRA et un intervalle d’altitude atteignable. La dominance conserve les possibilités de niveau qui peuvent encore mener à une solution. Montée et descente sont propagées avec le temps de chaque segment et les contraintes des procédures. La recherche est limitée à 6 s ou 100 000 états par tentative ; un arrêt sur budget est annoncé explicitement et ne prouve pas une impossibilité.

Les alternatives utilisent des recherches A* successives avec pénalisation des liens déjà employés, puis un filtre de diversité et un contrôle complet des profils candidats. Cette méthode remplace la variante bornée de Yen ; elle ne garantit pas les k meilleurs chemins globaux. Le graphe FRA reste un sous-ensemble de candidats et les DCT AD–réseau sont des raccords géométriques de simulation.

LFLL LFBD EIDW impose LFBD comme survol : aucun atterrissage et aucune nouvelle SID/STAR à LFBD. Le niveau reste continu et vise le FL cible selon les contraintes des segments. Un plafond voisin peut imposer un passage plus bas que ce FL ; le profil et les segments donnent la valeur réellement prévue.

L’en-tête indique v7.0. Les ressources modifiées sont versionnées et servies sans cache. Lancer.cmd redémarre les processus Python de cette installation exacte pour recharger les modules du moteur. Les sources AeroDB/RAD/FRA et config.json sont conservées.


## RAD v5 : périmètre de tout le vol

Le contrôle reçoit les segments développés du départ à l’arrivée, y compris tous les points de la SID, les raccords, les airways et FRA, tous les points de la STAR et le raccord final. Un point dans une SID/STAR participe aux conditions VIA de tout le vol. Le panneau indique le nombre de segments par phase, les conditions simples décidées et les mentions restant à interpréter. Chaque erreur donne la règle, la feuille, la ligne et les segments concernés.

Les interdictions simples sont appliquées au graphe **après** l’ajout des SID/STAR et des raccords. Les conditions ONLY/NOT portant exclusivement sur DEP/ARR peuvent aussi filtrer les segments avant recherche. Une restriction sur une portion d’airway est développée sur ses sous-segments présents en base. Une bande verticale DCT interdite est soustraite aux bandes de recherche, au lieu d’être comparée au seul FL cible.

Le sous-ensemble interprété comprend les formes simples NOT AVBL FOR TFC, ONLY AVBL FOR TFC et COMPULSORY FOR TFC, les conjonctions DEP/ARR/VIA, les listes explicites, une exception EXC simple, H24 et les fenêtres HH:MM-HH:MM UTC. Les fenêtres sont comparées à l’intervalle de passage estimé des segments, y compris le passage à minuit. Les champs de connexion SID/STAR de l’annexe 3A sont examinés dans leur phase, avec le contexte de tout le vol. Après une violation conditionnelle identifiée sur un candidat, jusqu’à trois nouvelles recherches peuvent éviter les procédures ou segments impliqués ; cette méthode reste bornée et ne garantit pas l’exhaustivité.

**Périmètre vol entier ne signifie pas grammaire RAD complète.** Les conditions de niveau écrites en langage libre, exceptions de chemin complexes, espaces non géolocalisés, activations EAUP/EUUP, ambiguïtés entre lignes actives et autres syntaxes non reconnues restent à interpréter. Un nom d’espace ne devient pas arbitrairement un point ; des mots comme BELOW ou EXCEPT ne sont pas interprétés comme une liste de fixes.

## Repli après échec

Si aucune route compatible n’est retenue, deux propositions séparées peuvent être présentées : un direct conservant les passages imposés, et un assemblage de tronçons plus courts. La saisie d’origine reste intacte.

Les points de découpage sont des positions non ambiguës des bases chargées, recherchées près de jalons de l’axe géodésique (60 NM maximum autour des jalons, environ 160 NM entre jalons, nombre borné). Le moteur préfère des points reliés aux airways puis des points publiés dans les données FRA. Entre deux points, il essaie de garder un chemin airway existant, sans détour supérieur à 60 %. Sinon le raccord est un DCT **proposé**, sans supposer une autorisation ou une liaison FRA. Les coordonnées inconnues ne sont pas inventées.

Le tableau distingue « Présent en base » et « À calculer / DCT proposé ». Cliquer un tronçon cadre la carte, sans changer la saisie. « Présent en base » prouve seulement l’existence des segments source ; le profil et le RAD restent à contrôler. Les propositions complètes passent par le contrôle RAD et de profil, mais gardent le statut **PROPOSITION NON VALIDÉE**, même sans erreur détectée.

ESHL et LEMO existent dans AeroDB. ESHL y est nommé STOCKHOLM/HUDDINGE SJUKHUS et LEMO SEVILLA/MORÓN. Le lecteur v7 charge aussi les instantanés historiques par pays : des airways ES/NL/DE et de nombreuses autres zones sont désormais utilisables, avec leur cycle source réel. SE reste sans airway chargée dans ces instantanés. Une lacune terminale prouvée dans le rayon choisi évite de répéter inutilement les mêmes recherches à d’autres niveaux. Le repli ne transforme pas cette lacune en route publiée.

## Couleurs cartographiques

- FIX / point : bleu nuit, disque.
- DCT hors FRA reconnu : orange, tirets.
- DCT FRA reconnu par les données de points : vert turquoise, tirets.
- AWY inférieure : bleu.
- AWY supérieure : violet.
- SID / STAR : gris.
- Incompatibilité détectée : rouge, prioritaire sur la couleur de type.

Le seuil d’affichage des airways est FL195 : bande entièrement inférieure ou supérieure selon les limites publiées ; bande mixte selon l’altitude moyenne prévue du segment. « DCT hors FRA » signifie non reconnu comme liaison FRA dans ce calcul, pas une preuve qu’il est géographiquement hors d’un volume FRA. La légende est affichée en permanence sur la carte. Les autres propositions sont atténuées et la sélection reste plus épaisse.


## Repli FRA régional — v6

Le repli cherche désormais des portions dans le graphe combiné airways + FRA, même si le départ ou l’arrivée ne peuvent pas être raccordés au réseau publié. Les portions FRA peuvent donc apparaître sans qu’une route complète contrôlée soit trouvée.

Le corridor de recherche suit l’orthodromie de chaque portion imposée, avec une projection sphérique. Le graphe régional utilise une marge de 130 NM. Les raccords DCT proposés relient des points physiques proches de cet axe ; ils ne peuvent jamais entrer ni sortir directement d’un état FRA interne. Les portes E/X et les portes A/D liées aux AD restent celles des fiches source. Les niveaux numériques, horaires simples et FLOS reconnus du graphe FRA sont conservés, et le profil de tout le trajet est recalculé à 2 000 ft/min par défaut.

Les raccords proposés ont un coût de recherche supérieur aux liens de base pour favoriser des portions identifiées. Cette pénalité exprime l’incertitude du raccord ; elle ne réduit ni les minutes ni les kilogrammes estimés. Le moteur réserve des candidats vers les portes de plusieurs régions pour qu’une concentration de points airway n’élimine pas toutes les entrées FRA.

Une seconde recherche peut imposer le passage par une région FRA supérieure proche de l’axe qui n’apparaît pas dans le premier chemin régional. La recherche reste bornée ; le graphe préparé est réutilisé. La proposition FRA est sélectionnée par défaut dans le repli, tout en laissant disponibles le direct et l’option airway. Les passages imposés et la saisie sont conservés.

**Essai ESHL–LEMO au FL330 : COHPA → KETEX, LFFRAN, 27,1 NM au FL330, entrée E et sortie X.** La fiche LFFRAN utilisée a un plancher de FL305. La même proposition utilise aussi LFFRANE, LFFRASW, ESPORTFRA, MUAC et d’autres portions au nord. Un FL inférieur au plancher n’autorise pas LFFRAN.

Les lignes vert turquoise sont des liaisons FRA candidates identifiées par les points/rôles source. Les raccords orange restent des DCT géométriques proposés. Le résultat conserve le statut **PROPOSITION NON VALIDÉE** : volumes FRA, NPZ et conditions RAD complexes restent hors validation. La présence d’un lien dans ce graphe ne vaut pas autorisation opérationnelle.


## Routes complètes et couverture AeroDB — v7

Une route complète peut contenir jusqu’à 128 passages intermédiaires. Les designateurs d’airways sont reconnus même si le tronçon n’est pas chargé ; ils ne deviennent plus des points imposés. La saisie reste intacte. Tous les vrais points intermédiaires restent imposés, dans l’ordre. Un identifiant inconnu n’est pas inventé.

Les homonymes géographiques sont résolus sur la chaîne complète départ–points–arrivée, en minimisant la distance totale. Une interprétation concurrente presque équivalente reste une ambiguïté explicite. Le moteur vérifie également la position, pas seulement le nom, avant de consommer un passage dans sa recherche.

Deux formats AeroDB sont lus : `base/<pays>/<cycle>/<jeu>.json` et `base/<pays>/<cycle>.json` (section `aero`). Un jeu moderne vide peut utiliser le dernier instantané antérieur non vide. Les compléments sont fusionnés à date AIRAC égale ; un jeu récent non vide n’est pas complété avec des routes d’un ancien cycle qui pourraient avoir été retirées. Les segments sont dédupliqués. La date du jeu airway effectivement utilisé est conservée et affichée, même si les aérodromes viennent d’une date plus récente.

Pour les données du 9 novembre 2026, le réseau chargé passe de 2 710 à **16 383 segments**. Cela rétablit notamment des tronçons néerlandais, allemands, espagnols et britanniques, ainsi que le point IDRID. Plusieurs jeux source datent du **1er octobre 2026** : ils sont explicitement signalés comme périmés, sans leur attribuer le cycle plus récent des seuls aérodromes.

Une portion airway non vérifiable entre deux points connus garde son nom dans la route contrôlée. Son tracé entre extrémités est géométrique, ses limites restent inconnues, et son état est **AWY non couverte**, sans faux message de compatibilité. Ce manque de données déclenche les recherches/replis mais ne devient pas arbitrairement une infraction. Les vrais écarts de niveau et de RAD restent signalés séparément.

### Essai ESSB–LEMO fourni

La chaîne comporte 15 points intermédiaires et plusieurs airways. La limite précédente de huit points et les designateurs non reconnus empêchaient tout calcul. Les essais v7 couvrent FL180, FL280 et FL350, en conservant tous les passages.

- FL180 : L620 GILDA–MID a un plancher de 24 500 ft dans les données chargées. Le repli par airways contourne cette portion par L610, LAM, Q3, OCK et M185 avant de rejoindre MID.
- FL280 et FL350 : pas d’incompatibilité verticale détectée dans les portions couvertes de la route initiale, mais le contrôle reste incomplet.
- Quatre portions restent non couvertes de bout en bout : NOSLI N850 MOKNI, ADVOP Z703 ALS, ALS N872 PAM et IDRID M40 NILON. Cela n’est pas une preuve d’interdiction ni une validation de ces portions.
- Des replis directs et par tronçons sont présentés aux trois niveaux. Une option FRA régionale peut être présentée aux niveaux compatibles.

Pour les longues listes de passages, le repli FRA conserve des fenêtres régionales avec leurs portes publiées et leurs points I internes, puis recalcule le profil de tout le vol. Une portion est refusée si elle introduit une incompatibilité verticale dans l’assemblage, notamment en descente vers l’arrivée. Les intervalles géographiques sont mémorisés pour éviter de reprojeter les mêmes points pour chaque arête.

Une absence de SID dans les données et des portes FRA proches trop hautes pour le raccord direct à 2 000 ft/min sont signalées comme une limite du modèle de raccordement. Elles ne prouvent pas qu’un vol réel ou qu’une route hors de ce graphe n’existe pas. Les replis géométriques restent des propositions non validées.
