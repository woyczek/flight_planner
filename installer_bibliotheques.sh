#!/usr/bin/env bash
# Installe les bibliothèques Python EN OPTION de la suite (SOG-0376) : lecture des PDF, et à part l'OCR.
# À lancer par l'utilisateur dans un terminal (« sh installer_bibliotheques.sh »), jamais par le lanceur ni par une page.
# Tout le reste est dans tools/install_libs.py ; la liste et les bornes sont dans tools/requirements-optional.txt.
# Python est cherché COMME dans lancer.sh (même ordre : python3, python ; version 3.8 au moins) ; ce script n'installe pas Python.
cd "$(dirname "$0")" || exit 1

find_python() {
  for c in python3 python; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)' >/dev/null 2>&1; then
      echo "$c"
      return 0
    fi
  done
  return 1
}

PY=$(find_python) || { echo "Python 3 est introuvable : lancez d'abord lancer.sh (il l'installe), puis relancez ce script. / Python 3 was not found: run lancer.sh first."; exit 1; }
exec "$PY" tools/install_libs.py "$@"
