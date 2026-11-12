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
