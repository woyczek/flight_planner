# Maquette Aide : « Signaler un problème ou une demande » (SOG-0316)

Fichiers : `signaler.html` (autonome ; en haut, deux boutons de maquette : **qui signale** — poste de l'ergonome ou pilote — et **l'état** — formulaire, envoyé, sans accès au dépôt), captures `signaler_poste_390.png`, `signaler_poste_1280.png`, `signaler_pilote_envoye_390.png`, `signaler_pilote_envoye_1280.png`, `signaler_pilote_hors_ligne_390.png`, `signaler_pilote_hors_ligne_1280.png`.

Adresses : sur le poste, `http://127.0.0.1:8000/frame/help/maquette/signaler.html` (le lanceur sert le dépôt) ; sur le site publié, `…/v3/frame/help/maquette/signaler.html` une fois v3 poussé.

## Relevé (trois lignes)
- **Ce qui existe et se réutilise** : la feuille de recette (`frame/help/recette.js`, verbe du lanceur `recette/verdict` dans `tools/regen/recette.py`, fichier `organisation/RECETTE.json`) : identifiant, texte de 2 000 signes sans caractère de commande, 1 000 entrées au plus, écriture atomique, fusion par identifiant, refus en bloc ; côté page : brouillon gardé, « non envoyé » sans lanceur, champ qui grandit (SOG-0303). Le chemin d'un pilote existe aussi : `pilot/<trigramme>/…` dans le dépôt de données, avec l'envoi groupé de 5 minutes (SOG-0279) ; tout texte reçu d'un autre est une entrée non fiable.
- **Ce qui manque** : un verbe `signalement/…` (même garde que `recette/verdict`, fichier `organisation/SIGNALEMENTS.json`) ; un écran Aide › Signaler ; côté pilote, un document par signalement sous `pilot/<trigramme>/signalements/` (un fichier par signalement : jamais de conflit) et sa liste dans Compagnie ; la lecture par l'ergonome (une ligne de plus dans son tour).
- **Qui est « l'utilisateur »** : la page le sait sans réglage — le verbe du lanceur répond et le dossier `organisation/` existe : c'est le poste de l'ergonome ; sinon c'est un pilote, et le signalement part dans le dépôt de sa compagnie.

## Ce que montre la maquette
- A. Une sorte (bug, régression, ergonomie, performance, demande), un titre (80 signes), un texte (même champ que la recette : quatre lignes, douze au plus, 2 000 signes, compteur à 1 800).
- B. « Noté tout seul » : l'écran d'où l'on vient, la taille, le design, la langue, la version — décochable ; jamais de donnée de vol, de clé, de jeton, de trigramme dans ce texte.
- C. Après l'envoi : où il est allé (fichier du poste, ou « dans 4 min » avec l'envoi groupé) ; « Mes signalements » : dix derniers, leur état (écrit, dans 4 min, lu, devenu fiche SOG-xxxx, non envoyé).
- D. Sans accès : le signalement reste sur l'appareil (« non envoyé ») et part au retour ; jamais perdu, jamais bloqué.

## Décisions proposées
- Entrée : un seul endroit, **Aide › Signaler** (et un lien dans le pied de l'Aide) ; pas de bouton flottant sur chaque écran, pas de pièce jointe pour commencer.
- Pour le poste de l'ergonome : écrit par le lanceur dans `organisation/SIGNALEMENTS.json` ; pour un pilote : un fichier sous son nom dans le dépôt de données, avec l'envoi groupé, listé pour l'administrateur dans Compagnie › Signalements.
- Aucun courriel, aucun hôte nouveau, aucun lien externe ; la CSP et l'accès du lanceur ne changent pas.
- Tout texte venu d'un pilote est une entrée non fiable : affiché comme texte, borné, sans caractère de commande ; l'identifiant de l'écran est une liste fermée.

## Questions ouvertes
1. L'administrateur répond-il dans l'application (un état « vu / pris en compte » écrit sur le signalement) ou seulement lit-il ?
2. Un pilote peut-il joindre une capture ? (proposé : non pour la première version.)
3. La liste « Mes signalements » reste-t-elle sur l'appareil seulement, ou se relit-elle depuis le dépôt (utile sur un deuxième appareil) ?
4. Compagnie › Signalements : un onglet, ou une ligne dans « Registre » ?

---

# Maquette du cadre : l'entrée de la recherche globale (SOG-0255, tranche 1)

Fichiers : `recherche.html` (autonome ; en haut, un bouton de maquette par **état** : vide, « un858 », « lfrs », rien trouvé, hors des zones installées), captures `recherche_vide_390.png`, `recherche_voie_390.png`, `recherche_plusieurs_390.png`, `recherche_rien_390.png`, `recherche_hors_zones_390.png` et les mêmes en `_1280.png`.

Adresses : sur le poste, `http://127.0.0.1:8000/frame/help/maquette/recherche.html` (le lanceur sert le dépôt) ; sur le site publié, `…/v3/frame/help/maquette/recherche.html` une fois v3 poussé. **Aucun code de la recherche** : la maquette seule (jalon bêta 1).

## Ce que montre la maquette (la conception de l'ergonome, telle quelle)
- **L'entrée** : une loupe dans la barre du haut, à côté de l'aide et des réglages ; « / » ou Ctrl+K au clavier. UN champ. Au téléphone le calque prend tout l'écran sous la barre ; sur grand écran c'est un panneau de 640 px ancré à la loupe, la page (ici la Carte) reste dessous.
- **Les résultats** : groupés par sorte (terrains, points et balises, voies aériennes, espaces, procédures, missions, aéronefs), **cinq par groupe** puis « Tout voir (n) » ; le morceau cherché est surligné. **Une ligne par résultat** : le nom, et sous lui une ligne qui dit ce que c'est et où (« UN858 — voie supérieure, 14 tronçons, France · Espagne »). **Un geste par résultat**, écrit sur le bouton : « Voir sur la carte », « Ouvrir la mission », « Ouvrir la fiche ». Au clavier : ↑ ↓ choisissent, Entrée fait le geste, Échap ferme.
- **Les états, un bouton chacun** : *vide* (une phrase d'aide et les dernières recherches de l'appareil ; le seul bouton est « Fermer ») ; *« un858 »* (une voie : un groupe, une ligne, « Voir sur la carte ») ; *« lfrs »* (cinq sortes : l'ordre des groupes suit le meilleur résultat, l'identifiant exact d'abord) ; *rien trouvé* (« Effacer ») ; *hors des zones installées* (dit, jamais un vide muet ; « Voir les zones installées »).

## Décisions proposées
- **Ordre des groupes** : celui de la meilleure réponse (l'identifiant exact d'abord, puis le début, puis le contenu) ; à égalité, l'ordre de la conception : terrains, points et balises, voies, espaces, procédures, missions, aéronefs.
- **« Tout voir (n)** » remplace le calque par la liste complète de cette sorte (un retour en haut à gauche), au même geste par ligne.
- **Depuis la Carte**, « Voir sur la carte » recentre la carte sans qu'on la quitte et ferme le calque ; depuis un autre écran, il ouvre la Carte centrée, l'objet surligné.
- **Le vide** garde les cinq dernières recherches de l'appareil (`device/`, jamais envoyées) : un ajout de ma part, à refuser si tu n'en veux pas.
- **Rien ne sort du poste** : la recherche lit la base locale et les modules ; aucun hôte, aucune CSP, aucun accès nouveaux.

## Réserves sur la conception (avant le code)
1. **« n'est pas dans tes zones installées » demande de savoir que la chose existe ailleurs.** La base locale ne connaît que les zones installées : pour un **terrain** le catalogue d'AeroDB connaît tous les codes (la maquette dit « KJFK n'est pas dans vos zones installées » à bon droit) ; pour une **voie**, un **espace** ou une **procédure** d'une zone non installée, rien ne le dit sans un petit index « nom → zones » livré avec l'application. Faute de cet index, la phrase honnête est « Rien pour « UN858 » dans vos zones installées (France, Espagne, Royaume-Uni) » avec le même bouton ; « rien trouvé » tout court n'est dit que si toutes les zones sont installées. Question : on construit l'index des noms (tranche 2, AeroDB) ou on prend la phrase honnête ?
2. **Le bouton « Voir les zones installées »** mène à Maintenance › Données (niveau 3) : pour un pilote qui n'y a pas accès, le bouton n'a pas de cible. Proposé : sur un appareil de niveau plus bas, la phrase seule, sans bouton, et « demandez à l'administrateur ».
3. **Les procédures par nom** (tranche 3) et les **voies** (tranche 2) ne sont pas dans les fournisseurs d'aujourd'hui : en tranche 1 le calque ne les montre pas (leurs groupes apparaissent quand leurs fournisseurs existent) ; la maquette les dessine pour fixer la forme.
4. **« / » et Ctrl+K** : « / » ne s'attrape que hors d'un champ de saisie ; Ctrl+K est pris par la barre d'adresse de certains navigateurs (la page le retient quand elle a le focus). Aucun raccourci sur téléphone : la loupe suffit.

