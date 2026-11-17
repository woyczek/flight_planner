# Maquette : l'éditeur de missions en V3 (SOG-0287)

Fichiers : `editeur.html` (autonome, rien n'est écrit ; `#cadre` ou `#lieux` choisit l'étape montrée), captures `editeur_cadre_390.png`, `editeur_lieux_390.png`, `editeur_cadre_1280.png`, `editeur_lieux_1280.png`, sur la mission X-301A du banc (inventée, tests/v3/cases/missions.py).

## En cinq lignes
1. Entrées : « Créer une mission » à l'en-tête du Registre, « Modifier » au dépli d'une ligne (SOG-0286) ; même écran.
2. Six étapes, reprises du pas à pas de la V2 : Cadre, Équipes, Lieux, Récit, Risques, Chronologie et cartes ; sept éléments au plus par étape, une liste au-delà (une ligne par lieu, par équipe, par risque).
3. Téléphone : une étape à la fois, pastilles d'étapes qui défilent, barre du bas « Enregistrer · Suivante · Annuler ». Écran large : étapes à gauche, formulaire au centre, aperçu de la fiche et « À compléter » à droite.
4. « Enregistrer » écrit le fichier de la mission et sa ligne du registre par `ctx.data.sendNow`, borné aux écritures déclarées du module ; le fichier lu est une entrée non fiable (mêmes gardes que le lecteur et le Registre).
5. Hors de l'éditeur (restent en V2 ou à décider) : commande à ChatGPT, exports PDF, arbre YAML brut, studio cartographique, organisation d'exercice et chiffons.

## (a) Relevé de l'éditeur de la V2 (apps/cpco/mission_editor.html)
- Blocs : Mission (nouvelle, commander, pas à pas, dupliquer, enregistrer, importer), Identification (titre, famille, sous-type, identifiant, série, auteur, date), Durée estimée et Zones à activer (calculées), Textes (résumé, description, rubriques), arbre YAML (niveau 4), Cartes, Documents (PDF, YAML, Markdown).
- Pas à pas (mission_guide.js) : Cadre (théâtre, durée, type d'aéronef, indicatif, départ, arrivée), Lieux (cible, zones, points tournants, rendez-vous), Récit, Objectifs et risques, Chronologie, Cartes et documents.
- Par famille : presque rien dans l'éditeur ; la lettre de l'identifiant (S, M, F…), les types d'aéronefs conseillés, le ravitaillement (AAR). Le reste (zone de recherche pour SAR, alerte, combat) est une règle du prompt, pas un contrôle. Rien de propre à COMMERCIAL.
- Contrôles : seul le format de l'identifiant bloque ; le reste est un avertissement avec sa correction en un geste.
- Numérotation : identifiant suivant et série suivante de la famille, lus dans le registre.
- Sortie : `missions/<lettre>_<FAMILLE>/<ID>/mission<ID>.yaml`, en-tête daté, `meta.history` ; le registre n'est mis à jour qu'à l'import.
- Déjà en V3 : le Registre (une ligne par mission, « Corriger », « Retirer »), le lecteur (fiche en deux niveaux), « Ajouter des missions » depuis un YAML.

## (b) Proposition d'écran
- Cadre (7) : Famille, Série, Identifiant, Titre, Théâtre, Départ, Arrivée.
- Équipes : une ligne par équipe (indicatif, service, type ICAO, rôle) ; « + Équipe ».
- Lieux : une ligne par lieu (sorte, identifiant · nom, position ou rayon) ; « + Zone », « + Point tournant », « + Rendez-vous », « Sur la carte ».
- Récit (5) : Résumé (600 signes), Description, Objectif principal, Objectifs secondaires, Charge.
- Risques : une ligne « danger → parade » avec son niveau ; « + Risque ».
- Chronologie et cartes : les événements, puis les cartes proposées depuis les lieux (ouvertes dans la Carte).
- Ce qui manque est dit dans « À compléter », jamais bloquant, sauf l'identifiant (format) et la famille.

## Questions ouvertes
1. « Enregistrer » envoie-t-il tout de suite, ou garde-t-il la mission sur l'appareil jusqu'à « Envoyer », comme le vol (SOG-0279) ?
2. Sous-type : liste de la famille (V2) ou champ libre ?
3. Créer une mission sans compagnie : personnelle par défaut (règle N17) ?
4. Dupliquer une mission : dans cet écran ou au dépli de la ligne du Registre ?

# Maquette : l'étape « Tiroirs » de l'éditeur (SOG-0436, lot L2)

Fichiers : `tiroirs.html` (autonome, rien n'est écrit ; `#liste`, `#zone`, `#objet`, `#heure` choisissent l'état montré), captures `tiroirs_<état>_390.png` et `tiroirs_<état>_1280.png` (page entière), sur la mission X-301A du banc (inventée). Spécification : organisation/SPEC_MISSIONS_TIROIRS.md (version 2) ; format : docs/technique/FORMAT_MISSION.md.

## En cinq lignes
1. Septième et dernière étape : « 7. Tiroirs ». Une ligne par tiroir (son rang — « Tiroir 1, 2, 3… » —, son titre, sa clé en clair), « Modifier », « + Tiroir » (douze au plus).
2. Un tiroir ouvert : sept champs au plus — titre ; clé et son heure de repli ; la zone ou l'objet ; « montrer la zone au pilote » ; message ; briefing ; suite de route.
3. La clé est une liste de quatre : zone de passage, objet à trouver, heure, geste du pilote seul. Le formulaire ne montre que ce que la clé demande (l'heure : un délai et un point de passage, sans carte).
4. « Ce que le pilote voit » : le tiroir fermé (avant) et ouvert (après), calculés par le lecteur que l'écran du pilote emploie — à droite sur un écran large, sous le formulaire sur un téléphone.
5. La carte est un DESSIN D'ATTENTE : elle sera confrontée à l'écran et à la carte que l'utilisateur prépare (mot du 17/11). Intention : le socle de carte partagé (modules/maps/lib/map_base.js), un toucher = le centre d'un cercle ou un sommet d'un polygone ; les champs (rayon, coordonnées) restent le repli sans tuiles.

## Ce que la maquette décide, à valider
- **La zone** : « Ronde | Contour » (une zone, deux formes) ; cercle : un toucher pose le centre, le rayon se tape (et se tire par sa poignée sur un écran large) ; polygone : touchers successifs, 3 à 100 sommets, « Retirer le dernier », « Fermer ». « Choisir une zone de la mission » : le tiroir CITE une zone de la mission par son identifiant (décision du 17/11 sur Q-0095 : le contrat de l'atelier de l'utilisateur ; ce n'est pas une copie) ; « Dessiner sur la carte » crée une zone de la mission que ce tiroir cite ; c'est la règle de LECTURE qui la cache au pilote tant que le tiroir est fermé. « Saisir les coordonnées » ouvre latitude et longitude.
- **Le plafond et la hauteur** sont dits « altitude » (au-dessus de la mer) tant que la position en direct ne rend pas la hauteur au-dessus du sol.
- **L'heure de repli** : « H + … min », à côté de la clé, pour une zone ou un objet seulement.
- **Le titre** est lu par le pilote sur le tiroir fermé : pas de champ « titre caché », une phrase d'aide (« restez neutre si la suite doit surprendre »).
- **La suite de route** : des lieux de la mission choisis dans une liste (jamais un identifiant tapé) ; pour une zone ou un objet elle part de la position de l'avion, pour une heure elle reprend au point de passage.
- **L'objet** : son genre dans la liste fermée (épave, radeau, personne, véhicule, conteneur, navire, fumigène), posé d'un toucher, sa portée en milles marins (l'unité de l'atelier de l'utilisateur, adoptée), sa hauteur facultative.
- **Avertissement** (notification flottante, pas montrée dans les captures) : une zone de moins de 500 m de rayon — « un avion rapide peut la franchir entre deux relevés de position ».
- **« À compléter »** : un tiroir sans message, sans briefing, une zone ou un objet sans heure de repli — jamais bloquant.

## Réponses de l'ergonome (17/11 à 18 h 42) — la maquette est ACCEPTÉE : elle devient la fiche de l'atelier et le chemin au téléphone
1. Un tiroir retiré au milieu : les rangs se resserrent, l'ordre reste. Depuis 19 h 06 (l'utilisateur : « pourquoi limiter à 3 tiroirs ? ») : douze tiroirs au plus, dits par leur rang à l'écran (« Tiroir 1 ») — les lettres désignent les équipages d'une opération ; dans le fichier les identifiants restent B à M.
2. L'heure de repli n'est dite au pilote que si elle le concerne — son appareil n'a pas de position en direct : « s'ouvrira à H + 60 min » ; sinon elle reste hors de sa vue.
3. L'aperçu au téléphone : replié.
4. Un contour se lit de 3 à 100 sommets (la borne de l'atelier de l'utilisateur) ; l'éditeur n'impose pas 8.

La suite : la fiche entre dans l'atelier (SOG-0444 : la carte et le déroulé de la maquette de l'utilisateur + cette fiche), un seul outil d'auteur.

# Maquette : l'atelier de missions (SOG-0444)

Fichiers : `atelier.html` (autonome, rien n'est écrit ; `#a`, `#lieux`, `#b`, `#repere`, `#essai` choisissent l'état montré), captures `atelier_<état>_1280.png` (les cinq états) et `atelier_<état>_390.png` (`a`, `lieux`, `b`), sur la mission X-301A du banc (inventée). Spécification de portage : `modules/missions/EDITOR.md` (« Porting the workshop »).

## En cinq lignes
1. UN outil d'auteur : l'éditeur en six étapes DEVIENT l'atelier de la maquette de l'utilisateur — la carte de la mission, le déroulé dessous, la fiche à droite.
2. La carte est le lieu d'édition à l'ordinateur : « Sélection · Point · Tracé · Zone · Objet » (un contour est une zone qui n'est pas ronde : un seul outil, une seule fiche, deux formes) ; un outil revient à « Sélection » après une pose (sauf « Tracé ») ; un repère d'AeroDB touché dit ce qu'il est et propose « Ajouter comme point » — rien n'est créé par accident.
3. Le déroulé : « Au départ » (visible), puis « Tiroir 1, 2, 3… » scellés, chacun avec sa clé dite en une ligne ; « ＋ Tiroir » est une carte en fin de déroulé, qui ouvre la bibliothèque.
4. La fiche : pour le départ (la partie A du fichier), les six étapes de l'éditeur en six groupes repliables (Cadre, Équipes, Lieux, Récit, Risques, Chronologie et cartes) ; pour un tiroir, trois groupes (la clé, les textes, la suite de route) puis « Ce que le pilote voit » — sept champs au plus par groupe, la fiche de `tiroirs.html`.
5. Au téléphone : le déroulé et la fiche d'abord, la carte repliée ; on y relit et on y corrige un texte, on dessine à l'ordinateur. Le pied d'écran dit toujours « À compléter (n) » — touché, il déplie les points à compléter, nommés (l'ergonome, 17/11 : au téléphone aussi) — et porte « Enregistrer » et « Annuler ».

## Ce que la maquette décide, à valider
- **L'essai des clés** est un volet à côté de la carte (jamais une fenêtre par-dessus) : « Poser l'avion ici » d'un toucher, le temps au curseur, l'avion, sa trace et la zone dessinés, un journal en clair. Le même calcul que le vol (SOG-0447).
- **Aucun identifiant à taper** : la suite de route est une liste de pastilles remplie en touchant la carte (« Tracé »), qu'on réordonne et dont on retire un élément ; les identifiants des lieux sont donnés par l'atelier (PT1, ZONE-1, OBJ-1) et ne changent pas.
- **Les lieux** : sur la carte ET dans le groupe « Lieux » de la fiche (la même liste) ; un objet de tiroir y est dit « caché au pilote ».
- **Le vocabulaire** : « Atelier » dans le fil d'Ariane (Missions › Registre › Atelier), « tiroir », « clé », « heure de repli », « repère », « contour », « essayer les clés » ; famille et série comme ailleurs.
- **Hors de cette maquette** : le sélecteur « Vue du pilote : départ · 1 · 2 · 3… » de la carte (SOG-0445), la cible mobile et les clés de la version 1.1 de l'atelier de l'utilisateur, les équipages d'une opération, l'arbre YAML.

## Réponses de l'ergonome (17/11 à 19 h 12) — spécification et maquette ACCEPTÉES, six corrections portées ici
- Cinq outils (Sélection, Point, Tracé, Zone, Objet) : « Zone » pose une zone ronde, sa forme (Ronde | Contour) se choisit dans sa fiche.
- Le déroulé est UNE rangée qui défile en largeur, à 1280 comme à 390 ; « ＋ Tiroir » en dernière carte ; « Vue du pilote : au départ · tiroir 1 · tiroir 2… » sur la carte.
- Un tiroir CITE une zone ou un objet de la mission (identifiant généré) ; le groupe « Lieux » dit « utilisée par le tiroir 2 » ; la lecture le cache au pilote.
- Au téléphone le pied dit « À compléter (3) » seul : un bouton qui ouvre la liste nommée.
- Le départ au téléphone : tous les groupes repliés, chacun disant son contenu en une ligne (mission neuve : « Cadre » déplié). Le profil du terrain : un bouton de la carte, lot ultérieur. « Essayer les clés » au téléphone : montré, mené au curseur de temps, la carte se déplie d'elle-même (capture atelier_essai_390.png).
- L'écran de l'éditeur sort de module.js vers modules/missions/editor_view.js : un commit de déplacement seul, puis le lot P1.

## La bibliothèque est portée (l'utilisateur, 17/11 à 19 h 26 : « je préférais l'ergonomie avec la colonne de gauche »)
- À gauche sur un écran large : la recherche, les familles repliables, les briques ; un clic ajoute le tiroir suivant, déjà rempli. Elle se replie par sa poignée en une bande étroite « Bibliothèque » ; repliée d'office quand le module a moins de 1 500 px (le menu de la suite occupe déjà la gauche), elle s'ouvre par « ＋ Tiroir ». Au téléphone : une feuille.
- Le choix du modèle de départ reste dans « Créer une mission ».
- Captures : atelier_biblio_1280.png (dépliée), atelier_biblio_390.png (la feuille) ; les autres captures à 1280 montrent la bande repliée. Les briques de la maquette sont INVENTÉES : le catalogue réel sera un fichier du dépôt, jamais une copie de la maquette de l'utilisateur.
- Le lot P1 réserve sa place sans rien y montrer ; son contenu est un lot après les tiroirs.

## Les trois questions posées (tranchées ci-dessus)
1. Le départ au téléphone : six groupes repliés sauf le premier (maquette), ou tous repliés avec leur marque « à compléter » ?
2. « Profil du terrain » de la maquette de l'utilisateur : un septième groupe du départ, ou un bouton de la carte ? (Proposé : un bouton de la carte, à l'ordinateur seulement ; il attend SOG-0446.)
3. « Essayer les clés » au téléphone : montré (le journal seul, sans carte), ou réservé à l'ordinateur ? (Proposé : réservé.)
