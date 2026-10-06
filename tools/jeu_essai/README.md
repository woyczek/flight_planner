# Jeu d'essai — XPlane Web Suite

Données minimales pour découvrir ou tester la suite, installées dans `data/` par le premier lancement (carte « Jeu
d'essai ») ou à la main :

```bash
python tools/jeu_essai.py --data data
```

| Dossier | Contenu |
|---|---|
| `missions/` | 12 missions générées, en anglais : **BOXING GLOVES** (A-001Z organisation de l'exercice, A-001A/B Rafale, A-001C ravitailleur, A-001D/E chiffons — pistes adverses révélées par radio à l'heure dite), **EYE OF SOLOGNE** (I-001A E-3F AWACS « le grand disque », I-001B ravitailleur, I-001C Rafale), S-001 (SAR, H160), N-001 (maritime, Caracal), T-001 (transport, A400M) ; affectations écrites à l'installation |
| `utilisateurs/` | quatre pilotes fictifs : ALF (chasse, admin du Centre), BRV (gros porteurs), CHL (hélicoptères), DLT (polyvalent) |
| `disponibilites/` | écrites à l'installation : semaine en cours et suivante, catégories variées, appareils et simulateurs |
| `references/` | flotte des types des missions, référence des 4 pilotes, indicatifs, corrections OACI |
| `config/` | catégories de disponibilité (SOG), mode `develop` |

Dates : les affectations suivent le jour de l'installation — l'exercice BOXING GLOVES le lendemain (heure H 19:00Z :
A-001C, A-001A, A-001D affectées ; A-001B et A-001E libres), I-001A à J+2, N-001 à J+3. Pour remettre les dates à jour :
`python tools/jeu_essai.py --data data --force` (refusé si `data/` n'est pas un jeu d'essai).

Après l'installation : Registre des missions › lire le dossier des missions (le registre se construit), Planning ODV,
Mes missions (profil ALF, BRV, CHL ou DLT). Les cartes des missions (images) ne sont pas fournies : le studio
cartographique les produit.
