# Compte rendu

Écrire le compte rendu d'un vol en quelques touchers, avec ou sans mission : le module reprend ce qu'il sait déjà
de votre vol, vous complétez, vous enregistrez — et, si vous le voulez, le vol s'inscrit sur le site de la compagnie
dans le même geste.

## Comment s'en servir

**Trois pas.** Le compte rendu se remplit en trois pas : Vol, Mission, Résultat. Sur un téléphone, un pas à la fois
(« Suivant » en bas) ; sur un ordinateur, les trois côte à côte. Rien n'est obligatoire : ce qui manque est dit au
dernier pas, sans jamais bloquer l'enregistrement.

**Le dernier vol.** Si votre identifiant IVAO (ou VATSIM) est réglé (⚙) et que l'appareil est en ligne, une carte
propose votre dernier vol sur le réseau : « Utiliser » remplit l'avion, l'indicatif, le trajet et les heures tirées
de la trace. Le vol préparé dans Carburant ou Carte est proposé de la même façon (« Vol en cours ») ; s'il a été
démarré dans Carburant (« Démarrer le vol »), il vient en premier, « Vol démarré à hh:mm ». La carte dit en une ligne
tout ce qui sera repris, même ce qu'un type de mission n'a pas de case pour montrer (distance, niveau). « Utiliser »
remplit aussi l'heure de mise en route (l'heure du départ dans Carburant) et le carburant au départ (le carburant
bloc du devis), chacun marqué de sa source. Enregistrer le compte rendu termine le vol démarré : Carburant revient en
préparation, Mes vols retire « en cours », et le vol n'est plus proposé.

**Les autres sources.** Dépliez « Autres sources » pour reprendre votre dernier vol IVAO ou VATSIM, votre plan de vol
SimBrief, ou un texte collé : un plan de vol OACI, la page d'un vol du tracker IVAO ou de StatSim, un METAR. Seuls les
champs vides sont remplis ; à côté de chacun, sa source. Si une source donne autre chose pour des champs déjà saisis,
un bouton propose de les remplacer.

**La mission.** Au deuxième pas : la famille (proposée d'après votre dernier compte rendu), la série, l'identifiant de
la mission si le vol en suit une, puis les blocs propres à la famille. Certains blocs n'apparaissent que pour une
série (par exemple VIP ou convoyage pour les missions spéciales). Tant que vous n'avez pas ouvert ce pas, il est
marqué « à voir » au lieu du ✓ : la famille et la série d'un compte rendu neuf sont reprises par défaut.

**Le résultat.** Au dernier pas : le résultat, vos observations, l'équipage (vous d'abord, comme commandant de bord) et
le carburant au départ et à l'atterrissage. Les incohérences — heures dans le désordre, date future, carburant qui
augmente — sont signalées.

**Enregistrer.** Le bouton en bas enregistre le compte rendu et lui donne son numéro au premier enregistrement. Tant
que vous n'avez pas enregistré, votre saisie est gardée sur l'appareil et reprise à la prochaine ouverture.

**Inscrire sur le site.** « Enregistrer et inscrire sur le site » enregistre et ouvre, dans le même geste, le
formulaire « Ajouter un vol » du site de la compagnie avec votre vol. Connectez-vous sur le site si besoin, lancez le
favori « → Vol » : il remplit le formulaire sans le valider ; relisez, puis validez sur le site. Le bouton est grisé
tant que l'adresse du site n'est pas réglée (module Site).

**Mes derniers CR.** Repliés à la fin du premier pas, une ligne par compte rendu : touchez-en un pour le rouvrir et le
modifier. « Nouveau CR » repart d'un compte rendu vierge.

## Le préremplissage en détail

- **IVAO et VATSIM** : les vols des sept derniers jours de votre identifiant. Un vol coupé par des déconnexions
  compte pour un seul vol. La mise en route et l'arrêt correspondent à la connexion et à la déconnexion quand la trace
  commence et finit au sol ; le décollage et l'atterrissage viennent de la trace.
- **Les heures** sont en UTC, notées « (Z) » sur les champs ; la reprise du vol démarré et celles du réseau les
  remplissent en UTC. Un compte rendu plus ancien, saisi à l'heure de l'appareil, est montré converti avec l'heure
  saisie dessous (« saisi 18:30 locale ») ; il n'est réécrit en UTC que si vous l'enregistrez.
- **SimBrief** : votre dernier plan (identifiant réglé dans ⚙) — appareil, route, niveau, vitesse, carburant prévu,
  METAR et TAF.
- **Depuis Mes vols** : « Écrire le CR » d'un vol ouvre un compte rendu neuf, déjà rempli avec ce vol et sa date ;
  « Ouvrir le CR » rouvre celui qui existe.

## Les numéros de compte rendu

Avec un identifiant de mission, le numéro suit la mission et compte les essais (CRM-016-1, CRM-016-2…). Sans mission,
chaque famille a sa suite (CRM-A01-0, CRM-A02-0… pour HEMS). Les numéros déjà pris, y compris par les comptes rendus
de la suite complète, ne sont jamais réutilisés.

## Le favori « → Vol »

Dépliez « Sur le site de la compagnie » au dernier pas et glissez le lien « → Vol » dans la barre des favoris de
votre navigateur. Il ne sert que sur le site : sur la liste des appareils, il ouvre celui de votre vol ; sur sa page,
« Ajouter un vol » ; sur le formulaire, il remplit les champs et signale les écarts. Sur un téléphone, où les favoris
sont malcommodes, « Copier les champs » met la ligne du vol dans le presse-papiers.

## Cas particuliers

- **Hors ligne** : tout s'écrit et s'enregistre sur l'appareil ; le compte rendu part à la prochaine synchronisation.
  Seules les sources réseau (IVAO, VATSIM, SimBrief) attendent le réseau.
- **Sans lanceur** : IVAO et VATSIM ne sont joignables qu'à travers le lanceur d'un poste ; ailleurs, collez la page du
  vol (tracker IVAO, StatSim) dans « Autres sources ».
- **Sans trigramme** : le compte rendu s'écrit quand même ; réglez votre trigramme (⚙) pour qu'il soit à votre nom.
