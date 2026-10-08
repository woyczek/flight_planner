# V2 — une suite à complexité progressive

*Branche `feature/v2-niveaux` · proposition du 8 octobre 2026 · [Sommaire technique](README.md)*

La suite actuelle se règle en deux positions, « avec ou sans Centre (CPCO) ». Le pilote qui veut seulement
recevoir ses missions et écrire son compte rendu voit aujourd'hui une quinzaine d'entrées. La v2 part de
**ce que fait la personne**, et non de ce que sait faire la suite : quatre niveaux, chacun complet pour son usage,
les trois premiers simples.

## 1. Règles

1. **Au plus 7 éléments** par barre, menu, page ou groupe. Au-delà, on regroupe ou on replie (« Plus… »).
2. **Une page = une tâche.** Un titre qui dit la tâche, **une** action principale visible, le reste en second plan.
3. **Divulgation progressive** : l'option avancée existe, mais repliée ; elle ne gêne pas le niveau 1.
4. **Toujours un état** : ce qui se passe (chargement, envoi, calcul) se voit, peut s'arrêter, et dit clairement
   ce qui a échoué et quoi faire (pas de code d'erreur seul).
5. **Rien à retaper** : ce que la suite sait déjà (profil, ordre de mission, suivi IVAO/VATSIM) préremplit la page.
6. **Typographie au service du contenu** : sans empattement pour l'interface ; écarts voulus permis
   (machine à écrire pour l'ordre de mission, serif pour un document à lire).
7. **Mêmes fonctions qu'aujourd'hui** : rien n'est retiré ; ce qui dépasse le niveau choisi est rangé, pas supprimé.

## 2. Les quatre niveaux

| Niveau | Pour qui | Ce qu'on y fait | Accès |
|---|---|---|---|
| **1 · Équipage** | tout pilote | recevoir ses missions, voir le planning des ordres, écrire son compte rendu | libre |
| **2 · Planification** | officier de permanence | niveau 1 + planifier les ordres (Tableau modifiable, disponibilités, ODV) | Centre (mot de passe, plus tard rôle) |
| **3 · Conception** | rédacteur de missions | niveau 2 + générer, modifier et registrer les missions | Centre |
| **4 · Expert** | cartographe, analyste | niveau 3 + cartes avancées, profils, studio, analyses | Centre |

Le niveau se choisit dans Réglages (et au premier lancement) ; il remplace « avec ou sans Centre ». Un niveau
supérieur au rôle autorisé reste proposé en lecture seule (comme le Tableau aujourd'hui).

**Modules facultatifs**, à cocher quel que soit le niveau (cachés par défaut aux niveaux 1 et 2) : Carburant
(planificateur de vol), Cartes de vol, Atterrissages, Analyse des missions (reporting).

## 3. Navigation par niveau (≤ 7 entrées)

| Niveau 1 | Niveau 2 | Niveau 3 | Niveau 4 |
|---|---|---|---|
| Aujourd'hui | Aujourd'hui | Aujourd'hui | Aujourd'hui |
| Mes missions | Mes missions | Mes missions | Mes missions |
| Compte rendu | Compte rendu | Compte rendu | Compte rendu |
| Planning (lecture) | **Planifier** (Tableau, ODV) | Planifier | Planifier |
| — | — | **Missions** (générateur, registre) | Missions |
| — | — | — | Missions + **studio cartographique** |
| Réglages · Aide | Réglages · Aide | Réglages · Aide | Réglages · Aide |

Réglages et Aide forment le groupe du bas (2 éléments). Les modules facultatifs cochés s'ajoutent sous un
seul élément « Outils » pour ne jamais dépasser 7. Apparence passe dans Réglages.

## 4. Pages, du plus simple au plus complet

- **Aujourd'hui** (nouvelle, accueil) : ma prochaine mission (heure, appareil, briefing), le compte rendu en
  attente, ma semaine en ligne de temps. Trois cartes, une action chacune.
- **Mes missions** : liste des ordres reçus ; l'ordre s'affiche comme un document (police machine à écrire).
  Disponibilités en onglet.
- **Compte rendu** : niveau 1 = une page courte préremplie depuis l'ordre et le suivi réseau (heures, terrain,
  résultat, remarques) ; « CR détaillé » ouvre le formulaire complet de la famille de mission.
- **Planning / Planifier** : niveau 1 = frise de la semaine en lecture seule, ses vols mis en évidence ; niveau 2 =
  le Tableau actuel, épuré (palette repliée, ≤ 7 commandes visibles), l'ODV en onglet.
- **Missions** (niveau 3) : générateur en assistant pas à pas (≤ 7 étapes), registre en onglet.
- **Outils** : cartes de vol, carburant, atterrissages, analyse des missions — facultatifs, tous au niveau 4 ; rien du
  Centre. Le **studio cartographique** (cartes avancées, profils) est un onglet de Missions, au niveau 4.
- **Réglages** : profil, niveau et modules, apparence, Centre, installation, maintenance ; chaque page ≤ 7 blocs,
  les blocs techniques repliés.

## 5. Lots

| Lot | Contenu | Visible pour l'utilisateur |
|---|---|---|
| L0 | niveau et modules (réglage, premier lancement), navigation filtrée par niveau | la barre latérale ne montre que son niveau |
| L1 | page « Aujourd'hui », accueil des niveaux 1-2 | une page d'arrivée utile |
| L2 | Mes missions épurée, ordre en document, CR court prérempli | le parcours pilote complet en 3 pages |
| L3 | Planning lecture (niveau 1), Tableau épuré (niveau 2) | planifier sans se perdre |
| L4 | générateur en assistant | concevoir une mission pas à pas |
| L5 | Réglages : ≤ 7 blocs par page, blocs techniques repliés | réglages lisibles |
| L6 | habillage v2 sobre (une feuille de style commune, designs actuels gardés en option) ; refonte du framework si nécessaire | interface homogène |

Chaque lot est utilisable seul et testé dans les quatre langues avant le suivant.

## 6. Questions ouvertes

- Les designs à matières (Cabinet, Carnet de vol, Durci, Aqua…) : gardés comme thèmes au-dessus de l'habillage v2,
  ou réservés au niveau 4 ?
- « Planning » dans la liste des pages facultatives : compris ici comme le planificateur de vol (Carburant) ; le
  planning des ordres reste visible dès le niveau 1.
