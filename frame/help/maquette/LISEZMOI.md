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
