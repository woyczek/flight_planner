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
    write = x => localStorage.setItem(key(), JSON.stringify(x));

  /** Transforme les sections de la page en blocs : en-tête avec poignée de déplacement ↕ et bouton Masquer / Afficher, glisser-déposer entre blocs frères, disposition mémorisée par page et réappliquée ; data-default-hidden="1" : bloc masqué tant que l'utilisateur ne l'a pas affiché. */
  /** Blocs du framework dans root (par défaut le contenu principal de la page : main, .wrap) ; root permet d'en
   *  monter ailleurs (fenêtre modale Apparence…). */
  function init(root) {
    const main = root instanceof Element ? root : document.querySelector("main,.wrap");
    if (!main) return;
    const state = read();
    state.hidden ??= {};
    state.order ??= {};
    const blocks = [...main.querySelectorAll("section,.panel,.format-note,.analysis-dock,.trend-card")].filter(el => !el.closest("section") || el.matches("section,.panel"));
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
      el.ondragstart = e => {
        el.classList.add("repo-block-dragging");
        e.dataTransfer.effectAllowed = "move"
      };
      el.ondragend = () => {
        el.draggable = false;
        el.classList.remove("repo-block-dragging");
        document.querySelectorAll(".repo-block-drop-before").forEach(x => x.classList.remove("repo-block-drop-before"));
        for (const p of parents.keys()) state.order[parentKey(p)] = blockChildren(p).map(x => x.dataset.blockId);
        write(state)
      };
      el.ondragover = e => {
        e.preventDefault();
        el.classList.add("repo-block-drop-before")
      };
      el.ondragleave = () => el.classList.remove("repo-block-drop-before");
      el.ondrop = e => {
        e.preventDefault();
        const moving = el.parentElement.querySelector(".repo-block-dragging");
        if (moving && moving !== el) el.parentElement.insertBefore(moving, el);
        el.classList.remove("repo-block-drop-before")
      };
    });
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

  /** Identifiant stable d'un conteneur de blocs (balise et rang), pour mémoriser l'ordre de ses blocs. */
  function parentKey(p) {
    return `${p.tagName}:${[...p.parentElement?.children||[]].indexOf(p)}`
  }

  /** Pied de page commun : version et date de publication (repository_tree.release), liens du dépôt. */
  function footer() {
    const r = window.REPOSITORY_TREE?.release || {},
      f = document.querySelector("footer") || document.createElement("footer");
    f.className = "repo-footer no-print";
    f.innerHTML = `CC RBR - DEFA Virtual - ${r.date||"2026-09-21"} - <a href="${r.changelog||"https://framagit.org/asr/flight_planner/-/blob/master/docs/CHANGELOG.md"}" target="_blank" rel="noopener" title="Changelog / notes de version">v${r.version||"2026.09"}</a> - <a href="https://framagit.org/asr/flight_planner">framagit.org/asr/flight_planner</a>`;
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
  /** { sha, short, branch } si le commit courant n'est pas celui de la version publiée ; null sinon (ou sans .git). */
  async function buildOf(r) {
    if (!r.version) return null;
    if (!/^https?:$/.test(location.protocol)) { // file:// : commit écrit par les crochets git
      const b = await buildFile();
      return b?.sha && b.tag !== `v${r.version}` ? { sha: b.sha, short: b.sha.slice(0, 7), branch: b.branch || "" } : null;
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
    window.addEventListener("beforeunload", e => {
      if (isDirty()) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
    if (options.linkSelector) {
      document.querySelectorAll(options.linkSelector).forEach(link => {
        link.addEventListener("click", e => {
          if (!isDirty()) return;
          const message = options.message || "Des données saisies n'ont pas été enregistrées. Quitter quand même ?";
          if (!window.confirm(message)) e.preventDefault();
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
  if (!document.getElementById("repoRevealStyle")) document.head.insertAdjacentHTML("beforeend", '<style id="repoRevealStyle">.repo-block-flash{outline:3px solid #f59e0b;outline-offset:3px;transition:outline-color 1.2s}</style>');
  // Ancre « #id-du-bloc » : à l'ouverture de la page (une fois les blocs montés) et à chaque changement d'ancre.
  const revealHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) reveal(id);
  };
  window.addEventListener("hashchange", revealHash);
  window.addEventListener("load", () => setTimeout(revealHash, 50));
  // Notifications communes : pile en bas de page, au-dessus des barres fixées. kind : info | ok | warn | err ; toutes
  // s'effacent seules (erreur 12 s, avertissement 8 s, autres 5 s ; en pause tant que la souris est dessus). Les zones d'état
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
      /* navigateur sans popover : position fixe ordinaire */ }
    return box;
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
    if (!document.getElementById("repoAskCss")) document.head.insertAdjacentHTML("beforeend", `<style id="repoAskCss">.repo-ask{max-width:min(520px,92vw);padding:0;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:calc(10px * var(--repo-round, 1));background:var(--repo-card, #fff);color:var(--sk-ink, var(--repo-ink, #1d2633));box-shadow:0 18px 50px rgba(0,0,0,.45)}.repo-ask::backdrop{background:rgba(10,14,20,.5)}.repo-ask p{margin:0;padding:16px 18px 6px;white-space:pre-line;font:14px/1.45 system-ui,sans-serif}.repo-ask footer{display:flex;justify-content:flex-end;gap:8px;padding:10px 14px 14px}</style>`);
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
  function notify(message, kind = "info", {
    timeout
  } = {}) {
    const text = String(message ?? "").trim();
    if (!text) return null;
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
  // ---- Tâches longues (aperçus, génération, lecture de dossiers, calculs) : barre de progression flottante dans la pile
  // des notifications, et avertissement avant de quitter la page tant qu'une tâche tourne (fermeture, rechargement :
  // fenêtre du navigateur ; lien interne : confirmation qui nomme la tâche). Les erreurs restent signalées par la page
  // (zones data-status → notification) ou par task.fail(erreur).
  //   const job = AppFramework.task("Aperçus des cartes", { total: n });
  //   job.set(fait, total, "carte_1.png");   // total 0 : barre indéterminée
  //   job.end();  ou  job.end("12 cartes générées.", "ok");  ou  job.fail(erreur);
  //   AppFramework.task(titre, { quiet: true }) : sans barre (la page a la sienne), garde de sortie seulement.
  const tasks = new Set();
  const TK = {
    leave: ["Tâche en cours : {t}.\nQuitter la page l'interrompra. Quitter quand même ?", "Task in progress: {t}.\nLeaving the page will stop it. Leave anyway?",
      "Aufgabe läuft: {t}.\nDas Verlassen der Seite bricht sie ab. Trotzdem verlassen?", "Tarea en curso: {t}.\nSalir de la página la interrumpirá. ¿Salir de todos modos?"
    ],
    cancelled: ["Annulé.", "Cancelled.", "Abgebrochen.", "Cancelado."]
  };
  const tk = k => window.RepositoryKit.t(TK[k]);
  const taskCss = () => {
    if (document.getElementById("repoTaskCss")) return;
    const s = document.createElement("style");
    s.id = "repoTaskCss";
    s.textContent = `.repo-notify>div.task{display:grid;grid-template-columns:1fr auto;gap:4px 10px;border-left-color:#6fa8ff}
.repo-notify>div.task b{font-weight:600}.repo-notify>div.task em{font-style:normal;opacity:.8;font-variant-numeric:tabular-nums}
.repo-notify>div.task progress{grid-column:1/-1;width:100%;height:8px;accent-color:#6fa8ff}
.repo-notify>div.task small{grid-column:1/-1;opacity:.75;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`;
    document.head.append(s);
  };

  function task(title, {
    total = 0,
    quiet = false
  } = {}) {
    notifyCss();
    taskCss();
    const box = notifyBox();
    const item = document.createElement("div"),
      esc = window.RepositoryKit.esc;
    item.className = "task";
    item.innerHTML = `<b>${esc(title)}</b><em></em><progress></progress><small></small>`;
    if (!quiet) box.append(item); // quiet : la page garde sa propre jauge ; la tâche garde seulement la sortie de page
    const bar = item.querySelector("progress"),
      count = item.querySelector("em"),
      step = item.querySelector("small");
    const job = {
      title,
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
      /** Fin de tâche ; message facultatif (notification, kind ok | info | warn | err). */
      end(message, kind = "ok") {
        if (!tasks.delete(job)) return;
        item.remove();
        if (message) notify(message, kind);
      },
      /** Échec : notification d'erreur (annulation : simple information). */
      fail(error) {
        const aborted = error?.name === "AbortError";
        job.end(aborted ? tk("cancelled") : error?.message || String(error || ""), aborted ? "info" : "err");
      }
    };
    tasks.add(job);
    return job.set(0, total);
  }
  const busy = () => [...tasks].map(j => `« ${j.title} »`).join(", ");
  window.addEventListener("beforeunload", e => {
    if (!tasks.size) return;
    e.preventDefault();
    e.returnValue = "";
  });
  // liens internes (menu latéral, en-tête…) : confirmation qui nomme la tâche, avant que la page ne soit quittée
  document.addEventListener("click", e => {
    if (!tasks.size || e.defaultPrevented || e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest?.("a[href]");
    if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search) return; // ancre de la page
    if (!window.confirm(tk("leave").replace("{t}", busy()))) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
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
  const al = k => (AL[window.RepositoryNav?.getLanguage?.()] || AL.fr)[k];

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

  function fillAlerts() {
    const hh = d => d.toTimeString().slice(0, 8),
      esc = window.RepositoryKit.esc;
    alertsPanel.innerHTML = `<h3>${al("title")}</h3>${journal.length ? `<ul>${[...journal].reverse().map(e => `<li class="${e.kind}${e.ack ? " ack" : ""}"><time>${hh(e.t)}</time><span>${esc(e.text)}${e.count > 1 ? ` (×${e.count})` : ""}</span>${e.ack ? `<em>${al("acked")}</em>` : `<button type="button" data-ack="${e.id}">${al("ack")}</button>`}</li>`).join("")}</ul><div class="bar"><button type="button" data-ackall>${al("ackAll")}</button><button type="button" data-clear>${al("clear")}</button></div>` : `<p>${al("none")}</p>`}`;
  }

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
    refresh: (...a) => {
      const r = init(...a);
      watchStatus();
      return r;
    },
    notify,
    ask,
    /** Journal des alertes de la page (erreurs, avertissements) : liste, tout acquitter. */
    alerts: {
      list: () => journal.map(e => ({
        ...e
      })),
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
  window.addEventListener("load", () => {
    init();
    footer()
  });
})();
