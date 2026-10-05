## Synthèse (4 octobre 2026, branche `feature/perf-audit`)

**Ce qui a été fait.** Les sept actions de priorité 1 du plan, plus deux corrections trouvées par l'audit « après » :
une lecture mémorisée qui relisait deux fois une clé absente (réglages de routage : 440 analyses JSON par ouverture du
registre) et une recherche de préfixes de traduction qui parcourait toutes les lignes connues pour chaque texte
inconnu (désormais rangées par premier mot).

**Comment c'est mesuré.** Même parcours de clics (Mes missions, ODV, registre, générateur, studio, CR, Paramètres),
avec serveur et sans serveur (dossiers simulés comme en `file://`). Avant et après **alternés** (avant, après, avant,
après…), trois passages chacun, **médiane par étape**, page visible, même sonde des deux côtés. Les écarts de temps
d'une même mesure d'un passage à l'autre atteignent ±30 % sur cette machine : seuls les compteurs (requêtes, analyses,
ouvertures…) sont exacts ; les temps se lisent en tendance.

**Gains du parcours** (totaux, serveur / sans serveur) :

| | avant | après |
|---|---:|---:|
| ouvertures IndexedDB | 213 / 51 | 17 / 19 (−92 % / −63 %) |
| analyses JSON | 690 / 5 296 | 465 / 435 (−33 % / −92 %) |
| requêtes | 146 / 129 | 79 / 110 (−46 % / −15 %) |
| requêtes en 404 | 86 / 9 | 15 / 9 (−83 %) |
| passes de traduction | 236 / 247 | 79 / 84 (−67 %) |
| temps de traduction | 709 / 727 ms | 140 / 141 ms (−80 %) |
| rappels d'observateurs | 1 365 / 1 831 | 570 / 817 (−58 %) |

**Ce qui n'a pas bougé.** Le temps de blocage (tâches longues) reste à ≈ 255 ms sur tout le parcours : il vient du
studio cartographique (≈ 300 ms au chargement, construction de la base SIA) et de Paramètres, pas touchés. Les
lectures du stockage (`getItem`) sont stables : elles restent, mais ne sont plus suivies d'une analyse JSON. Coût des
observateurs eux-mêmes : 1 → 5 ms sur tout le parcours (le traducteur unique note les nœuds modifiés), négligeable.

**Montée en charge.** Deux courbes changent de pente :

- estimation de route : 22,8 → 0,9 ms par estimation à 2 400 missions (× 25), et le registre n'est plus réanalysé à
  chaque estimation ;
- traduction : 290 → 24 ms par passe à 8 000 textes (× 12) ; extrapolé à 30 000 textes : 0,95 s → 55 ms.

Les autres sont **inchangées** (linéaires, non traitées) et donnent les prochains points de rupture :

| Cas | Aujourd'hui | À 20 000 | Seuil gênant |
|---|---|---|---|
| Registre des CR (un seul `missions.yaml`) | 13 ms (100 CR) | ≈ 2,5 s à chaque page de CR / reporting | ≈ 3 000 CR (0,5 s) |
| Grille de l'ODV (50 pilotes × 21 créneaux) | 7 ms (500 affectations) | ≈ 240 ms par semaine affichée | ≈ 40 000 affectations |
| Registre du navigateur (≈ 2,7 Ko par mission) | 219 Ko (73 missions) | — | **quota du stockage du navigateur** (5 à 10 Mo selon le navigateur ; le panneau de mesure en accepte davantage, le banc ne le voit donc pas) : atteint entre ≈ 1 900 et 3 800 missions, et l'écriture du registre échoue alors **sans message** |
| Index des affectations (Mes missions) | < 1 ms | 17 ms | pas avant 100 000 |

**Proposé ensuite** (priorité 2 du plan, à décider) : registre du navigateur allégé (≈ 0,5 Ko par mission au lieu de
3 Ko, détail lu dans les fichiers — repousse le quota au-delà de 10 000 missions — et un avertissement si
l'écriture échoue) ; registre des CR découpé par année avec un
index ; grille de l'ODV indexée par pilote et par jour ; signatures du dossier des missions écrites dans
`data/missions/` pour qu'un autre poste profite de la relecture incrémentale ; et, hors plan, la construction de la
base SIA du studio cartographique faite en tâche de fond (seul blocage notable restant).
