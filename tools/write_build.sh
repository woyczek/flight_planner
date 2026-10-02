#!/bin/sh
# Commit courant → config/build.js (hors dépôt) : le pied de page l'affiche même en file:// (« v4.6.0+0e24839 »).
# Appelé par les crochets git post-commit, post-checkout et post-merge (tools/install_hooks.sh les pose).
root=$(git rev-parse --show-toplevel) || exit 0
sha=$(git rev-parse HEAD 2>/dev/null) || exit 0
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
tag=$(git describe --exact-match --tags HEAD 2>/dev/null)
printf 'window.REPOSITORY_BUILD = { sha: "%s", branch: "%s", tag: "%s" };\n' "$sha" "$branch" "$tag" > "$root/config/build.js"
exit 0
