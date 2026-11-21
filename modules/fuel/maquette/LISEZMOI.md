# Maquette : le bloc « Procédures » de Carburant (SOG-0308)

**Adresse ouvrable** (servie par le lanceur, comme l'application) : `/modules/fuel/maquette/procedures.html` — par exemple
`http://localhost:8000/modules/fuel/maquette/procedures.html` sur le lanceur du poste. Autonome : rien n'est lu ni écrit ; un bouton par
état en haut de la page (`#complet`, `#arriere`, `#carte`, `#lnm`, `#vide`, `#sansdepart`, `#atis`).

Le contenu est le **dessin de l'ergonome du 13 nov. 2026** (fiche SOG-0308), tel quel ; vol inventé du banc (LFRS → LFML ; LFPO pour le
départ dont une piste n'a aucun départ publié). Aucun code du bloc avant le oui de l'utilisateur.

Captures (390 et 1 280 de l'arrivée complète et de l'avertissement de vent ; 390 des cinq autres états) :
`procedures_complet_{390,1280}.png`, `procedures_arriere_{390,1280}.png`, `procedures_{carte,lnm,vide,sansdepart,atis}_390.png`.

## Ce que montre la page, d'après le dessin
1. Un côté par terrain, un seul ouvert. Replié : une phrase et une marque (✓ complet, ! à choisir, ⌛ périmé).
2. Ouvert : trois lignes (Piste, Départ / Arrivée, Approche), chacune son nom, sa valeur en mots, sa source en petit et UN geste
   « Changer » à droite. Le vent en mots (« face 12 kt · travers 1 kt »), jamais en flèches seules ni en couleur seule.
3. Piste en vent arrière : la ligne passe en avertissement avec « Prendre la 31L (vent de face) » ; ATIS d'un réseau de la compagnie :
   « ATIS IVAO : 31L en service » et « Prendre la piste de l'ATIS ».
4. « Changer » ouvre la liste de CETTE ligne, à sa place ; au téléphone, une feuille du bas. Pistes : la mieux orientée en tête, le vent
   arrière marqué, une piste sans départ publié en dernier (« aucun départ publié »). Approches : codées d'abord, puis « par leur carte
   seulement ».
5. En tête du côté : « Choisir sur la carte », un seul geste. Au pied, replié : « Source et cartes » (date de lecture et « Relire »,
   toutes les cartes du terrain, « Lire depuis Little Navmap » quand il existe). Une procédure de Little Navmap le dit sur sa ligne.

## Écarts au dessin, dits
- L'exemple « ILS 23 — par sa carte » : LFML n'a pas de piste 23 ; la page montre « ILS 31R — par sa carte : ni tracé ni distance ».
- Indicatifs et fréquences des moyens (« ML 110,30 », « MSE 108,95 ») : inventés pour la maquette ; dans l'application ils viendront de
  `navaidsOf(icao)` d'AeroDB (ILS / LOC d'abord).


---

# Maquette : durée et carburant de chaque route proposée (SOG-0545)

**Adresse ouvrable** : `/modules/fuel/maquette/routes.html`, par exemple
`http://localhost:8000/modules/fuel/maquette/routes.html` sur le lanceur du poste. Autonome, nombres inventés, rien n'est lu ni écrit.
Un bouton par état : `#auto` (niveau « Auto », vent connu), `#nowind` (« Auto », vent inconnu), `#fixed` (niveau fixé FL270, les trois
variantes du moteur). Captures : `routes_<état>_390.png`, `routes_<état>_1280.png`. Version 2, après la relecture de l'ergonome du 21/11
(corrections a à f, réponses aux deux questions).

## Ce que montre la maquette
- **La route gardée** est la première dans l'ordre de SOG-0540 (verdict, règle semi-circulaire, raccord publié), puis, dernier
  critère, le carburant de sa ligne. Une route meilleure en chiffres que la gardée et non gardée dit pourquoi sur sa ligne
  (« hors règle semi-circulaire », « raccord direct ») : en « Auto », FL280 est la plus rapide et la plus économe, hors règle.
- **L'ordre de la liste** : la gardée, puis les conformes, les non vérifiables, « enfreint » en dernier ; à verdict égal, par carburant.
- **Une carte par route** : en tête la mention (« la plus rapide », « la plus économe » ; une ligne peut avoir les deux), puis FL, nom,
  verdict ; dessous distance, temps et carburant en colonnes alignées d'une route à l'autre, le nombre désigné par la mention en gras ;
  puis la route écrite. Le geste à droite (« Choisir », ou « pris »).
- **Les trois verdicts ne se confondent jamais** : « conforme » en gris, « Non vérifiable » en orange, « enfreint » dans le rouge d'erreur
  du cadre (--sog-err).
- **Les nombres sont nommés une fois**, au-dessus de la première carte, alignés sur les colonnes : « Distance », « Temps », « Étape » —
  les mots du devis (le bandeau dit « Étape » pour ce carburant, « Délestage » en entier, « Temps » pour la durée), aux deux largeurs.
- **« conforme »** est dit une fois, sous « Calculé à … » : « « conforme » : conforme à ce que nous savons lire. Seul Eurocontrol valide un
  plan. » (les deux phrases existantes), plus sous chaque carte.
- **Mentions** : en « Auto » comme à niveau fixé, dès que deux routes sont montrées et que leurs nombres diffèrent ; jamais sur une route
  « enfreint » ; aucune quand les nombres sont égaux. Vent inconnu : fourchettes, comparées par le haut puis par le bas ; « vent inconnu »
  une fois dans l'en-tête.
- **À 390, le texte coupé est la route écrite** (une ligne, « … »), entière dans le pli et sur la Carte ; nombres, verdict et mentions
  jamais coupés ni rapetissés ; un verdict long passe à la ligne entier. À 1280, le geste tient sur la hauteur du titre et des nombres
  (plus de vide sous le titre).

## Mots nouveaux
« la plus rapide », « la plus économe » (ceux de la fiche) ; la durée « 1 h 28 » (accordée par l'ergonome). Rien d'autre : « Distance »,
« Temps », « Étape », « hors règle semi-circulaire », « raccord direct », « conforme à ce que nous savons lire », « Seul Eurocontrol
valide un plan. » existent.
