# Audit de sécurité — 2 octobre 2026

Périmètre : la suite telle qu'elle est servie (pages statiques et scripts de `apps/` et `shared/`), le lanceur
(`tools/launch.py`), les données lues (missions YAML et Markdown écrites par ChatGPT, fichiers importés), les secrets
gardés par le navigateur. Méthode : lecture du code, recherches ciblées (insertion HTML, adresses, évaluation de code,
messages entre pages), essais du lanceur (requêtes forgées).

## Corrigé

| Point | Risque | Correction |
|---|---|---|
| Lanceur : fichiers servis sans contrôle de l'en-tête `Host` | Une page d'un autre site qui ferait pointer son nom vers 127.0.0.1 (« DNS rebinding ») pouvait lire le dossier, `data/` (données privées) compris | `Host` de la machine exigé pour toute requête (GET, HEAD, POST) : 127.0.0.1, localhost, [::1] et le port du lanceur ; sinon 403 |
| Lanceur : taille des envois non bornée | Mémoire saturée par un envoi démesuré | 512 Mo au plus, sinon 413 ; taille invalide : 400 |
| Lanceur : identifiants framagit passés à `git credential approve` | Un retour à la ligne dans l'identifiant ou le mot de passe glissait un champ de plus | Retours à la ligne et caractère nul refusés |
| Lanceur : type des fichiers | Interprétation d'un fichier dans un autre type par le navigateur | En-tête `X-Content-Type-Options: nosniff` ; `config/repository_tree` (script sans extension) servi en `text/javascript`, sinon refusé par le navigateur (plus de menu) |
| Planificateur carburant : commentaire d'un profil d'appareil, noms de phase | Un profil importé (fichier) pouvait glisser du HTML dans le tableau | Échappés (`RepositoryKit.esc`) |
| Paramètres : adresse du webservice d'envoi des CR | La clef d'envoi part dans un en-tête : en `http://`, elle passerait en clair | `https://` obligatoire, sauf sur la machine (localhost, essais) |

## Vérifié, conforme

- **YAML** : js-yaml 4.1.0, `load` sans type exécutable (pas de fonction, pas d'expression).
- **Insertion HTML** : les textes des missions, plis, pistes, registres et CR passent par `esc` (kit) avant d'entrer
  dans la page ; les deux rendus Markdown (registre, « Mes missions ») échappent le texte avant de poser gras, italique,
  code et tableaux ; les liens construits viennent de la configuration de la suite, jamais des données.
- **Code évalué** : ni `eval` ni `new Function` dans le code de la suite (hors bibliothèques tierces).
- **Messages entre pages** : `BroadcastChannel` (même origine seulement), aucun `postMessage` reçu d'une autre fenêtre.
- **Interface du lanceur** (`/__setup/…`) : en-tête `X-DEFA-Setup` exigé, auquel une autre page ne peut répondre sans
  pré-vérification CORS, que ce serveur ne traite pas ; écoute sur 127.0.0.1 seulement ; archive de données extraite dans
  `data/` seulement (chemins sortants ignorés) ; identifiants framagit passés à Git par l'environnement, jamais écrits
  dans `.git/config` ni dans l'adresse.
- **Secrets du navigateur** : clef du webservice d'envoi (`missionSendKey:`), identifiants du site DEFA
  (`defaCredentials:`) exclus des sauvegardes (`browser_store.js`, liste SKIP) ; jamais écrits dans un fichier.
- **Liens externes** : ouverts avec `noopener`.

## Risques restants (acceptés ou à suivre)

- **Secrets en clair dans le stockage du navigateur** (clef d'envoi, identifiants DEFA) : lisibles par tout script de
  la page ; la suite n'en charge aucun d'ailleurs (bibliothèques, styles et polices servis avec elle, vérifié). À revoir si un
  webservice DEFA réel est branché (jeton à durée limitée plutôt qu'une clef permanente).
- **Pas de politique de sécurité du contenu (CSP)** : les pages ont des scripts en ligne ; une CSP stricte demanderait
  de les sortir dans des fichiers. Bénéfice limité pour une suite servie en local.
- **Dossier `.git` servi par le lanceur** : nécessaire au numéro de commit du pied de page ; il ne contient pas les
  identifiants (gestionnaire d'identifiants du système), et reste limité à la machine.
- **Fichiers ouverts par l'utilisateur** (missions, profils, classeurs ODV) : traités comme des données, jamais comme
  du code ; un fichier piégé ne peut au pire qu'afficher un texte trompeur.
