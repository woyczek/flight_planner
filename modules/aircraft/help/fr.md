# Appareils

La flotte de la compagnie, telle que les autres écrans la lisent : le compte rendu (immatriculation → type, indicatifs), la carte, le CPCO. Les fiches de performances sont dans le même écran (onglet « Fiches ») ; le registre des types viendra.

## Comment s'en servir

<a id="aircraft-fleet"></a>**La flotte.** Une ligne par appareil : immatriculation, type, indicatifs, base, « hors service » s'il l'est. La recherche filtre sur l'immatriculation, le type, un indicatif ou la base ; sept lignes sont montrées, « N autres » déplie la suite. « Ajouter » ouvre un appareil vide.

<a id="aircraft-edit"></a>**Modifier un appareil.** Une tape sur une ligne l'ouvre : identité (immatriculation, type, variante, exploitant) et exploitation (indicatifs séparés par des virgules, base, numéro tactique, en service). Sous les champs, une ligne dit ce qui va changer (« 2 champs changés : base, indicatifs ») ; « Enregistrer » l'écrit. Un type que la base ne connaît pas est gardé tel quel, et l'écran le dit. L'immatriculation est la clé : deux appareils ne peuvent pas l'avoir. La position donnée par le site reste telle quelle. « Retirer » pose la question, puis l'appareil quitte la flotte ; sa fiche de performances, s'il en a une, est gardée.

<a id="aircraft-sheets"></a>**Les fiches.** L'onglet « Fiches » liste les fiches de performances par famille (hélicoptères, turbopropulseurs, réacteurs, pistons, autres) ; la recherche filtre sur le nom, le type ou l'immatriculation. Chaque ligne dit d'où vient la fiche, ce qui lui manque et sa date ; un type de la flotte qui n'a pas de fiche est proposé « à compléter ». « Importer un fichier » lit un CSV, un JSON, un .lnmperf ou un OFP SimBrief ; « Coller un texte » lit un texte collé, y compris la réponse de ChatGPT ; « Nouvelle fiche » demande le code du type. Rien n'est écrit tout de suite : l'import montre d'abord, champ par champ, ce qui changerait ; décochez ce que vous gardez, puis « Appliquer la sélection ». L'onglet choisi est gardé sur l'appareil, et le lien `#aircraft?sheet=<id>` ouvre directement l'éditeur d'une fiche.

<a id="aircraft-sheet-edit"></a>**Modifier une fiche.** « Modifier » ouvre l'éditeur : les champs par groupe (identité, carburant, piste et dégagement, montée, croisière, descente, régimes), la table régime / débit sur un grand écran, et le complément EUROCONTROL, « compléter depuis une autre fiche » ou la demande à ChatGPT pour remplir les champs vides. Sous chaque champ renseigné, une ligne grisée dit son origine et sa date (« lnmperf · 28/10 », « édité · 30/10 ») ; la survoler montre les valeurs écartées. « Enregistrer » ouvre l'aperçu des changements, qui ne sont écrits qu'après « Appliquer la sélection » ; chaque champ changé garde ainsi sa source, et l'ancienne valeur est conservée. « Exporter .lnmperf » et « Exporter JSON » téléchargent la fiche ; « Supprimer » pose la question avant de retirer la fiche de la base partagée.

## Bon à savoir

- Le module Site met aussi la flotte à jour en collant la page « Flotte » du site : les deux écrivent le même fichier, chaque enregistrement relit le fichier juste avant et ne change qu'un appareil.
- Rien ne part avant la synchronisation suivante.
