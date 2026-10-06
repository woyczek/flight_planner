#!/usr/bin/env bash
# Archive de livraison d'une version publiée (dist/) : voir l'en-tête de tools/publish_dist.py.
# Usage : tools/publish_dist.sh [version] [--dist dossier] [--sans-changelog] [--force]
cd "$(dirname "$0")/.." || exit 1
PY=$(command -v python3 || command -v python)
exec "$PY" tools/publish_dist.py "$@"
