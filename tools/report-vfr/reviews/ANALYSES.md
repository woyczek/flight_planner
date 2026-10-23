# Analyses manuelles du 23 octobre 2026

AIRAC d'analyse : 2610. Le cycle global des sources locales reste non établi. Chaque fichier `interpretations/OACI.json` lie l'analyse à l'empreinte du PDF effectivement lu.

## Arcachon — LFCH

Sources : carte APP 01 (page PDF 1), TXT 01 et TXT 02 (pages 4–5).

L'entrée NE impose une première branche RM185 jusqu'à l'autoroute, un virage à droite pour suivre l'autoroute jusqu'au lac, puis RM250 jusqu'à N. Une droite NE–N traverse l'intérieur du virage et perd le suivi de l'A660. Neuf sommets ont été choisis sur le tracé noir de la carte pour restituer le raccordement, l'inflexion et le passage du lac. Leurs coordonnées sont obtenues par un calage local sur NE et N, avec les positions graphiques conservées dans le JSON.

Le calage à deux repères ne constitue pas une validation indépendante de précision. Les sommets sont `manual`, pas des points de report officiels. Ils sont identifiés `MAN-A660-01` à `MAN-A660-09`.

W–N est une branche d'arrivée RM076 ; la légende de la carte la réserve aux aéronefs basés. Les départs E et SD comportent une altitude de 1000 ft AMSL ; DEP SD et ARR W comportent la condition de transpondeur 7056 si LF-R31A est active. Le point P est réservé à des vols courts HEL sous protocole. L'intégration proche des pistes et le trajet P ne sont pas numérisés.

![Carte source LFCH](LFCH-1.png)

## Nice — LFMN

Sources : APP01 (page 1) et TXT02 (page 5).

N1 arrivée exige le suivi du Var depuis NA, via NB jusqu'à WN. Cinq sommets graphiques supplémentaires décrivent les inflexions de la rivière. Le point NB reste un point de report au milieu du cheminement. Le calage est fait sur NA et WN de la carte rendue à 130 dpi ; précision indépendante non validée.

W1 exige EW–WA puis le suivi de l'autoroute vers WN. Cette géométrie d'autoroute n'a pas été numérisée ; la consigne est préservée dans les données. Les départs N1 et W1 sont séparés des arrivées ; la variante de départ QFU223 vers WA demande une instruction ATC. Les séquences dessinées ne comprennent ni la verticale TWR ni les tours de piste. Autres transits et cheminements HEL : analyse encore ouverte.

![Carte source LFMN](LFMN-1.png)

## Bordeaux — LFBD

Sources : APP01 et TXT01–02 (pages 1, 5–6).

Quinze occurrences du tableau par piste ont été structurées, avec la visibilité minimale par branche. Le sens est double conformément au texte. L'altitude par défaut est 1500 ft AMSL sauf clairance particulière. La sortie SW est traitée comme exception : sortie S par défaut, SW sur demande et autorisation du contrôle à l'altitude assignée.

La géométrie ne contient que le segment entre le point intérieur et le point extérieur, confirmé sur la carte. La branche d'aérodrome, les virages et l'intégration ne sont pas remplacés par une ligne vers l'ARP. Ces géométries sont marquées partielles.

## Toulouse — LFBO

Source : TXT02 (page 8).

Les trois itinéraires nommés sont NA1 (N–NA–EA–EB), WH1 (WH–WF–WD) et EN1 (EN–EA–EB). La ligne N–NA–EA est une observation de suivi d'autoroute et non une route supplémentaire. Les minima de visibilité de VFR spécial sont transcrits par itinéraire, avec l'exception HEL pour NA1. Les sens non explicitement établis restent `unknown`. L'autoroute n'a pas encore été numérisée.

## Andernos — LFCD

Sources : carte et TXT01 (pages 1–2).

Le texte prévoit l'arrivée ou le départ par N ou SE pour le secteur sud. Deux branches AD–N et AD–SE ont été conservées ; aucune liaison N–SE n'a été inventée. Les contraintes d'évitement des zones habitées et d'axe en montée initiale sont conservées. Pas de géométrie d'intégration numérisée.

## Aix — LFMA

Source : TXT03 (page 7).

AR relève de la panne radio ; AS et AW sont utilisables sur instruction ATC. La consigne de panne radio après clairance comporte AR, 2200 ft AMSL maximum, phares allumés puis RM228 vers la verticale et un circuit à l'ouest. Une relation AR–AD est enregistrée exclusivement pour cette procédure conditionnelle, avec l'ARP transcrit depuis la page 1. Le circuit n'est pas numérisé. Aucune route VFR ordinaire n'est déduite de l'alignement des points. Le statut n'est donc pas `sans relations`.

## Marseille — LFML

Sources : table de points TXT02 (page 6), tables graphiques TXT03–04 (pages 7–8).

L'ordre du texte extrait mélange certaines colonnes. Les deux pages de tableaux ont été relues visuellement pour rétablir les trajectoires d'arrivée, de départ et de transit côtier. Quinze routes ont été structurées, avec les altitudes par point et les distinctions de piste à la sortie E. LP et CB sont traités comme alternatives ; aucune liaison LP–CB n'est créée. Les sens ne sont pas obtenus par inversion automatique des arrivées. Les plafonds MAX sont distincts des valeurs simples.

La référence verticale n'est pas ajoutée par hypothèse au-delà de ce qu'énonce la table. Les consignes VFR spécial et VFR nuit restent dans les pages sources. Les tracés côtiers n'ont pas été numérisés.

![Arrivées et transits LFML](LFML-7.png)

![Départs LFML](LFML-8.png)

## Portée et suite de l'analyse

Les sept AD ci-dessus portent `interprété` avec `interpretationScope: partial`. Cela atteste l'existence de cette lecture, pas une validation exhaustive de toutes leurs procédures. Les autres AD restent `calculé`. Le fichier `data/etat-ad.json` donne l'état par aérodrome pour poursuivre ce travail sans confondre absence d'extraction et absence d'itinéraire.

## Aperçu du lecteur vérifié

![Cheminement NE–N et points manuels dans le lecteur](apercu-lfch.png)
