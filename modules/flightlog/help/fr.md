# Mes vols

Tous vos vols passés au même endroit, une ligne par vol, du plus récent au plus ancien : vos comptes rendus, le
journal du site de la compagnie et vos connexions IVAO ou VATSIM, sans doublon.

## Comment s'en servir

<a id="flightlog-totals"></a>**Les totaux.** En haut, trois cases : le nombre de vols, les heures de bloc et les vols qui n'ont pas encore de
compte rendu, pour la période choisie. Juste dessous, les trois types d'appareils que vous avez le plus volés.

<a id="flightlog-filters"></a>**Les filtres.** Choisissez la période (7 jours, 31 jours, un an, tout), cherchez un indicatif, un type, une
immatriculation, un terrain, une mission ou un numéro de compte rendu, ou cochez « Sans CR » pour ne voir que les vols
qui en attendent un. Vos choix restent sur l'appareil : à la visite suivante, une puce les rappelle (« 1 an · LFRS ✕ »)
et les retire d'un appui. Un « — » à la place du bloc : compte rendu sans heures.

<a id="flightlog-list"></a>**La liste.** Une ligne par vol : la date, l'indicatif, la route et le temps de bloc. Un point orange marque un vol
sans compte rendu. Sur un ordinateur, la ligne montre aussi l'appareil et le numéro du compte rendu.

<a id="flightlog-detail"></a>**Le détail d'un vol.** Touchez une ligne pour la déplier : d'où vient le vol (compte rendu, journal du site, réseau
IVAO ou VATSIM), son heure, l'appareil, la mission et les remarques.

<a id="flightlog-report"></a>**Écrire ou ouvrir le compte rendu.** Sur un vol qui n'en a pas, « Écrire le CR » ouvre un compte rendu neuf, déjà
rempli avec ce vol — date, appareil, indicatif, terrains — et une famille de mission proposée. Sur un vol qui en a un,
« Ouvrir le CR » le rouvre pour le modifier.

<a id="flightlog-current"></a>**Le vol en cours.** Un vol démarré dans Carburant (« Démarrer le vol ») et pas encore rapporté apparaît en tête, « En
cours — démarré à hh:mm » (déroutement signalé), avant même que le journal du site ne le connaisse. « Écrire le CR »
ouvre le compte rendu, qui propose ce vol en premier ; une fois le compte rendu enregistré, la ligne disparaît.

<a id="flightlog-more"></a>**Plus.** Dépliez « Plus » pour exporter la liste filtrée en CSV (tableur) ou relire vos connexions IVAO et VATSIM.

## D'où viennent les vols

- **Vos comptes rendus** : ceux que vous avez écrits, y compris ceux de la suite complète. Un compte rendu de la suite
  complète s'ouvre dans la suite complète.
- **Le journal du site** : vos lignes du « Log des vols » de la compagnie, reprises par le module Site (collage, ou
  lecture par le lanceur).
- **Le réseau** : vos connexions IVAO et VATSIM des sept derniers jours (identifiants réglés dans ⚙). Elles sont
  montrées, jamais enregistrées comme vols.
- **Sans doublon** : un même vol (même date, même indicatif, même immatriculation) n'apparaît qu'une fois. Le compte
  rendu passe avant le journal, le journal avant le réseau ; un compte rendu sans heures reprend le temps de bloc du
  journal.

## Cas particuliers

- **Hors ligne** : les comptes rendus et le journal déjà reçus s'affichent ; le réseau attend la connexion.
- **Sans lanceur** : IVAO et VATSIM ne se relisent qu'à travers le lanceur d'un poste.
- **Sans trigramme** : réglez-le (⚙) ; c'est lui qui choisit vos comptes rendus et vos lignes du journal.
