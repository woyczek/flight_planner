#!/bin/sh
# Pose l'appel de tools/write_build.sh dans les crochets git post-commit, post-checkout et post-merge de ce clone
# (crochets locaux, non versionnés : à lancer une fois par clone), puis écrit config/build.js.
root=$(git rev-parse --show-toplevel) || exit 1
hooks=$(git rev-parse --git-path hooks)
for h in post-commit post-checkout post-merge; do
  f="$hooks/$h"
  [ -f "$f" ] || printf '#!/bin/sh\n' > "$f"
  grep -q write_build.sh "$f" || printf '\nsh "$(git rev-parse --show-toplevel)/tools/write_build.sh"\n' >> "$f"
  chmod +x "$f" 2>/dev/null
done
sh "$root/tools/write_build.sh"
echo "Crochets posés ; config/build.js écrit."
