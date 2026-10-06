@echo off
rem Archive de livraison d'une version publiee (dist/) : voir l'en-tete de tools\publish_dist.py.
rem Usage : tools\publish_dist.cmd [version] [--dist dossier] [--sans-changelog] [--force]
cd /d "%~dp0.."
python tools\publish_dist.py %*
