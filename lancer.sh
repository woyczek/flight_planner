#!/usr/bin/env bash
# Lanceur de la suite DEFA (macOS / Linux) : dans un terminal, « sh lancer.sh » (ou ./lancer.sh).
# Trouve Python (propose de l'installer au besoin), récupère les données (data/), démarre le serveur local et ouvre la
# page des paramètres. Tout le reste est dans tools/launch.py.
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

install_python() {
  echo "Python 3 est introuvable."
  if [ "$(uname)" = "Darwin" ]; then
    if command -v brew >/dev/null 2>&1; then
      echo "Installation par Homebrew : brew install python"
      brew install python
    else
      echo "Installation des outils de développement d'Apple (ils fournissent Python 3) : une fenêtre va s'ouvrir."
      echo "Une fois l'installation terminée, relancez : sh lancer.sh"
      xcode-select --install 2>/dev/null
      open "https://www.python.org/downloads/macos/" 2>/dev/null
      exit 1
    fi
  else
    printf "Installer Python 3 maintenant (mot de passe administrateur demandé) ? [O/n] "
    read -r answer
    case "$answer" in [nN]*) echo "Installez Python 3, puis relancez : sh lancer.sh"; exit 1 ;; esac
    if command -v apt-get >/dev/null 2>&1; then sudo apt-get update && sudo apt-get install -y python3
    elif command -v dnf >/dev/null 2>&1; then sudo dnf install -y python3
    elif command -v pacman >/dev/null 2>&1; then sudo pacman -S --noconfirm python
    elif command -v zypper >/dev/null 2>&1; then sudo zypper install -y python3
    else echo "Gestionnaire de paquets inconnu : installez Python 3, puis relancez."; exit 1
    fi
  fi
}

PY=$(find_python) || { install_python; PY=$(find_python) || { echo "Python 3 toujours introuvable."; exit 1; }; }
exec "$PY" tools/launch.py "$@"
