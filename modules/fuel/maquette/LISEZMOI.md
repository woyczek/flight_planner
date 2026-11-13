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
