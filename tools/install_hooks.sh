#!/bin/sh
# Pose l'appel de tools/write_build.sh dans les crochets git post-commit, post-checkout et post-merge de ce clone
# (crochets locaux, non versionnés : à lancer une fois par clone), puis écrit config/build.js.
# Appel tolérant : sur une branche sans tools/write_build.sh (ancienne version), rien, sans erreur.
root=$(git rev-parse --show-toplevel) || exit 1
hooks=$(git rev-parse --git-path hooks)
for h in post-commit post-checkout post-merge; do
  f="$hooks/$h"
  [ -f "$f" ] || printf '#!/bin/sh\n' > "$f"
  grep -q write_build.sh "$f" || printf '\nf="$(git rev-parse --show-toplevel)/tools/write_build.sh"; [ -f "$f" ] && sh "$f"; exit 0\n' >> "$f"
  chmod +x "$f" 2>/dev/null
done
# pilote de fusion des empreintes ?v= (tools/merge_vstamp.py, déclaré dans .gitattributes) : configuration locale du clone
git config merge.vstamp.name "empreintes ?v= : résolues seules (tools/merge_vstamp.py)"
git config merge.vstamp.driver "python tools/merge_vstamp.py %O %A %B"
sh "$root/tools/write_build.sh"
echo "Crochets posés ; pilote de fusion vstamp configuré ; config/build.js écrit."
