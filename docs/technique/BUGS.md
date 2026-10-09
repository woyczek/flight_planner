# Journal des bugs

Suivi des bugs signalés (par l'utilisateur ou trouvés en travaillant) : ouverts en tête, fermés ensuite, du plus récent au
plus ancien. Tenu par la session « BUGS SOG » ; une ligne par bug, la cause en quelques mots, le commit de la correction.
Les évolutions et la dette technique n'y figurent pas (CHANGELOG, `docs/technique/perf/SYNTHESE.md`).

## Ouverts

| Signalé | Zone | Bug | État |
|---|---|---|---|
| 07/10 | Premier lancement | « villes_geonames.csv not found: no city names » à la construction de la base aéronautique | Non reproduit. Depuis 079ca0af : deux essais, puis adresse et raison (code HTTP, réseau, dossier) dans le compte rendu — à relever s'il revient. |
| 08/10 | Toutes les pages | Environ 4 s avant que la page réponde, dans le profil Chrome de l'utilisateur | Non reproduit sur le poste de développement (premier affichage < 220 ms). Mesure à faire dans le profil concerné : `tools/perf_audit.html`, « Exporter les mesures (JSON) ». |
| 08/10 | Paramètres › Maintenance (bases), de / es / en | Le libellé français « Base » sert à deux sens (colonne « terrain de base » d'un appareil, groupe « Base » des menus) et reçoit une seule traduction (« Datenbank ») | À trancher : un libellé français distinct pour l'un des deux (la traduction se fait sur le texte exact). |

## Fermés

| Signalé | Zone | Bug | Cause | Correction |
|---|---|---|---|---|
| 09/10 | Studio, Cartes de vol | Modification du profil de carte : plus de rafraîchissement automatique de l'aperçu | Pas un retrait voulu : en 4.2.0 (4285e9f6), « Réglages du profil » a été déplacé sous l'aperçu du bloc Route, hors de `#profileEditor` dont l'écouteur `change` relançait l'aperçu | Écoute au niveau du document, filtrée sur les deux conteneurs (`map_parser.html`, `map_planner.html` regénéré) |
| 09/10 | Données aéronautiques (DIRCAM) | Après l'import de la MILAIP ENR 5.7, le XML n'était pas enregistré sans un clic de plus | Écriture réservée au bouton « Écrire miam-enr-5-7-tracks.xml » | Écriture d'office après l'import, bouton gardé seulement en cas d'échec (`maintenance_page.js`) |
| 09/10 | Lanceur, toutes les pages | Textures des designs à matières disparues après un clone (relevé sur 2aa52752) | Clone fait sans Git LFS : images, textures et polices restées en pointeurs | Contrôle à chaque lancement : `git lfs pull`, ou consigne dans la fenêtre du lanceur et sur le premier lancement (`launch.py`, `update_suite.py`) |
| 09/10 | Premier lancement → Mon profil | ID IVAO saisi au premier lancement absent de « Identité et réseaux » | Carte « Pilote » enregistrée seulement par « Enregistrer le profil » : saisie perdue en passant à la suite | Enregistrement à chaque champ quitté (`premier_lancement.html`) |
| 09/10 | Données aéronautiques | « Choisir le dossier… » X-Plane toujours dans « Actions à faire » une fois le dossier choisi | Ligne due à une autorisation à renouveler ou à un ancien cycle de « Custom Data », avec toujours le même bouton, sans effet | « Ré-autoriser le dossier… » ou simple information sur le cycle (`aeroTodo`, `maintenance_page.js`) |
| 09/10 | Premier lancement, données aéronautiques | « dossier X-Plane non choisi » au recalcul de la MORA ; phasage peu naturel (l'utilisateur ne choisit pas de dossier X-Plane, il passe aux types OACI) | Source X-Plane, facultative pour une zone à MORA calculée, traitée comme manquante ; bouton « MORA d'X-Plane » actif sans dossier, sans rien enchaîner | X-Plane « facultatif » (exigé seulement pour une zone trop étendue), bouton qui enchaîne dossier, base, MORA (`maintenance_page.js`) |
| 09/10 | Planning, Tableau (bloc des zones) | Colonnes VATSIM / IVAO des activations transformées en blocs imbriqués sans titre (signalé par Features SOG) | Colonnes écrites en `<section>`, que le framework prend pour des blocs | `<div>` dans `odv_activations_editor.js` |
| 09/10 | Paramètres › Maintenance | La rubrique « Types d'aéronefs » apparaît un instant à l'ouverture, puis disparaît | L'éditeur des bases ouvrait sa première rubrique avant que la page n'ouvre « Mises à jour » et ne le masque | Page Maintenance sans `?base=`, ou bloc demandé (`?m=`) : aucune rubrique rendue par l'éditeur (`data_admin.js`) |
| 08/10 | Tableau | Plaquette de convoyage réinitialisée (heure calculée, « à affecter ») à la modification d'une mission | Le recalcul retirait toute plaquette qu'il ne savait pas recalculer sur le moment (mission absente du registre, terrain sans coordonnées), puis la recréait | 3ca27ab5 |
| 08/10 | Tableau | Pilote d'une plaquette effacé à l'enregistrement de sa fenêtre | Pilote hors de la liste des membres : pas d'option dans la liste | 3ca27ab5 |
| 08/10 | Blocs (toutes les pages) | Impossible de réorganiser les blocs ; bloc visé non illuminé hors design Métro | Ordre mémorisé par conteneur mal relu, mise en évidence couverte par les designs à matières | d38232a6, 2a36c5d4 |
| 08/10 | Toutes les pages | Page lente à répondre (1 à 3 s) | État de la synchronisation relevé par git à chaque page, deux fois | 0c5c9aa9, 9dd9859d |
| 08/10 | Premier lancement | « Suite lancée depuis …, dossier déclaré …/planner/ » alors que le dossier est le bon | Dossier des profils de performance d'une autre copie gardé d'une installation à l'autre | 531ff3cf |
| 08/10 | Paramètres | Pages figées (« page ne répondant pas ») avec une compagnie réglée autre que SO Group Virtual | Renommage par observateur qui réécrivait les textes à l'identique, en boucle | de7c4788 |
| 08/10 | Paramètres › Maintenance | Contrôle des mises à jour : « en retard » alors que le commit local est en avance | Commit local lu dans un relevé mémorisé au lieu du commit servi | 4c1301a8 |
| 08/10 | Données aéronautiques | Nombre de cases MORA d'une zone faux (France 133 au lieu de 74) | Petites îles comptées | 6d33ad10 |
| 08/10 | Premier lancement | Dossiers de `data/` non déduits quand les données arrivent après le choix du dossier | Déduction faite une seule fois | 842f8dad, 0bfa90af |
| 07/10 | Premier lancement | Page d'index à la place du premier lancement ; données installées avant le choix du dossier de l'application | Ordre des étapes | 56746f5a |
| 07/10 | MORA | Pics parasites du relief (La Réunion sud 20 100 ft) | Pixels aberrants du relief | 5046f77f |
