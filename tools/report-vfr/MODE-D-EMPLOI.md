# Mode d'emploi — Report VFR, version 2

Le dossier installé est `E:\DEFA\tools\report-vfr`. Les sources aéronautiques sont lues sans modification dans `E:\SynologyDrive\DOCS\Flight\Charts\VAC\VAC`.

## Démarrage

1. Installer Python 3.10 ou plus récent si nécessaire.
2. Depuis ce dossier : `python -m pip install -r requirements-vfr.txt`.
3. Ouvrir `affichage-vfr.html` et sélectionner **data\vfr-compiled.json**.
4. Choisir un aérodrome puis une route. La sélection cadre sa géométrie et affiche ses conditions et ses sources.

Le lecteur fonctionne hors ligne. Il ne faut pas ouvrir le JSON de `data\history`, qui est une ancienne version conservée pour comparaison.

## Données présentes

La compilation du 23 octobre 2026 traite 418 AD : 678 points, dont 14 sommets manuels, 115 séquences et 211 relations. Les relations sont de deux types : entre points de report (`report_sequence`) et entre sommets d'une géométrie (`geometry_leg`). Elles ne correspondent pas à 211 itinéraires distincts.

Les interprétations livrées concernent LFBD, LFBO, LFCD, LFCH, LFMA, LFML et LFMN. Leur portée est **partielle**, explicitement documentée. Les 411 autres AD restent au statut `calculé`. Toute absence de séquence extraite demeure à examiner ; elle ne prouve pas une absence d'itinéraire.

Les 14 sommets manuels comprennent 9 points sur le cheminement A660/lac à Arcachon et 5 le long du Var à Nice. Ce sont des points de construction du tracé, pas des points de report officiels. Leur précision métrique n'est pas validée. Les détails et images de référence sont dans `reviews` et `interpretations`.

## Statuts par AD

| Statut | Signification |
|---|---|
| `calculé` | Extraction automatique disponible, analyse non achevée |
| `interprété` | Couche d'analyse manuelle appliquée à la même empreinte PDF ; lire sa portée |
| `obsolète` | Le PDF a changé depuis l'interprétation ; points et routes manuels désactivés |
| `sans relations` | Absence de relations confirmée explicitement après lecture, jamais supposée par le parseur |

Chaque AD conserve `fingerprint`, `lastCalculation` et, si disponible, `lastInterpretation`. L'AIRAC du dernier calcul livré est **2610**. Il indique quand le calcul a été effectué ; il ne certifie pas l'actualité des sources. L'AIRAC source reste `null` car la cohérence globale de cette copie locale n'est pas établie. L'index local porte le marqueur `2505_`.

## Mise à jour

### A. Acquisition des sources

Télécharger les nouvelles VAC officielles du SIA et les décompresser dans un dossier complet d'aérodromes. La découverte et le téléchargement des nouveaux cycles ne sont **pas encore automatisés** dans cet outil.

Dans `config.json`, modifier `sourceDirectory` pour pointer sur ce dossier. Renseigner `sourceAirac` seulement si le cycle du corpus est établi, par exemple `"2611"`. Conserver les noms `AD-2.OACI.pdf`.

### B. Refresh local

Depuis le dossier :

```powershell
python refresh_vfr.py --config config.json
```

Ou lancer `refresh.ps1` dans PowerShell si Python est accessible via `py` ou `python`.

Le refresh recalcule les empreintes, réutilise le cache des PDF inchangés, recompile, applique les interprétations encore compatibles et produit :

- `data/vfr-compiled.json` : résultat principal ;
- `data/vfr-geometry.geojson` : points et géométries interprétées pour un SIG ;
- `data/refresh-report.json` : fichiers nouveaux, modifiés, manquants et interprétations obsolètes ;
- `data/etat-ad.json` : état synthétique par AD, empreinte, AIRAC et portée de l'analyse ;
- `data/history` : état JSON précédent.

Si un PDF ne peut pas être traité, le JSON précédent est conservé et `refresh-errors.json` décrit le problème. Si des AD ont disparu du corpus local, la publication est également refusée, avec `refresh-blocked.json`, pour éviter de confondre un téléchargement incomplet et une suppression officielle.

### C. Relecture des interprétations obsolètes

Ouvrir la nouvelle VAC et comparer avec les notes dans `interpretations/OACI.json`. Revoir points, séquences, conditions et tracés. Modifier ensuite l'interprétation, sa date, son AIRAC d'analyse et son empreinte `sourceSha256`. Relancer le refresh.

Ne pas remplacer simplement l'empreinte sans relecture : cela ferait passer une ancienne interprétation pour une analyse du nouveau document.

## Ajouter une analyse ou des points

Éditer **interpretations/OACI.json**, jamais le JSON compilé. Le moteur charge ces fichiers à chaque compilation. Le détail des champs se trouve dans `FORMAT-DONNEES.md`.

Un point de tracé ajouté doit porter :

```json
{
  "code": "MAN-EXEMPLE-01",
  "coordinates": [-1.10, 44.60],
  "origin": "manual",
  "role": "intermediate_waypoint",
  "isOfficialReportingPoint": false,
  "radioReportRequired": false,
  "pdfPage": 1,
  "reason": "Motif du sommet et consigne ou tracé lu dans la VAC",
  "accuracyM": null
}
```

Les coordonnées de cet exemple sont fictives. Les points livrés possèdent en plus leurs paramètres de calage graphique. La route référence les points de report dans `pointCodes` et les sommets de tracé dans `geometryPointCodes`. Les consignes structurées sont placées dans `conditions`, avec leurs pages sources.

Les branches proches des pistes qui ne sont pas numérisées restent indéterminées. Le lecteur n'affiche pas une droite inventée vers le centre de l'AD pour combler ce manque.

## Compilation directe et contrôles

```powershell
python compile_vfr.py --source 'E:\SynologyDrive\DOCS\Flight\Charts\VAC\VAC' --output data/vfr-compiled.json --cache cache --interpretations interpretations --geojson data/vfr-geometry.geojson
python tests_vfr.py
```

Privilégier `refresh_vfr.py` pour conserver l'historique et le rapport de différences. Les tests contrôlent notamment les codes alphanumériques, les références du graphe, l'invalidation d'une analyse sur changement d'empreinte et la conservation du résultat précédent si le corpus est incomplet.

Les fichiers du premier prototype sont conservés dans data/history.
