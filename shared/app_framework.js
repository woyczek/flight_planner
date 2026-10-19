(() => {
  // Blocs : déplacer / masquer, mémorisé par page. data-default-hidden="1" : bloc masqué tant
  // que l'utilisateur ne l'a pas affiché (son choix est ensuite mémorisé).
  /** Clé de stockage de la disposition des blocs de la page courante (ordre, blocs masqués). */
  const key = () => `repositoryFramework:${window.RepositoryNav?.page?.path||location.pathname}`;
  /** Réglages de démarrage de la page : défauts de repository_tree, réglages du dossier et de la page, fichiers associés. */
  const startupConfig = () => ({
    ...(window.REPOSITORY_TREE?.defaults?.config || {}),
    ...(window.RepositoryNav?.settings?.config || {}),
    files: {
      ...(window.RepositoryNav?.settings?.files || {})
    }
  });
  /** Disposition mémorisée des blocs de la page ({ hidden, order }) ; objet vide si absente ou illisible. */
  const read = () => {
      try {
        return JSON.parse(localStorage.getItem(key()) || "{}") || {}
      } catch {
        return {}
      }
    },
    /** Mémorise la disposition des blocs de la page (localStorage, clé key()). */
    write = x => localStorage.setItem(key(), JSON.stringify(x));
  // Bloc en cours de déplacement (poignée ↕), commun à tous les appels d'init (blocs montés plus tard compris) ; null sinon.
  let movingBlock = null;
  /** Bloc voisin à l'écran (frère suivant, dir 1, ou précédent, dir -1) de el, en sautant ce qui n'est pas un bloc et
   *  les blocs invisibles (un bloc caché entre deux blocs affichés n'en fait pas des non-voisins). */
  const sibBlock = (el, dir) => {
    let x = el;
    do x = dir > 0 ? x.nextElementSibling : x.previousElementSibling;
    while (x && (!x.classList.contains("repo-block") || !x.offsetParent));
    return x;
  };
  /** Côté de dépôt sur le bloc el : « before » sur sa moitié haute, « after » sur sa moitié basse (dernière position).
   *  Un dépôt qui ne changerait rien est retourné : bloc juste au-dessous du bloc déplacé (on descend 1 sur 2) → après
   *  lui ; bloc juste au-dessus (on remonte 2 sur 1) → avant lui. */
  const dropSide = (el, e) => {
    const r = el.getBoundingClientRect();
    let side = e.clientY > r.top + r.height / 2 ? "after" : "before";
    if (side === "before" && sibBlock(el, -1) === movingBlock) side = "after";
    else if (side === "after" && sibBlock(el, 1) === movingBlock) side = "before";
    return side;
  };
  const clearDrop = () => document.querySelectorAll(".repo-block-drop-before,.repo-block-drop-after").forEach(x => x.classList
    .remove("repo-block-drop-before", "repo-block-drop-after"));
  // glisser d'un bloc vers le haut ou le bas d'une longue page : le navigateur ne fait défiler qu'au bord de la fenêtre,
  // masqué en haut par l'en-tête fixe ; la page défile près du bas de la fenêtre et juste sous l'en-tête
  document.addEventListener("dragover", e => {
    if (!movingBlock) return;
    const top = Math.max(0, document.querySelector(".repo-header")?.getBoundingClientRect().bottom || 0),
      zone = 70,
      y = e.clientY;
    if (y < top + zone) window.scrollBy(0, -Math.ceil((top + zone - y) / 3));
    else if (y > innerHeight - zone) window.scrollBy(0, Math.ceil((y - innerHeight + zone) / 3));
  });

  /** Transforme les sections de la page en blocs : en-tête avec poignée de déplacement ↕ et bouton Masquer / Afficher, glisser-déposer entre blocs frères, disposition mémorisée par page et réappliquée ; data-default-hidden="1" : bloc masqué tant que l'utilisateur ne l'a pas affiché. */
  /** Blocs du framework dans root (par défaut le contenu principal de la page : main, .wrap) ; root permet d'en
   *  monter ailleurs (fenêtre modale Apparence…). */
  function init(root) {
    const main = root instanceof Element ? root : document.querySelector("main,.wrap");
    if (!main) return;
    const state = read();
    state.hidden ??= {};
    state.order ??= {};
    const blocks = [...main.querySelectorAll("section,.panel,.analysis-dock,.reading-card")].filter(el => !el.closest(
      "section") || el.matches("section,.panel"));
    const parents = new Map();
    blocks.forEach((el, i) => {
      const id = el.dataset.blockId || el.id || `block-${i+1}`;
      el.dataset.blockId = id;
      el.classList.add("repo-block");
      const parent = el.parentElement;
      if (!parents.has(parent)) parents.set(parent, []);
      parents.get(parent).push(el);
      let h = el.querySelector(":scope>h2,:scope>.row>h2"),
        head = h?.parentElement?.classList.contains("row") && h.parentElement.parentElement === el ? h.parentElement : null;
      if (h && !head) {
        head = document.createElement("div");
        head.className = "repo-block-heading";
        h.before(head);
        head.append(h)
      }
      if (head) {
        head.classList.add("repo-block-heading");
        if (!head.querySelector(".repo-block-tools")) {
          const t = document.createElement("span");
          t.className = "repo-block-tools";
          t.innerHTML = '<button type="button" class="repo-drag">↕</button><button type="button" class="repo-toggle"></button>';
          head.append(t)
        }
        const b = head.querySelector(".repo-toggle"),
          isHidden = () => id in state.hidden ? !!state.hidden[id] : el.dataset.defaultHidden === "1",
          apply = () => {
            const hide = isHidden();
            el.classList.toggle("repo-block-hidden", hide);
            b.textContent = label(hide ? "show" : "hide");
            b.title = b.textContent; // libellé masqué dans les designs à matières (icône seule)
            b.setAttribute("aria-label", b.textContent);
            head.querySelector(".repo-drag").title = label("move")
          };
        apply();
        b.onclick = () => {
          state.hidden[id] = !isHidden();
          apply();
          write(state)
        };
        head.querySelector(".repo-drag").onpointerdown = () => el.draggable = true
      }
      // déplacement d'un bloc (poignée ↕) seulement : les glissers des éléments du bloc (cartes, plaquettes, membres des
      // Ordres de vols…) remontent jusqu'ici ; pris pour un déplacement du bloc, ils l'estompaient (« écran grisé ») et
      // faisaient accepter un dépôt n'importe où
      el.ondragstart = e => {
        if (e.target !== el) return;
        movingBlock = el;
        el.classList.add("repo-block-dragging");
        e.dataTransfer.effectAllowed = "move"
      };
      el.ondragend = e => {
        if (e.target !== el) return;
        movingBlock = null;
        el.draggable = false;
        el.classList.remove("repo-block-dragging");
        clearDrop();
        // ordre de chaque conteneur (colonnes comprises : un bloc a pu passer de l'une à l'autre), sous une clé unique
        state.layout ??= {};
        for (const p of parents.keys()) state.layout[containerKey(p, main)] = blockChildren(p).map(x => x.dataset.blockId);
        write(state)
      };
      // cible : le bloc survolé s'illumine, trait avant ou après lui selon la moitié survolée ; dépôt possible dans une
      // autre colonne (autre conteneur), jamais dans le bloc déplacé lui-même ni dans un bloc qu'il contient
      const target = e => movingBlock && movingBlock !== el && !movingBlock.contains(el) && e.target.closest(".repo-block") === el;
      el.ondragover = e => {
        if (!target(e)) return;
        e.preventDefault();
        const side = dropSide(el, e);
        if (!el.classList.contains(`repo-block-drop-${side}`)) {
          clearDrop();
          el.classList.add(`repo-block-drop-${side}`);
        }
      };
      el.ondragleave = e => {
        if (!el.contains(e.relatedTarget)) el.classList.remove("repo-block-drop-before", "repo-block-drop-after");
      };
      el.ondrop = e => {
        if (!target(e)) return;
        e.preventDefault();
        el.parentElement.insertBefore(movingBlock, dropSide(el, e) === "after" ? el.nextSibling : el);
        clearDrop();
      };
    });
    // ordre mémorisé : state.layout (clé unique du conteneur : chemin depuis la page) — un bloc rangé dans une autre
    // colonne y retourne ; à défaut, ancien state.order (balise et rang, pas unique) : chaque conteneur ne reprend que
    // ses propres blocs. Clés calculées avant de déplacer quoi que ce soit.
    const keyed = [...parents.keys()].map(p => [p, containerKey(p, main)]);
    if (state.layout) {
      const all = new Map(blocks.map(x => [x.dataset.blockId, x]));
      for (const [p, k] of keyed)(state.layout[k] || []).forEach(id => {
        const e = all.get(id);
        if (e && e !== p && !e.contains(p)) p.append(e)
      });
    } else
      for (const p of parents.keys()) {
        const map = new Map(blockChildren(p).map(x => [x.dataset.blockId, x]));
        (state.order[parentKey(p)] || []).forEach(id => {
          const e = map.get(id);
          if (e) p.append(e)
        })
      }
  }

  /** Blocs (.repo-block) enfants directs d'un élément. */
  function blockChildren(parent) {
    return Array.from(parent?.children || []).filter(x => x?.classList?.contains("repo-block"))
  }

  /** Ancienne clé d'un conteneur de blocs (balise et rang parmi ses frères) : pas unique, lue pour les dispositions déjà
   *  mémorisées. */
  function parentKey(p) {
    return `${p.tagName}:${[...p.parentElement?.children||[]].indexOf(p)}`
  }
  /** Clé unique d'un conteneur de blocs : chemin depuis la racine des blocs, insensible aux blocs déplacés — id quand il
   *  y en a, identifiant de bloc pour un bloc du chemin, sinon balise et rang parmi les éléments qui ne sont pas des blocs. */
  function containerKey(p, root) {
    const parts = [];
    for (let e = p; e && e !== root && e !== document.body; e = e.parentElement) {
      if (e.id) {
        parts.unshift(`#${e.id}`);
        break;
      }
      if (e.classList.contains("repo-block") && e.dataset.blockId) {
        parts.unshift(`@${e.dataset.blockId}`);
        continue;
      }
      const sib = [...e.parentElement?.children || []].filter(x => !x.classList.contains("repo-block"));
      parts.unshift(`${e.tagName}:${sib.indexOf(e)}`);
    }
    return parts.join(">") || "root";
  }

  /** Pied de page commun : version et date de publication (repository_tree.release), liens du dépôt. */
  function footer() {
    const r = window.REPOSITORY_TREE?.release || {},
      f = document.querySelector("footer") || document.createElement("footer");
    f.className = "repo-footer no-print";
    // licences : dernier lien (le premier est celui de la version, retouché plus bas)
    f.innerHTML = `© RBR - ${window.RepositoryKit.esc(window.RepositoryKit.brand("{SOG_NOM}"))} - ${r.date||"2026-09-21"} - <a href="${r.changelog||"https://framagit.org/asr/flight_planner/-/blob/master/docs/CHANGELOG.md"}" target="_blank" rel="noopener" title="Changelog / notes de version">v${r.version||"2026.09"}</a> - <a href="https://framagit.org/asr/flight_planner">framagit.org/asr/flight_planner</a> - <a href="https://framagit.org/asr/flight_planner/-/blob/master/LICENSE.md" target="_blank" rel="noopener" title="Code : MPL 2.0 · contenu : CC BY-SA 4.0 · licences et crédits des composants et des données tiers">MPL 2.0 · CC BY-SA 4.0</a>`;
    if (!f.isConnected) document.body.append(f);
    buildOf(r).then(b => {
      if (!b) return;
      const a = f.querySelector("a");
      a.textContent = `v${r.version}+${b.short}`;
      a.title = `${b.branch || "HEAD"} — commit ${b.short}, après la version ${r.version} (non publiée)`;
      a.href = `${r.repository?.web || "https://framagit.org/asr/flight_planner"}/-/commit/${b.sha}`
    }).catch(() => {})
  }

  // ---- Version entre deux publications : commit courant lu dans le dépôt servi (.git/HEAD, référence de la branche,
  // tag v<version> : objet du tag annoté décompressé, ou packed-refs). Commit ≠ celui de la version publiée → le pied de
  // page affiche « v4.4.0+abc1234 » (lien vers le commit). Copie sans .git (téléchargement, publication) : rien ne change.
  // En file:// (page ouverte sans le lanceur), .git est illisible : config/build.js, écrit par les crochets git.
  // racine de l'application : config/repository_tree est un dossier plus bas
  const gitRoot = () => {
    const src = document.querySelector('script[src*="repository_tree"]')?.src;
    return src ? new URL(/\/config\/repository_tree/.test(src) ? ".." : ".", src).href : new URL(".", location.href).href;
  };
  /** Texte d'un fichier du dossier .git servi (relu sans cache) ; null s'il est illisible. */
  const gitText = async path => {
    const res = await fetch(gitRoot() + ".git/" + path, {
      cache: "no-store"
    });
    return res.ok ? res.text() : null;
  };
  /** SHA d'une référence (fichier libre, sinon packed-refs ; peel : commit pointé par un tag annoté). */
  async function gitRef(ref, peel) {
    const loose = (await gitText(ref))?.trim();
    if (/^[0-9a-f]{40}$/.test(loose || "")) return peel ? peelTag(loose) : loose;
    const packed = (await gitText("packed-refs")) || "",
      lines = packed.split("\n"),
      i = lines.findIndex(l => l.endsWith(" " + ref));
    if (i < 0) return null;
    const sha = lines[i].slice(0, 40),
      peeled = lines[i + 1]?.startsWith("^") ? lines[i + 1].slice(1, 41) : null;
    return peel ? peeled || peelTag(sha) : sha;
  }
  /** Commit pointé par un objet tag (objet libre zlib : « tag n\0object <sha> ») ; l'objet lui-même s'il n'est pas un tag. */
  async function peelTag(sha) {
    try {
      const res = await fetch(`${gitRoot()}.git/objects/${sha.slice(0, 2)}/${sha.slice(2)}`, {
        cache: "no-store"
      });
      if (!res.ok || !window.DecompressionStream) return sha;
      const text = await new Response(res.body.pipeThrough(new DecompressionStream("deflate"))).text();
      return /^tag \d+\0object ([0-9a-f]{40})/.exec(text)?.[1] || sha;
    } catch {
      return sha;
    }
  }
  /** Commit écrit par les crochets git (tools/write_build.sh → config/build.js) : lisible aussi en file://, où le
   *  navigateur refuse de lire .git ; null sans fichier. */
  const buildFile = () => new Promise(done => {
    if (window.REPOSITORY_BUILD) return done(window.REPOSITORY_BUILD);
    const s = document.createElement("script");
    s.src = gitRoot() + "config/build.js?t=" + Date.now();
    s.onload = () => done(window.REPOSITORY_BUILD || null);
    s.onerror = () => done(null);
    document.head.append(s);
  });
  /** Commit servi (dépôt d'où la page est servie) : { sha, branch } ; null sans .git lisible ni config/build.js. Relu à
   *  chaque appel : c'est le code qui tourne, à la différence d'un relevé du dossier mémorisé par le navigateur. */
  async function servedCommit() {
    const viaBuild = async () => {
      const b = await buildFile();
      return /^[0-9a-f]{40}$/.test(b?.sha || "") ? {
        sha: b.sha,
        branch: b.branch || ""
      } : null;
    };
    if (!/^https?:$/.test(location.protocol)) return viaBuild();
    const head = (await gitText("HEAD").catch(() => null))?.trim();
    if (!head) return viaBuild();
    const ref = head.startsWith("ref: ") ? head.slice(5) : "",
      sha = ref ? await gitRef(ref) : head;
    return /^[0-9a-f]{40}$/.test(sha || "") ? {
      sha,
      branch: ref.replace(/^refs\/heads\//, "")
    } : viaBuild();
  }
  /** { sha, short, branch } si le commit courant n'est pas celui de la version publiée ; null sinon (ou sans .git). */
  async function buildOf(r) {
    if (!r.version) return null;
    if (!/^https?:$/.test(location.protocol)) { // file:// : commit écrit par les crochets git
      const b = await buildFile();
      return b?.sha && b.tag !== `v${r.version}` ? {
        sha: b.sha,
        short: b.sha.slice(0, 7),
        branch: b.branch || ""
      } : null;
    }
    const head = (await gitText("HEAD"))?.trim();
    if (!head) return null;
    const branch = head.startsWith("ref: ") ? head.slice(5) : "",
      sha = branch ? await gitRef(branch) : head;
    if (!/^[0-9a-f]{40}$/.test(sha || "")) return null;
    const tagged = await gitRef(`refs/tags/v${r.version}`, true);
    return tagged === sha ? null : {
      sha,
      short: sha.slice(0, 7),
      branch: branch.replace(/^refs\/heads\//, "")
    };
  }

  /** Libellé d'un bouton de bloc (show / hide / move…) dans la langue de la page. */
  function label(k) {
    const l = window.RepositoryNav?.getLanguage() || "en",
      d = {
        fr: {
          move: "Déplacer",
          hide: "Masquer",
          show: "Afficher"
        },
        en: {
          move: "Move",
          hide: "Hide",
          show: "Show"
        },
        de: {
          move: "Verschieben",
          hide: "Ausblenden",
          show: "Anzeigen"
        },
        es: {
          move: "Mover",
          hide: "Ocultar",
          show: "Mostrar"
        }
      };
    return d[l][k]
  }
  // Composant partagé : tri par colonne au clic sur un en-tête <th data-sort="clé">,
  // extrait de la table RPM du Flight Performance Planner (shared/flight_ui.js) pour
  // être réutilisé tel quel par les reportings HEMS/GAAR/général et le Landing dashboard.
  function sortableTable(theadEl, stateRef, onSort) {
    if (!theadEl) return;
    theadEl.addEventListener("click", e => {
      const key = e.target.closest("[data-sort]")?.dataset.sort;
      if (!key) return;
      if (stateRef.key === key) stateRef.dir *= -1;
      else {
        stateRef.key = key;
        stateRef.dir = 1;
      }
      onSort(stateRef);
    });
  }
  // Composant partagé : avertit avant de quitter une page si des données saisies n'ont
  // pas été enregistrées (beforeunload + interception des liens de navigation internes).
  function guardUnsavedChanges(isDirty, options) {
    options = options || {};
    let confirmed = false; // départ déjà confirmé dans la page : pas de seconde question du navigateur
    window.addEventListener("beforeunload", e => {
      if (isDirty() && !confirmed) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
    if (options.linkSelector) {
      document.querySelectorAll(options.linkSelector).forEach(link => {
        link.addEventListener("click", async e => {
          if (!isDirty()) return;
          // confirmation dans la page (jamais de boîte native) : navigation retenue, reprise si confirmé
          e.preventDefault();
          const message = options.message || "Des données saisies n'ont pas été enregistrées. Quitter quand même ?";
          if (await ask(message, {
              danger: true
            })) {
            confirmed = true;
            location.href = link.href;
          }
        });
      });
    }
  }
  /** Affiche le bloc id (même masqué par l'utilisateur : son choix est mis à jour), le fait défiler jusqu'à l'écran et
   *  le signale brièvement. Utilisé par les liens « page.html#id-du-bloc » et par les pages (messages à montrer). */
  function reveal(id, {
    flash = true
  } = {}) {
    const el = id && document.querySelector(`[data-block-id="${CSS.escape(id)}"],#${CSS.escape(id)}`);
    if (!el) return false;
    const block = el.closest(".repo-block") || el;
    if (block.classList.contains("repo-block-hidden")) block.querySelector(":scope>.repo-block-heading .repo-toggle")?.click();
    el.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
    if (flash) {
      el.classList.add("repo-block-flash");
      setTimeout(() => el.classList.remove("repo-block-flash"), 1600);
    }
    return true;
  }
  if (!document.getElementById("repoRevealStyle")) document.head.insertAdjacentHTML("beforeend",
    '<style id="repoRevealStyle">.repo-block-flash{outline:3px solid #f59e0b;outline-offset:3px;transition:outline-color 1.2s}</style>');
  // Ancre « #id-du-bloc » : à l'ouverture de la page (une fois les blocs montés) et à chaque changement d'ancre.
  const revealHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) reveal(id);
  };
  window.addEventListener("hashchange", revealHash);
  window.addEventListener("load", () => setTimeout(revealHash, 50));
  // Notifications communes : pile en bas de page, au-dessus des barres fixées. kind : info | ok | warn | err ; toutes
  // s'effacent seules (erreur 12 s, avertissement 8 s, autres 5 s ; en pause tant que la souris est dessus). Options :
  // once (même texte une seule fois par session du navigateur : rappels répétitifs), minLevel (niveau d'utilisation
  // 1 à 4 à partir duquel le message s'affiche ; en dessous, seuls err et warn vont au journal). Les zones d'état
  // marquées data-status (ex. <p id="status" data-status>) y sont relayées quand elles affichent une erreur
  // (.err, .error) ou un avertissement (.warn) : un message d'échec ne reste plus caché en bas d'un bloc.
  const notifyCss = () => {
    if (document.getElementById("repoNotifyCss")) return;
    const s = document.createElement("style");
    s.id = "repoNotifyCss";
    s.textContent = `.repo-notify{inset:auto;margin:0;border:0;padding:0;background:none;overflow:visible;color:inherit;position:fixed;z-index:3000;left:50%;bottom:72px;transform:translateX(-50%);display:grid;gap:6px;width:min(640px,calc(100vw - 32px));pointer-events:none}
.repo-notify>div{pointer-events:auto;display:flex;gap:10px;align-items:flex-start;padding:9px 12px;border-radius:10px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px #0004;background:#1d2733;color:#f2f5f8;border-left:5px solid #6fa8ff}
.repo-notify>div.ok{border-left-color:#2e9d5b}.repo-notify>div.warn{border-left-color:#e0a400}.repo-notify>div.err{border-left-color:#e5484d;background:#2a1618}
.repo-notify>div>span{flex:1;white-space:pre-line}.repo-notify button{all:unset;cursor:pointer;opacity:.75;font-size:16px;line-height:1;padding:0 2px}.repo-notify button:hover{opacity:1}`;
    document.head.append(s);
  };

  /** Conteneur des notifications : popover (couche supérieure), reposé en dernier à chaque message pour passer
   *  au-dessus d'une fenêtre modale ouverte (dialog.showModal) — sinon il resterait sous son fond flouté. */
  function notifyBox() {
    let box = document.querySelector(".repo-notify");
    if (!box) {
      box = document.createElement("div");
      box.className = "repo-notify";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      box.popover = "manual";
      document.body.append(box);
    }
    try {
      if (box.matches(":popover-open")) box.hidePopover();
      box.showPopover();
    } catch {
      /* navigateur sans popover : position fixe ordinaire */
    }
    return box;
  }
  /** Style des fenêtres modales du socle (.repo-ask : fond d'un bloc du design, encre du design, pied à boutons), posé
   *  une fois ; les pages qui ouvrent leurs propres fenêtres (class repo-ask + la leur) l'appellent avant showModal,
   *  sinon le navigateur pose son fond blanc sous l'encre du design (illisible en Aqua sombre). */
  function dialogCss() {
    if (!document.getElementById("repoAskCss")) document.head.insertAdjacentHTML("beforeend", `<style id="repoAskCss">.repo-ask{max-width:min(520px,92vw);padding:0;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:calc(10px * var(--repo-round, 1));background:var(--repo-card, #fff);color:var(--sk-ink, var(--repo-ink, #1d2633));box-shadow:0 18px 50px rgba(0,0,0,.45)}.repo-ask::backdrop{background:rgba(10,14,20,.5)}.repo-ask p{margin:0;padding:16px 18px 6px;white-space:pre-line;font:14px/1.45 system-ui,sans-serif}.repo-ask footer{display:flex;justify-content:flex-end;gap:8px;padding:10px 14px 14px}</style>`);
  }
  /** Confirmation dans la page (remplace window.confirm, bloquée dans certains navigateurs intégrés et hors du design) :
   *  fenêtre modale au fond d'un bloc du design, message, « Confirmer » / « Annuler » (Échap, clic à côté : annuler).
   *  Promesse : true si confirmé. Options : ok, cancel (libellés), danger (bouton rouge). */
  function ask(message, {
    ok,
    cancel,
    danger = false
  } = {}) {
    const K = window.RepositoryKit,
      tt = row => K?.t ? K.t(row) : row[0];
    dialogCss();
    const d = document.createElement("dialog"),
      p = document.createElement("p"),
      foot = document.createElement("footer"),
      no = document.createElement("button"),
      yes = document.createElement("button");
    d.className = "repo-ask";
    p.textContent = String(message ?? "");
    no.type = yes.type = "button";
    no.className = "ghost";
    yes.className = danger ? "danger" : "primary";
    no.textContent = cancel || tt(["Annuler", "Cancel", "Abbrechen", "Cancelar"]);
    yes.textContent = ok || tt(["Confirmer", "Confirm", "Bestätigen", "Confirmar"]);
    foot.append(no, yes);
    d.append(p, foot);
    document.body.append(d);
    return new Promise(resolve => {
      /** Ferme et retire la fenêtre, puis résout la promesse (true : confirmé). */
      const end = v => {
        d.close();
        d.remove();
        resolve(v);
      };
      yes.onclick = () => end(true);
      no.onclick = () => end(false);
      d.addEventListener("cancel", e => {
        e.preventDefault();
        end(false);
      });
      d.addEventListener("click", e => {
        if (e.target === d) end(false);
      });
      d.showModal();
      yes.focus();
    });
  }

  /** Saisie dans la page (remplace window.prompt) : message, puis un champ — texte (value, placeholder), liste de choix
   *  (options : [[valeur, libellé]…]), zone de plusieurs lignes (multiline) ou texte en lecture seule à copier
   *  (readonly : sélectionné à l'ouverture). Promesse : la valeur saisie ou choisie, null si annulé (Échap, Annuler,
   *  clic à côté). Entrée valide un champ d'une ligne. */
  function askText(message, {
    value = "",
    placeholder = "",
    options = null,
    multiline = false,
    readonly = false,
    ok,
    cancel
  } = {}) {
    const K = window.RepositoryKit,
      tt = row => K?.t ? K.t(row) : row[0];
    dialogCss();
    const d = document.createElement("dialog"),
      p = document.createElement("p"),
      foot = document.createElement("footer"),
      no = document.createElement("button"),
      yes = document.createElement("button");
    let field;
    if (options) {
      field = document.createElement("select");
      for (const [v, label] of options) field.append(new Option(label, v, false, String(v) === String(value)));
    } else {
      field = document.createElement(multiline || readonly ? "textarea" : "input");
      if (field.tagName === "TEXTAREA") {
        field.rows = readonly ? 8 : 4;
        field.dataset.fixedSize = ""; // hauteur fixe (pas d'agrandissement automatique des champs de la suite)
      } else field.type = "text";
      field.value = String(value ?? "");
      field.placeholder = placeholder;
      field.readOnly = !!readonly;
    }
    field.style.cssText = "display:block;box-sizing:border-box;width:calc(100% - 36px);margin:4px 18px 0;font:inherit" + (
      readonly ? ";font:12px/1.4 ui-monospace,Consolas,monospace" : "");
    d.className = "repo-ask";
    p.textContent = String(message ?? "");
    no.type = yes.type = "button";
    no.className = "ghost";
    yes.className = "primary";
    no.textContent = cancel || tt(["Annuler", "Cancel", "Abbrechen", "Cancelar"]);
    yes.textContent = ok || (readonly ? tt(["Fermer", "Close", "Schließen", "Cerrar"]) : tt(["Valider", "OK", "OK", "Aceptar"]));
    foot.append(...(readonly ? [yes] : [no, yes]));
    d.append(p, field, foot);
    document.body.append(d);
    return new Promise(resolve => {
      /** Ferme et retire la fenêtre, puis résout la promesse (valeur, ou null). */
      const end = v => {
        d.close();
        d.remove();
        resolve(v);
      };
      yes.onclick = () => end(field.value);
      no.onclick = () => end(null);
      d.addEventListener("cancel", e => {
        e.preventDefault();
        end(readonly ? field.value : null);
      });
      d.addEventListener("click", e => {
        if (e.target === d) end(readonly ? field.value : null);
      });
      if (field.tagName === "INPUT") field.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          end(field.value);
        }
      });
      d.showModal();
      field.focus();
      if (readonly) field.select();
    });
  }

  /** Textes déjà montrés avec l'option once pendant cette session du navigateur (sessionStorage, 50 au plus) ;
   *  retourne true si `text` l'a déjà été, sinon le note et retourne false. sessionStorage indisponible : false
   *  (le message s'affiche, comme sans l'option). */
  function shownOnce(text) {
    try {
      const key = "repoNotifyOnce:v1",
        list = JSON.parse(sessionStorage.getItem(key) || "[]");
      if (list.includes(text)) return true;
      list.push(text);
      sessionStorage.setItem(key, JSON.stringify(list.slice(-50)));
    } catch {
      /* sessionStorage indisponible : comme sans l'option */
    }
    return false;
  }
  // ---- Clés des services externes : une réponse du lanceur { key: missing | refused } (routes IVAO) devient un message
  // traduit ; toute notification qui le contient reçoit le lien vers Paramètres › Installation › Clés et services externes
  // (une seule place pour les clés de la suite).
  const KEY_TEXT = {
    missing: ['Clé IVAO absente : la saisir dans Paramètres › Installation › Clés et services externes.',
      'IVAO key missing: enter it in Settings › Installation › Keys and external services.',
      'IVAO-Schlüssel fehlt: unter Einstellungen › Installation › Schlüssel und externe Dienste eingeben.',
      'Falta la clave IVAO: introducirla en Ajustes › Instalación › Claves y servicios externos.'
    ],
    refused: ['Clé IVAO refusée par IVAO : la remplacer dans Paramètres › Installation › Clés et services externes.',
      'IVAO key refused by IVAO: replace it in Settings › Installation › Keys and external services.',
      'IVAO-Schlüssel von IVAO abgelehnt: unter Einstellungen › Installation › Schlüssel und externe Dienste ersetzen.',
      'Clave IVAO rechazada por IVAO: sustituirla en Ajustes › Instalación › Claves y servicios externos.'
    ]
  };
  /** Ligne fr / en / de / es dans la langue de la page. */
  const inLang = row => row[['fr', 'en', 'de', 'es'].indexOf(window.RepositoryNav?.getLanguage?.() || 'fr')] || row[0];
  /** { text, href, label } d'une réponse du lanceur qui signale une clé absente ou refusée ({ key }), sinon null. */
  function keyIssue(r) {
    if (!r || !KEY_TEXT[r.key]) return null;
    return {
      text: inLang(KEY_TEXT[r.key]),
      href: window.RepositoryNav?.settingsUrl?.('keys') || '',
      label: inLang(['Ouvrir les clés ↗', 'Open the keys ↗', 'Schlüssel öffnen ↗', 'Abrir las claves ↗'])
    };
  }
  /** Lien vers la carte des clés si le texte contient un message de clé (keyIssue), sinon null. */
  function keyLink(text) {
    const kind = Object.keys(KEY_TEXT).find(k => KEY_TEXT[k].some(s => text.includes(s))),
      k = kind && keyIssue({
        key: kind
      });
    if (!k?.href) return null;
    return Object.assign(document.createElement('a'), {
      href: k.href,
      textContent: k.label,
      className: 'repo-key-link'
    });
  }
  /** Notification flottante (kind : info | ok | warn | err), effacée seule (err 12 s, warn 8 s, autres 5 s ; timeout
   *  pour changer, 0 : reste) ; même texte remplacé, 4 au plus ; err et warn vont au journal. Options : once (le même
   *  texte une seule fois par session du navigateur), minLevel (1 à 4 : sous ce niveau d'utilisation, rien n'est
   *  affiché, err et warn restent portés au journal). Retour : l'élément, ou null (texte vide, once déjà montré,
   *  niveau insuffisant). */
  function notify(message, kind = "info", {
    timeout,
    once = false,
    minLevel
  } = {}) {
    const text = String(message ?? "").trim();
    if (!text) return null;
    // « error », « warning », « success » : synonymes courants des types attendus
    kind = {
      error: "err",
      warning: "warn",
      success: "ok"
    } [kind] || kind;
    if (minLevel && (+document.documentElement.dataset.level || 4) < minLevel) {
      if (kind === "err" || kind === "warn") record(text, kind);
      return null;
    }
    if (once && shownOnce(text)) return null;
    notifyCss();
    const box = notifyBox();
    if (kind === "err" || kind === "warn") record(text, kind);
    const same = [...box.children].find(n => n.dataset.text === text);
    if (same) same.remove();
    const item = document.createElement("div"),
      span = document.createElement("span"),
      close = document.createElement("button");
    item.className = kind;
    item.dataset.text = text;
    span.textContent = text;
    const fix = keyLink(text); // clé absente ou refusée : lien vers sa carte
    if (fix) span.append(' ', fix);
    close.type = "button";
    close.textContent = "×";
    close.title = label("hide");
    close.onclick = () => item.remove();
    item.append(span, close);
    box.append(item);
    // 4 messages au plus (les barres des tâches en cours ne comptent pas et restent)
    for (let old = [...box.children].filter(n => !n.classList.contains("task")); old.length > 4;) old.shift().remove();
    const ms = timeout ?? (kind === "err" ? 12000 : kind === "warn" ? 8000 : 5000);
    if (ms) {
      let left = ms,
        start = Date.now(),
        timer = setTimeout(() => item.remove(), left);
      item.onmouseenter = () => {
        clearTimeout(timer);
        left -= Date.now() - start;
      };
      item.onmouseleave = () => {
        start = Date.now();
        timer = setTimeout(() => item.remove(), Math.max(1500, left));
      };
    }
    return item;
  }
  // ---- Erreurs expliquées : ce qui a échoué et quoi faire, dans la langue de la page, au lieu d'un message technique
  // seul (« Failed to fetch », « 404 », « TypeError… ») ; le détail technique reste entre parenthèses quand il aide.
  //   AppFramework.explain(err, "Lecture du registre")  →  « Lecture du registre : le serveur ne répond pas — … »
  // Une erreur levée par la page avec une phrase déjà claire (Error simple, pas un code) est gardée telle quelle.
  const EX = {
    join: ["{c} : {m}", "{c}: {m}", "{c}: {m}", "{c}: {m}"],
    network: [
      "le serveur ne répond pas — vérifier que la suite est ouverte par le lanceur (lancer.cmd / lancer.sh), le relancer au besoin, puis réessayer",
      "the server does not answer — check that the suite is opened by the launcher (lancer.cmd / lancer.sh), restart it if needed, then try again",
      "der Server antwortet nicht — prüfen, dass die Suite über den Starter geöffnet ist (lancer.cmd / lancer.sh), ihn bei Bedarf neu starten und es erneut versuchen",
      "el servidor no responde — comprobar que la suite se abre con el lanzador (lancer.cmd / lancer.sh), reiniciarlo si hace falta y volver a intentarlo"
    ],
    // service en ligne (SimBrief, réseaux, fonds de carte…) : le lanceur n'y est pour rien
    remote: ["le service en ligne ne répond pas — vérifier la connexion Internet, puis réessayer plus tard",
      "the online service does not answer — check the Internet connection, then try again later",
      "der Online-Dienst antwortet nicht — Internetverbindung prüfen und es später erneut versuchen",
      "el servicio en línea no responde — comprobar la conexión a Internet y volver a intentarlo más tarde"
    ],
    remoteServer: ["le service en ligne a renvoyé une erreur ({d}) — réessayer plus tard",
      "the online service returned an error ({d}) — try again later",
      "der Online-Dienst hat einen Fehler gemeldet ({d}) — später erneut versuchen",
      "el servicio en línea devolvió un error ({d}) — volver a intentarlo más tarde"
    ],
    server: ["le serveur a renvoyé une erreur ({d}) — relancer le lanceur, puis réessayer",
      "the server returned an error ({d}) — restart the launcher, then try again",
      "der Server hat einen Fehler gemeldet ({d}) — den Starter neu starten und es erneut versuchen",
      "el servidor devolvió un error ({d}) — reiniciar el lanzador y volver a intentarlo"
    ],
    missing: ["fichier absent{f} — vérifier qu’il est bien dans le dossier attendu (ou le recréer), puis réessayer",
      "file missing{f} — check that it is in the expected folder (or create it again), then try again",
      "Datei fehlt{f} — prüfen, ob sie im erwarteten Ordner liegt (oder neu erstellen), und es erneut versuchen",
      "archivo ausente{f} — comprobar que está en la carpeta esperada (o volver a crearlo) y volver a intentarlo"
    ],
    quota: ["espace du navigateur saturé — libérer de la place (Paramètres › Maintenance › Espace disque), puis réessayer",
      "browser storage full — free some space (Settings › Maintenance › Disk space), then try again",
      "Browserspeicher voll — Platz schaffen (Einstellungen › Wartung › Speicherplatz) und es erneut versuchen",
      "almacenamiento del navegador lleno — liberar espacio (Ajustes › Mantenimiento › Espacio en disco) y volver a intentarlo"
    ],
    denied: ["accès refusé par le navigateur — autoriser le dossier ou le fichier demandé, puis réessayer",
      "access denied by the browser — allow the requested folder or file, then try again",
      "Zugriff vom Browser verweigert — den angefragten Ordner oder die Datei freigeben und es erneut versuchen",
      "acceso denegado por el navegador — autorizar la carpeta o el archivo solicitado y volver a intentarlo"
    ],
    timeout: ["délai dépassé, le service ne répond pas assez vite — réessayer plus tard",
      "timed out, the service does not answer fast enough — try again later",
      "Zeitüberschreitung, der Dienst antwortet nicht schnell genug — später erneut versuchen",
      "tiempo agotado, el servicio no responde lo bastante rápido — volver a intentarlo más tarde"
    ],
    aborted: ["annulé", "cancelled", "abgebrochen", "cancelado"],
    failed: ["échec ({d})", "failed ({d})", "fehlgeschlagen ({d})", "error ({d})"]
  };
  /** Message lisible pour l'erreur err (Error, DOMException, réponse { status }, texte), précédé du contexte (ce qui a
   *  échoué, déjà traduit par l'appelant) : réseau, serveur, fichier absent, stockage plein, accès refusé, délai,
   *  annulation ; sinon une phrase claire levée par la page est gardée, et un message technique devient « échec (…) ».
   *  remote : la requête visait un service en ligne (pas le lanceur) — réseau et erreurs du serveur le disent. */
  function explain(err, context = "", {
    remote = false
  } = {}) {
    const K = window.RepositoryKit,
      name = err?.name || "",
      status = +err?.status || 0,
      msg = String(err?.message ?? err?.statusText ?? err ?? "").trim(),
      file = /^[\w./-]+\.(?:js|mjs|json|csv|xml|txt|png|svg|zip|ya?ml|md|html|pdf)$/i.test(msg) ? msg : "";
    let kind = "";
    if (name === "AbortError") kind = "aborted";
    else if (name === "TimeoutError" || /\btime ?out\b|timed out/i.test(msg)) kind = "timeout";
    else if (name === "QuotaExceededError" || /quota/i.test(msg)) kind = "quota";
    else if (name === "NotAllowedError" || name === "SecurityError") kind = "denied";
    else if (name === "NotFoundError" || status === 404 || /^(?:HTTP )?404\b/.test(msg) || file) kind = "missing";
    else if (/Failed to fetch|NetworkError|Load failed|ERR_(?:CONNECTION|NAME|INTERNET)|ECONNREFUSED|net::/i.test(msg))
      kind = remote ? "remote" : "network";
    else if (status >= 500 || /^(?:HTTP )?5\d\d\b/.test(msg)) kind = remote ? "remoteServer" : "server";
    // erreur technique du navigateur (TypeError…), code seul ou message vide : « échec (détail) » ; phrase de la page gardée
    else if ((name && name !== "Error") || !msg || /^(?:HTTP )?\d{3}$/.test(msg)) kind = "failed";
    const text = kind ? K.tf(EX[kind], {
      d: msg || status || name || "?",
      f: file ? ` (${file})` : ""
    }) : msg;
    // phrase terminée par un point (sauf si elle a déjà sa ponctuation finale)
    const end = s => /[.!?…]$/.test(s) ? s : `${s}.`;
    if (context) return end(K.tf(EX.join, {
      c: context,
      m: text
    }));
    return end(text.charAt(0).toUpperCase() + text.slice(1));
  }
  // ---- Tâches longues (aperçus, génération, lecture de dossiers, calculs) : barre de progression flottante dans la pile
  // des notifications, et avertissement avant de quitter la page tant qu'une tâche tourne (fermeture, rechargement :
  // fenêtre du navigateur ; lien interne : confirmation qui nomme la tâche). Les erreurs restent signalées par la page
  // (zones data-status → notification) ou par task.fail(erreur).
  //   const job = AppFramework.task("Aperçus des cartes", { total: n });
  //   job.set(fait, total, "carte_1.png");   // total 0 : barre indéterminée
  //   job.end();  ou  job.end("12 cartes générées.", "ok");  ou  job.fail(erreur);
  //   AppFramework.task(titre, { quiet: true }) : sans barre (la page a la sienne), garde de sortie seulement.
  //   AppFramework.task(titre, { cancel: () => ctrl.abort() }) : bouton « Arrêter » dans la barre ; au clic, job.cancelled
  //   passe à true (la boucle de la tâche le teste et sort proprement) puis cancel() est appelée ; job.cancel() fait
  //   de même par code. job.end() sans message d'une tâche arrêtée notifie « Annulé. ».
  const tasks = new Set();
  const TK = {
    leave: ["Tâche en cours : {t}.\nQuitter la page l'interrompra. Quitter quand même ?",
      "Task in progress: {t}.\nLeaving the page will stop it. Leave anyway?",
      "Aufgabe läuft: {t}.\nDas Verlassen der Seite bricht sie ab. Trotzdem verlassen?",
      "Tarea en curso: {t}.\nSalir de la página la interrumpirá. ¿Salir de todos modos?"
    ],
    cancelled: ["Annulé.", "Cancelled.", "Abgebrochen.", "Cancelado."],
    stop: ["Arrêter", "Stop", "Abbrechen", "Detener"],
    stopping: ["Arrêt…", "Stopping…", "Wird abgebrochen…", "Deteniendo…"]
  };
  /** Libellé TK dans la langue de la page. */
  const tk = k => window.RepositoryKit.t(TK[k]);
  /** Ajoute une fois la feuille de style des barres de tâches (#repoTaskCss). */
  const taskCss = () => {
    if (document.getElementById("repoTaskCss")) return;
    const s = document.createElement("style");
    s.id = "repoTaskCss";
    s.textContent = `.repo-notify>div.task{display:grid;grid-template-columns:1fr auto;gap:4px 10px;border-left-color:#6fa8ff}
.repo-notify>div.task b{font-weight:600}.repo-notify>div.task em{font-style:normal;opacity:.8;font-variant-numeric:tabular-nums}
.repo-notify>div.task progress{grid-column:1/-1;width:100%;height:8px;accent-color:#6fa8ff}
.repo-notify>div.task small{grid-column:1/-1;opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.repo-notify>div.task progress.task-sub{height:5px;opacity:.75}
.repo-notify>div.task button.task-stop{grid-column:1/-1;justify-self:end;font-size:12px;line-height:1.2;padding:2px 10px;border:1px solid #fff5;border-radius:6px;opacity:.85}
.repo-notify>div.task button.task-stop:disabled{cursor:default;opacity:.5}`;
    document.head.append(s);
  };

  /** Tâche longue : barre dans la pile des notifications (sauf quiet) et garde de sortie de page tant qu'elle tourne ;
   *  total : nombre d'étapes (0 : indéterminé) ; cancel : fonction d'arrêt, qui ajoute le bouton « Arrêter ». Retour :
   *  { title, cancelled, cancel, set, sub, end, fail }. */
  function task(title, {
    total = 0,
    quiet = false,
    cancel
  } = {}) {
    notifyCss();
    taskCss();
    const box = notifyBox();
    const item = document.createElement("div"),
      esc = window.RepositoryKit.esc;
    item.className = "task";
    item.innerHTML = `<b>${esc(title)}</b><em></em><progress></progress><progress class="task-sub" hidden></progress><small></small>`;
    if (!quiet) box.append(item); // quiet : la page garde sa propre jauge ; la tâche garde seulement la sortie de page
    const bar = item.querySelector("progress"),
      count = item.querySelector("em"),
      step = item.querySelector("small"),
      sub = item.querySelector("progress.task-sub");
    let stop = null;
    if (typeof cancel === "function") {
      stop = document.createElement("button");
      stop.type = "button";
      stop.className = "task-stop";
      stop.textContent = tk("stop");
      stop.onclick = () => job.cancel();
      item.append(stop);
    }
    const job = {
      title,
      cancelled: false,
      /** Arrêt demandé (bouton « Arrêter » ou code) : marque la tâche annulée, désactive le bouton, puis appelle la
       *  fonction cancel de la page ; sans effet si déjà demandé. */
      cancel() {
        if (job.cancelled) return;
        job.cancelled = true;
        if (stop) {
          stop.disabled = true;
          stop.textContent = tk("stopping");
        }
        try {
          cancel?.();
        } catch {
          /* l'arrêt est demandé : une erreur de la page ne doit pas bloquer la suite */
        }
      },
      /** Avancement : fait / total (total 0 : indéterminé) ; texte de l'étape en cours. */
      set(done = 0, n = total, text) {
        total = n;
        if (n > 0) {
          bar.max = n;
          bar.value = Math.min(done, n);
          count.textContent = `${Math.min(done, n)}/${n}`;
        } else {
          bar.removeAttribute("value");
          count.textContent = "";
        }
        if (text !== undefined) step.textContent = text;
        return job;
      },
      /** Seconde jauge, l'étape en cours d'une tâche en plusieurs étapes (la première : les étapes faites / total) :
       *  fait / total de l'étape (total 0 : indéterminée), texte facultatif ; sub(null) la masque. */
      sub(done = 0, n = 0, text) {
        sub.hidden = done === null;
        if (done === null) return job;
        if (n > 0) {
          sub.max = n;
          sub.value = Math.min(done, n);
        } else sub.removeAttribute("value");
        if (text !== undefined) step.textContent = text;
        return job;
      },
      /** Fin de tâche ; message facultatif (notification, kind ok | info | warn | err) ; sans message, une tâche
       *  arrêtée notifie « Annulé. », sauf end(false) (l'arrêt est dit ailleurs : tâche d'un lot qui fait son bilan). */
      end(message, kind = "ok") {
        if (!tasks.delete(job)) return;
        item.remove();
        if (message) notify(message, kind);
        else if (job.cancelled && message !== false) notify(tk("cancelled"), "info");
      },
      /** Échec : notification d'erreur expliquée (explain : ce qui a échoué et quoi faire ; contexte : le titre de la
       *  tâche, sauf autre contexte donné) ; annulation : simple information. */
      fail(error, context = title) {
        const aborted = error?.name === "AbortError";
        job.end(aborted ? tk("cancelled") : explain(error, context), aborted ? "info" : "err");
      }
    };
    tasks.add(job);
    return job.set(0, total);
  }
  /** Titres des tâches en cours entre « », pour la confirmation de sortie de page. */
  const busy = () => [...tasks].map(j => `« ${j.title} »`).join(", ");
  let leaving = false; // départ confirmé dans la page (lien interne) : pas de seconde question du navigateur
  window.addEventListener("beforeunload", e => {
    if (!tasks.size || leaving) return;
    e.preventDefault();
    e.returnValue = "";
  });
  // liens internes (menu latéral, en-tête…) : confirmation qui nomme la tâche, avant que la page ne soit quittée
  document.addEventListener("click", e => {
    if (!tasks.size || e.defaultPrevented || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search)
      return; // ancre de la page
    // confirmation dans la page (jamais de boîte native) : navigation retenue, reprise si confirmé
    e.preventDefault();
    e.stopImmediatePropagation();
    ask(tk("leave").replace("{t}", busy()), {
      danger: true
    }).then(go => {
      if (!go) return;
      leaving = true;
      location.href = a.href;
    });
  }, true);
  // ---- Journal des alertes de la page : erreurs et avertissements notifiés (effacés au bout de quelques secondes)
  // gardés en mémoire le temps de la page (rien n'est conservé au changement de page) ; témoin « ⚠ n » dans l'en-tête
  // (outils de l'en-tête, sinon coin de l'écran) tant qu'il reste des alertes non acquittées ; clic : liste, ACK.
  const journal = [];
  let journalSeq = 0,
    alertsBtn = null,
    alertsPanel = null;
  const AL = {
    fr: {
      title: "Alertes de la page",
      none: "Aucune alerte.",
      ack: "ACK",
      acked: "acquittée",
      ackAll: "Tout acquitter",
      clear: "Vider",
      tip: "Alertes de la page (effacées de l’écran) : relire et acquitter"
    },
    en: {
      title: "Page alerts",
      none: "No alerts.",
      ack: "ACK",
      acked: "acknowledged",
      ackAll: "Acknowledge all",
      clear: "Clear",
      tip: "Page alerts (cleared from the screen): read again and acknowledge"
    },
    de: {
      title: "Warnungen der Seite",
      none: "Keine Warnungen.",
      ack: "OK",
      acked: "bestätigt",
      ackAll: "Alle bestätigen",
      clear: "Leeren",
      tip: "Warnungen der Seite: erneut lesen und bestätigen"
    },
    es: {
      title: "Alertas de la página",
      none: "Sin alertas.",
      ack: "ACK",
      acked: "confirmada",
      ackAll: "Confirmar todas",
      clear: "Vaciar",
      tip: "Alertas de la página: releer y confirmar"
    }
  };
  /** Libellé du journal des alertes dans la langue de la page (français à défaut). */
  const al = k => (AL[window.RepositoryNav?.getLanguage?.()] || AL.fr)[k];

  /** Ajoute une alerte au journal (même texte non acquitté : compteur et heure mis à jour ; 50 au plus) et repeint
   *  le témoin. */
  function record(text, kind) {
    const old = journal.find(e => e.text === text && !e.ack);
    if (old) {
      old.count++;
      old.t = new Date();
      old.kind = kind === "err" ? "err" : old.kind;
    } else journal.push({
      id: ++journalSeq,
      t: new Date(),
      kind,
      text,
      count: 1,
      ack: false
    });
    while (journal.length > 50) journal.shift(); // rétention faible : 50 dernières alertes
    paintAlerts();
  }

  /** Ajoute une fois la feuille de style du témoin et du panneau des alertes (#repoAlertsCss). */
  function alertsCss() {
    if (document.getElementById("repoAlertsCss")) return;
    const s = document.createElement("style");
    s.id = "repoAlertsCss";
    s.textContent = `.repo-alerts{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;margin-right:6px;border:1px solid color-mix(in srgb,var(--repo-bar-text,#fff) 45%,transparent);border-radius:6px;background:transparent;color:var(--repo-bar-text,#fff);font:600 12px/1.4 system-ui,sans-serif;cursor:pointer}
.repo-alerts.unread{background:#e0a400;border-color:#e0a400;color:#1d1400}.repo-alerts.unread.err{background:#e5484d;border-color:#e5484d;color:#fff}
.repo-alerts.floating{position:fixed;z-index:3001;right:12px;top:12px;background:#1d2733;color:#f2f5f8}
.repo-alerts-panel{position:fixed;z-index:3002;width:min(520px,calc(100vw - 32px));max-height:60vh;overflow:auto;padding:10px 12px;border-radius:10px;background:#1d2733;color:#f2f5f8;box-shadow:0 8px 28px #0006;font:13px/1.4 system-ui,sans-serif}
.repo-alerts-panel h3{margin:0 0 8px;font-size:14px}.repo-alerts-panel ul{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.repo-alerts-panel li{display:flex;gap:8px;align-items:flex-start;padding:6px 8px;border-left:4px solid #e0a400;border-radius:6px;background:#ffffff0f}.repo-alerts-panel li.err{border-left-color:#e5484d}.repo-alerts-panel li.ack{opacity:.55}
.repo-alerts-panel time{opacity:.7;font-variant-numeric:tabular-nums;white-space:nowrap}.repo-alerts-panel li span{flex:1;white-space:pre-line}
.repo-alerts-panel button{all:unset;cursor:pointer;padding:1px 8px;border:1px solid #ffffff55;border-radius:5px;font-size:12px}.repo-alerts-panel button:hover{background:#ffffff22}
.repo-alerts-panel .bar{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}`;
    document.head.append(s);
  }
  /** Témoin de l'en-tête : nombre d'alertes non acquittées (rouge s'il y a une erreur), neutre une fois tout acquitté. */
  function paintAlerts() {
    alertsCss();
    if (!alertsBtn) {
      alertsBtn = document.createElement("button");
      alertsBtn.type = "button";
      alertsBtn.className = "repo-alerts no-print";
      alertsBtn.onclick = e => {
        e.stopPropagation();
        alertsPanel ? closeAlerts() : openAlerts();
      };
    }
    const host = document.querySelector(".repo-header-tools");
    if (host && alertsBtn.parentNode !== host) {
      alertsBtn.classList.remove("floating");
      host.prepend(alertsBtn);
    } else if (!host && !alertsBtn.parentNode) {
      alertsBtn.classList.add("floating");
      document.body.append(alertsBtn);
    }
    const open = journal.filter(e => !e.ack);
    alertsBtn.hidden = !journal.length;
    alertsBtn.textContent = `⚠ ${open.length || journal.length}`;
    alertsBtn.title = al("tip");
    alertsBtn.classList.toggle("unread", open.length > 0);
    alertsBtn.classList.toggle("err", open.some(e => e.kind === "err"));
    if (alertsPanel) fillAlerts();
  }

  /** Remplit le panneau : alertes de la plus récente à la plus ancienne, ACK, « Tout acquitter », « Vider ». */
  function fillAlerts() {
    const hh = d => d.toTimeString().slice(0, 8),
      esc = window.RepositoryKit.esc;
    alertsPanel.innerHTML = `<h3>${al("title")}</h3>${journal.length ? `<ul>${[...journal].reverse().map(e => `<li class="${e.kind}${e.ack ? " ack" : ""}"><time>${hh(e.t)}</time><span>${esc(e.text)}${e.count > 1 ? ` (×${e.count})` : ""}</span>${e.ack ? `<em>${al("acked")}</em>` : `<button type="button" data-ack="${e.id}">${al("ack")}</button>`}</li>`).join("")}</ul><div class="bar"><button type="button" data-ackall>${al("ackAll")}</button><button type="button" data-clear>${al("clear")}</button></div>` : `<p>${al("none")}</p>`}`;
  }

  /** Ouvre le panneau des alertes sous le témoin (ACK, tout acquitter, vider) ; refermé au clic suivant ailleurs. */
  function openAlerts() {
    alertsPanel = document.createElement("div");
    alertsPanel.className = "repo-alerts-panel no-print";
    alertsPanel.setAttribute("role", "dialog");
    fillAlerts();
    document.body.append(alertsPanel);
    const r = alertsBtn.getBoundingClientRect();
    alertsPanel.style.top = `${Math.round(r.bottom + 6)}px`;
    alertsPanel.style.left = `${Math.round(Math.max(16, Math.min(r.right - alertsPanel.offsetWidth, innerWidth - alertsPanel.offsetWidth - 16)))}px`;
    alertsPanel.addEventListener("click", e => {
      e.stopPropagation();
      const id = +e.target.dataset?.ack;
      if (id) {
        const x = journal.find(q => q.id === id);
        if (x) x.ack = true;
      } else if (e.target.hasAttribute?.("data-ackall")) journal.forEach(q => {
        q.ack = true;
      });
      else if (e.target.hasAttribute?.("data-clear")) {
        journal.length = 0;
        closeAlerts();
      }
      paintAlerts();
    });
    setTimeout(() => document.addEventListener("click", closeAlerts, {
      once: true
    }));
  }

  /** Ferme le panneau des alertes. */
  function closeAlerts() {
    alertsPanel?.remove();
    alertsPanel = null;
  }
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeAlerts();
  });
  window.addEventListener("repository-language-change", () => {
    if (journal.length) paintAlerts();
  });

  // Relais des zones d'état data-status : erreur / avertissement affiché → notification (une fois par texte).
  const watched = new WeakSet();

  /** Observe les zones [data-status] de root (une fois chacune) : erreur ou avertissement affiché → notification. */
  function watchStatus(root = document) {
    for (const el of root.querySelectorAll("[data-status]")) {
      if (watched.has(el)) continue;
      watched.add(el);
      let last = "";
      new MutationObserver(() => {
        const bad = el.querySelector(".err,.error,.warn") || (/(^|\s)(err|error|warn)(\s|$)/.test(el.className) ? el : null);
        const text = bad ? bad.textContent.trim() : "";
        // une notification par zone : un nouveau message remplace le précédent (message puis message de secours…)
        if (text && text !== last) {
          el._repoToast?.remove();
          el._repoToast = notify(text, bad.classList.contains("warn") ? "warn" : "err");
        }
        // le message passe en notification : pas de doublon en ligne (sauf s'il porte un bouton ou un lien : « Réessayer »…)
        if (bad && bad !== el && !bad.hidden && !bad.querySelector("button,a,input,select")) bad.hidden = true;
        last = text;
      }).observe(el, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ["class"]
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => watchStatus());
  else watchStatus();
  window.addEventListener("load", () => watchStatus());
  window.AppFramework = {
    servedCommit,
    /** Remonte les blocs (init, root facultatif) et relaie les nouvelles zones d'état. */
    refresh: (...a) => {
      const r = init(...a);
      watchStatus();
      return r;
    },
    notify,
    /** Confirmation dans la page (promesse : true si confirmé) ; remplace window.confirm. */
    ask,
    /** Saisie dans la page (promesse : valeur, ou null) ; remplace window.prompt. */
    askText,
    dialogCss,
    /** Journal des alertes de la page (erreurs, avertissements) : liste, tout acquitter. */
    alerts: {
      /** Copie des alertes du journal. */
      list: () => journal.map(e => ({
        ...e
      })),
      /** Acquitte toutes les alertes. */
      ackAll() {
        journal.forEach(e => {
          e.ack = true;
        });
        if (journal.length) paintAlerts();
      }
    },
    watchStatus,
    reveal,
    getConfig: startupConfig,
    sortableTable,
    guardUnsavedChanges,
    /** Tâche longue : barre de progression flottante et garde de sortie de page (voir task()). */
    task,
    /** Message d'erreur lisible (ce qui a échoué et quoi faire, 4 langues) : explain(erreur, contexte, { remote }) ;
     *  remote : service en ligne plutôt que lanceur. */
    explain,
    /** Clé d'un service absente ou refusée ({ key } d'une réponse du lanceur) : { text, href, label } ou null. */
    keyIssue,
    /** Tâches en cours (titres). */
    busyTasks: () => [...tasks].map(j => j.title)
  };
  window.RepositoryConfig = startupConfig();
  window.addEventListener("repository-language-change", () => document.querySelectorAll(".repo-block").forEach(el => {
    const b = el.querySelector(":scope>.repo-block-heading .repo-toggle"),
      d = el.querySelector(":scope>.repo-block-heading .repo-drag");
    if (b) b.textContent = label(el.classList.contains("repo-block-hidden") ? "show" : "hide");
    if (d) d.title = label("move")
  }));
  // Blocs dès que le DOM est prêt (sans attendre images, polices et cartes : en-têtes et icônes paraissent avec la
  // page), puis de nouveau au chargement complet pour les blocs ajoutés entre-temps (init est ré-exécutable).
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => init());
  else init();
  // Menu ☰ : « Réinitialiser l'ordre des blocs » (ordre d'origine de la page ; blocs masqués gardés), sur les pages qui ont
  // des blocs déplaçables
  let resetAdded = false;
  const addReset = () => {
    if (resetAdded || !window.RepositoryNav?.addAction || !document.querySelector(".repo-block .repo-drag")) return;
    resetAdded = true;
    window.RepositoryNav.addAction(["Réinitialiser l’ordre des blocs", "Reset the block order", "Blockreihenfolge zurücksetzen",
      "Restablecer el orden de los bloques"
    ], () => {
      const st = read();
      delete st.order;
      delete st.layout;
      write(st);
      location.reload();
    });
  };
  window.addEventListener("repository-nav-ready", addReset);
  window.addEventListener("load", () => {
    init();
    footer();
    addReset()
  });
})();
