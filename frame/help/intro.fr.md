# Pilote — manuel

L'appli Pilote rassemble les outils de préparation et de suivi d'un vol : carburant et niveau, carte, compte rendu,
mes vols, passage au site de la compagnie. Elle marche sur un téléphone comme sur un ordinateur, avec ou sans réseau.

## Premier démarrage

- **Les verbes.** Sur un téléphone, la barre du bas donne cinq entrées : Préparer, Carte, CR, Vols, Réglages (Préparer
  groupe plusieurs outils : une rangée d'onglets au-dessus de l'outil les relie) ; sur un écran, chaque outil est un
  verbe de la colonne de gauche. L'adresse d'un outil (`#fuel`, `#report`…) suffit à y revenir.
- **Votre identité.** Dans ⚙ Réglages, réglez votre trigramme et vos identifiants IVAO, VATSIM et SimBrief : les
  outils s'en servent pour préremplir.
- **Le niveau.** Toujours dans les Réglages, « Niveau » choisit ce que le menu montre : Découverte, Courant ou Complet.
  Un outil caché reste joignable par son adresse.
- **L'aide.** Chaque outil a en tête un volet replié « Comment s'en servir » ; le bouton ? ouvre ce manuel au chapitre
  de l'outil.
- **Le bouton i.** Dans l'en-tête, à côté de ? et de ⚙ : une pastille verte quand quelque chose vous attend. Il ouvre une
  fiche d'état : le vol en cours (touchez pour aller à la Carte), les comptes rendus à écrire pour vos vols passés
  (touchez pour ouvrir le compte rendu prérempli), l'état des données (dernière synchronisation, écritures en attente,
  moyen d'échange utilisé) et « Hors ligne » quand il n'y a pas de réseau. Échap ou ✕ la ferme.

## Données et synchronisation

- **Hors ligne d'abord.** Tout ce que vous faites est gardé sur l'appareil et marche sans réseau.
- **Seul sur cet appareil.** Sans échange coché dans les Réglages, rien ne part ailleurs : exportez de temps en temps
  la sauvegarde de l'appareil (un fichier), c'est la seule copie.
- **Plusieurs appareils, ou à plusieurs.** Cochez l'usage dans les Réglages et réglez l'accès (dépôt GitHub et jeton
  personnel, ou le lanceur d'un poste). Vos écritures partent ensemble à la synchronisation : au démarrage, toutes les
  10 minutes en ligne, ou par le bouton d'état en haut de l'écran.
- **Conflits.** Un fichier changé ici et ailleurs en même temps garde sa version la plus récente ; l'autre reste
  consultable (bouton d'état, puis « Conflits ») et peut être reprise.
