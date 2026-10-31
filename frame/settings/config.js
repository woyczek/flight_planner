(() => {
  'use strict';
  // V3 — configuration d'un pilote (frame/settings/SPEC.md § 5) : fichier sog-config-<TRI>.json et lien d'import
  // #settings?config=<…>, préparés par l'administrateur sur un poste, appliqués en quelques gestes par le pilote.
  //   · schéma sog-config/1 : airline { name, site, pages }, data { host, repo, branch, provider, ownerType?, api? }, identity { trigram },
  //     usages { devices, users }, howto { token: { fr, en, de, es } } — jamais de jeton ni de secret : l'adresse du dépôt
  //     est relue sans ses identifiants ;
  //   · howto : mode d'emploi du jeton, rempli d'un modèle par hôte (GitHub : dépôt d'un utilisateur → jeton classique
  //     « repo » — un invité ne peut pas viser ce dépôt avec un jeton à grain fin —, dépôt d'une organisation → jeton à grain
  //     fin limité au dépôt ; ownerType relevé à l'export ;
  //     GitLab / framagit : jeton de projet, rôle Developer, write_repository) avec l'adresse exacte du dépôt ;
  //   · lien : « z » + base64url du JSON compressé (deflate-raw), « j » + base64url du JSON sans compression ;
  //   · import : validate() ne garde que les champs connus, chacun vérifié ; autre schéma ou champ invalide : refus.
  // API : window.SogConfig = { SCHEMA, parseRepo, kind, PROVIDER_TABLE, links, repoField, knownProviders, providerOf, webUrl, cloneUrl, howto, build, pack, unpack, read, validate }.
  const SCHEMA = 'sog-config/1';
  const LANGS = ['fr', 'en', 'de', 'es'];
  const MAX = 256 * 1024; // taille d'un fichier ou d'un lien décompressé
  const str = (v, n = 200) => typeof v === 'string' && v.length <= n ? v.trim() : '';

  /** Adresse d'un dépôt git (https, ssh « git@hôte:chemin », avec ou sans .git) → { host, repo } sans identifiants ;
   *  null si elle n'est pas lisible. */
  function parseRepo(url) {
    const u = String(url || '').trim();
    let m = /^[\w.-]+@([\w.-]+):(.+?)(?:\.git)?\/?$/.exec(u); // git@hôte:compte/dépôt.git
    if (!m) m = /^(?:https?|ssh|git):\/\/(?:[^@/]*@)?([\w.-]+(?::\d+)?)\/(.+?)(?:\.git)?\/?$/.exec(u); // userinfo retiré
    if (!m || !/^[\w.-]+(\/[\w.-]+)+$/.test(m[2]) || m[2].split('/').some(x => /^\.+$/.test(x))) return null;
    return {
      host: m[1].toLowerCase(),
      repo: m[2]
    };
  }
  /** Fournisseur du dépôt d'une donnée qui le porte (data.provider d'une configuration validée, provider d'un accès de l'appareil) :
   *  github ou gitlab, JAMAIS déduit de l'hôte. Sans fournisseur (un accès de l'appareil réglé sur GitHub n'en porte pas) : github,
   *  comme le transport (frame/store/transport_github.js `clean()` : github.com est GitHub, tout autre hôte https est une instance
   *  GitLab, et le jeton ne part que vers cet hôte). */
  const kind = d => d?.provider && PROVIDER_TABLE[d.provider]?.id === d.provider ? d.provider : 'github';
  /** Page web du dépôt. */
  const webUrl = d => `${/^(127\.0\.0\.1|localhost)(:|$)/.test(d.host) ? 'http' : 'https'}://${d.host}/${d.repo}`;
  /** Adresse de clonage (https). */
  const cloneUrl = d => `${webUrl(d)}.git`;
  /** Gèle un objet et tout ce qu'il contient (objets et tableaux), pour que la table des fournisseurs reste une référence. */
  const deepFreeze = o => {
    Object.values(o).forEach(v => v && typeof v === 'object' && deepFreeze(v));
    return Object.freeze(o);
  };
  // LA table des fournisseurs, figée : liste fermée (github, gitlab), la seule source de ce que le cadre montre ou envoie à leur
  // sujet ; « other » n'y est pas (aucun transport). Chaque entrée : id, label (nom montré), hosts (hôtes publics connus : seuls
  // ceux-là sont reconnus d'une adresse de dépôt), apiHost (hôte de l'API, null si c'est celui de l'instance) et apiPath
  // (suffixe de l'API de l'instance), token (forme du jeton), capabilities (projectTokens : l'accueil des
  // pilotes par jeton de projet), puis les adresses et valeurs qui en dépendent, calculées du dépôt d : signup (créer un compte),
  // invitations (le pilote accepte l'invitation), invite (l'administrateur invite), tokenNew (créer le jeton), placeholder (champ
  // « dépôt »), repoValue (valeur du champ « dépôt » d'un accès de l'appareil gh). Un fournisseur hors de la liste est refusé à
  // l'entrée (validate, export), les lecteurs ne branchent jamais sur un identifiant qu'ils ne connaissent pas.
  const PROVIDER_TABLE = deepFreeze({
    github: {
      id: 'github',
      label: 'GitHub',
      hosts: ['github.com'],
      apiHost: 'api.github.com',
      apiPath: '',
      token: 'ghp_… (classic, « repo ») ou github_pat_… (fine-grained, « Contents »)',
      capabilities: {
        projectTokens: false
      },
      signup: () => 'https://github.com/signup',
      invitations: d => `https://github.com/${d.repo}/invitations`,
      invite: d => `https://github.com/${d.repo}/settings/access`,
      tokenNew: d => d?.ownerType !== 'Organization' ? 'https://github.com/settings/tokens/new?scopes=repo&description=SOG%20Pilote' :
        'https://github.com/settings/personal-access-tokens/new',
      placeholder: 'compte/flight_planner_data',
      repoValue: gh => gh?.repo
    },
    gitlab: {
      id: 'gitlab',
      label: 'GitLab',
      hosts: ['gitlab.com', 'framagit.org'],
      apiHost: null,
      apiPath: '/api/v4',
      token: 'glpat-… (jeton d\'accès de projet, rôle Developer, write_repository)',
      capabilities: {
        projectTokens: true
      },
      signup: d => `https://${d.host}/users/sign_up`,
      invitations: () => '',
      invite: d => `${webUrl(d)}/-/project_members`,
      tokenNew: d => `https://${d.host}/-/user_settings/personal_access_tokens`,
      placeholder: 'https://gitlab.com/group/project',
      repoValue: gh => `${String(gh.api || '').replace(/\/api\/v4$/, '')}/${gh.repo}`
    }
  });
  /** Entrée de la table pour un dépôt d (jamais indéfinie : kind() rend github ou gitlab). */
  const entryOf = d => PROVIDER_TABLE[kind(d)];
  /** Adresses et libellé d'un dépôt d ({ host, repo, … }) pour les assistants : kind, host (« GitHub » pour github.com, sinon l'hôte),
   *  web, signup (compte), invitations (accepter l'invitation), invite (inviter le pilote), tokenNew (créer le jeton). */
  function links(d) {
    const P = entryOf(d);
    return {
      kind: P.id,
      host: d.host === 'github.com' ? PROVIDER_TABLE.github.label : d.host,
      web: webUrl(d),
      signup: P.signup(d),
      invitations: P.invitations(d),
      invite: P.invite(d),
      tokenNew: P.tokenNew(d)
    };
  }
  /** Valeur du champ « dépôt » d'un accès de l'appareil gh ({ repo, api, provider… }) : le projet GitLab s'écrit avec l'adresse de
   *  l'instance (son API sans le suffixe), le reste est le compte/dépôt. */
  const repoField = gh => entryOf(gh).repoValue(gh);
  /** Fournisseurs connus par la configuration de l'appareil : [{ provider, host }] de la configuration reçue (jd = data) et de
   *  l'accès réglé de l'appareil (gh, un GitLab : l'hôte de son API). Une adresse de dépôt n'a pas de champ « fournisseur » : un
   *  GitLab auto-hébergé n'est reconnu que par là. */
  const knownProviders = (jd, gh) => [
    jd?.provider && jd?.host ? {
      provider: jd.provider,
      host: String(jd.host).toLowerCase()
    } : null,
    gh?.provider === 'gitlab' && /^https:\/\//.test(gh.api || '') ? {
      provider: 'gitlab',
      host: new URL(gh.api).host.toLowerCase()
    } : null
  ].filter(Boolean);
  /** Fournisseur d'une adresse de dépôt (https, ssh « git@hôte:chemin » ou ssh://) → { provider (github ou gitlab, null si
   *  inconnu), web (page web du projet, sans identifiants ni .git), project (groupe/projet) } ; adresse illisible : null, sans
   *  web ni projet. Reconnu : un hôte public de la table (github.com, gitlab.com, framagit.org), ou un hôte que `known`
   *  (knownProviders) donne avec un fournisseur de la table. Le port d'une adresse ssh n'est pas celui du web : il est retiré. */
  function providerOf(url, known = []) {
    const r = parseRepo(url);
    if (!r) return {
      provider: null,
      web: '',
      project: ''
    };
    const u = String(url).trim(),
      d = {
        host: /^(?:ssh|git):\/\//.test(u) ? r.host.replace(/:\d+$/, '') : r.host,
        repo: r.repo
      },
      pub = Object.values(PROVIDER_TABLE).find(P => P.hosts.includes(d.host)),
      own = known.find(k => PROVIDER_TABLE[k?.provider]?.id === k.provider && k.host === d.host);
    return {
      provider: pub ? pub.id : own ? own.provider : null,
      web: webUrl(d),
      project: r.repo
    };
  }

  // modèles du mode d'emploi du jeton, par sorte d'hôte et par langue ; {web} {repo} {owner} {host} remplacés
  const HOWTO = {
    githubUser: [
      `Pas encore de compte GitHub ? Créez-le sur https://github.com/signup (vérifiez l'adresse mail, choisissez un nom d'utilisateur simple), donnez ce nom à l'administrateur, qui vous invite sur {repo}, puis acceptez l'invitation reçue par mail (https://github.com/{repo}/invitations).
1. Connectez-vous à GitHub avec le compte invité sur {repo}, puis ouvrez https://github.com/settings/tokens/new?scopes=repo&description=SOG%20Pilote (un jeton « classique », déjà prérempli).
2. « Note » : SOG Pilote ; « Expiration » : « Custom », dans un an ; « Select scopes » : « repo » seulement (déjà cochée).
3. « Generate token », copiez-le tout de suite (il ne se revoit plus) et collez-le ici dans « Jeton personnel ». Ne l'envoyez jamais dans un message.
{repo} appartient à un utilisateur : GitHub n'y permet pas de jeton à grain fin limité à ce dépôt. Ce jeton classique ouvre tous les dépôts de votre compte : si ce compte en a d'autres, créez plutôt un compte GitHub dédié au vol.`,
      `No GitHub account yet? Create one at https://github.com/signup (verify the email address, choose a simple username), give that name to the administrator, who invites you to {repo}, then accept the invitation received by email (https://github.com/{repo}/invitations).
1. Sign in to GitHub with the account invited to {repo}, then open https://github.com/settings/tokens/new?scopes=repo&description=SOG%20Pilote (a “classic” token, already prefilled).
2. “Note”: SOG Pilot; “Expiration”: “Custom”, in one year; “Select scopes”: “repo” only (already ticked).
3. “Generate token”, copy it at once (it is never shown again) and paste it here in “Personal token”. Never send it in a message.
{repo} belongs to a user: GitHub does not allow a fine-grained token limited to it. This classic token opens all the repositories of your account: if that account has others, create a GitHub account dedicated to flying instead.`,
      `Noch kein GitHub-Konto? Erstellen Sie eines auf https://github.com/signup (E-Mail-Adresse bestätigen, einfachen Benutzernamen wählen), geben Sie diesen Namen dem Administrator, der Sie zu {repo} einlädt, und nehmen Sie dann die per E-Mail erhaltene Einladung an (https://github.com/{repo}/invitations).
1. Melden Sie sich bei GitHub mit dem zu {repo} eingeladenen Konto an und öffnen Sie https://github.com/settings/tokens/new?scopes=repo&description=SOG%20Pilote (ein „klassisches“ Token, bereits vorausgefüllt).
2. „Note“: SOG Pilot; „Expiration“: „Custom“, in einem Jahr; „Select scopes“: nur „repo“ (bereits angekreuzt).
3. „Generate token“, kopieren Sie es sofort (es wird nie wieder angezeigt) und fügen Sie es hier unter „Persönliches Token“ ein. Senden Sie es nie in einer Nachricht.
{repo} gehört einem Benutzer: GitHub erlaubt dafür kein feingranulares, auf dieses Repository beschränktes Token. Dieses klassische Token öffnet alle Repositorys Ihres Kontos: Hat dieses Konto weitere, erstellen Sie besser ein eigenes GitHub-Konto nur für das Fliegen.`,
      `¿Aún sin cuenta de GitHub? Créela en https://github.com/signup (verifique la dirección de correo, elija un nombre de usuario sencillo), dé ese nombre al administrador, que le invita a {repo}, y luego acepte la invitación recibida por correo (https://github.com/{repo}/invitations).
1. Inicie sesión en GitHub con la cuenta invitada a {repo} y abra https://github.com/settings/tokens/new?scopes=repo&description=SOG%20Pilote (un token «clásico», ya rellenado).
2. «Note»: SOG Pilot; «Expiration»: «Custom», dentro de un año; «Select scopes»: solo «repo» (ya marcada).
3. «Generate token», cópielo enseguida (no vuelve a mostrarse) y péguelo aquí en «Token personal». No lo envíe nunca en un mensaje.
{repo} pertenece a un usuario: GitHub no permite un token de grano fino limitado a él. Este token clásico abre todos los repositorios de su cuenta: si esa cuenta tiene otros, cree mejor una cuenta de GitHub dedicada al vuelo.`
    ],
    githubOrg: [
      `Pas encore de compte GitHub ? Créez-le sur https://github.com/signup (vérifiez l'adresse mail, choisissez un nom d'utilisateur simple), donnez ce nom à l'administrateur, qui vous invite sur {repo}, puis acceptez l'invitation reçue par mail (https://github.com/{repo}/invitations).
1. Connectez-vous à GitHub avec le compte qui a accès à {repo}, puis ouvrez https://github.com/settings/personal-access-tokens/new
2. « Token name » : SOG Pilote ; « Expiration » : « Custom », dans un an ; « Resource owner » : {owner} (l'organisation) ; « Repository access » : « Only select repositories », puis {repo}.
3. « Permissions » › « Repository permissions » › « Contents » : « Read and write » (« Metadata » en lecture vient seul).
4. « Generate token », copiez-le et collez-le ici dans « Jeton personnel ». Ne l'envoyez jamais dans un message ; à son expiration, créez-en un autre de la même façon.
L'organisation {owner} doit accepter les jetons à grain fin (réglages de l'organisation › Personal access tokens).`,
      `No GitHub account yet? Create one at https://github.com/signup (verify the email address, choose a simple username), give that name to the administrator, who invites you to {repo}, then accept the invitation received by email (https://github.com/{repo}/invitations).
1. Sign in to GitHub with the account that has access to {repo}, then open https://github.com/settings/personal-access-tokens/new
2. “Token name”: SOG Pilot; “Expiration”: “Custom”, in one year; “Resource owner”: {owner} (the organisation); “Repository access”: “Only select repositories”, then {repo}.
3. “Permissions” › “Repository permissions” › “Contents”: “Read and write” (“Metadata” read-only comes with it).
4. “Generate token”, copy it and paste it here in “Personal token”. Never send it in a message; when it expires, create a new one the same way.
The organisation {owner} must allow fine-grained tokens (organisation settings › Personal access tokens).`,
      `Noch kein GitHub-Konto? Erstellen Sie eines auf https://github.com/signup (E-Mail-Adresse bestätigen, einfachen Benutzernamen wählen), geben Sie diesen Namen dem Administrator, der Sie zu {repo} einlädt, und nehmen Sie dann die per E-Mail erhaltene Einladung an (https://github.com/{repo}/invitations).
1. Melden Sie sich bei GitHub mit dem Konto an, das Zugriff auf {repo} hat, und öffnen Sie https://github.com/settings/personal-access-tokens/new
2. „Token name“: SOG Pilot; „Expiration“: „Custom“, in einem Jahr; „Resource owner“: {owner} (die Organisation); „Repository access“: „Only select repositories“, dann {repo}.
3. „Permissions“ › „Repository permissions“ › „Contents“: „Read and write“ („Metadata“ lesend kommt von selbst).
4. „Generate token“, kopieren Sie es und fügen Sie es hier unter „Persönliches Token“ ein. Senden Sie es nie in einer Nachricht; wenn es abläuft, erstellen Sie auf dieselbe Weise ein neues.
Die Organisation {owner} muss feingranulare Tokens erlauben (Einstellungen der Organisation › Personal access tokens).`,
      `¿Aún sin cuenta de GitHub? Créela en https://github.com/signup (verifique la dirección de correo, elija un nombre de usuario sencillo), dé ese nombre al administrador, que le invita a {repo}, y luego acepte la invitación recibida por correo (https://github.com/{repo}/invitations).
1. Inicie sesión en GitHub con la cuenta que tiene acceso a {repo} y abra https://github.com/settings/personal-access-tokens/new
2. «Token name»: SOG Pilot; «Expiration»: «Custom», dentro de un año; «Resource owner»: {owner} (la organización); «Repository access»: «Only select repositories», luego {repo}.
3. «Permissions» › «Repository permissions» › «Contents»: «Read and write» («Metadata» de lectura viene solo).
4. «Generate token», cópielo y péguelo aquí en «Token personal». No lo envíe nunca en un mensaje; cuando caduque, cree otro de la misma forma.
La organización {owner} debe aceptar los tokens de grano fino (ajustes de la organización › Personal access tokens).`
    ],
    gitlab: [
      `Pas encore de compte sur {host} ? Créez-le sur https://{host}/users/sign_up (vérifiez l'adresse mail, choisissez un nom d'utilisateur simple), puis donnez ce nom à l'administrateur, qui vous ajoute au projet {web}.
1. Connectez-vous à {host}, puis ouvrez {web}/-/settings/access_tokens (jetons du projet : il faut le rôle Maintainer sur le projet). Sans ce rôle : votre avatar › « Edit profile » › « Access tokens », pour un jeton personnel de même portée.
2. « Token name » : SOG Pilote ; « Expiration date » : 90 jours au plus ; « Role » : Developer ; « Scopes » : write_repository.
3. Créez le jeton, copiez-le et collez-le ici dans « Jeton personnel ». Ne l'envoyez jamais dans un message.
Sans lanceur (téléphone), l'appli ne joint un dépôt {host} qu'à travers le lanceur d'un poste : appliquez cette configuration sur un poste.`,
      `No account on {host} yet? Create one at https://{host}/users/sign_up (verify the email address, choose a simple username), then give that name to the administrator, who adds you to the project {web}.
1. Sign in to {host}, then open {web}/-/settings/access_tokens (project tokens: this needs the Maintainer role on the project). Without that role: your avatar › “Edit profile” › “Access tokens”, for a personal token with the same scope.
2. “Token name”: SOG Pilot; “Expiration date”: 90 days at most; “Role”: Developer; “Scopes”: write_repository.
3. Create the token, copy it and paste it here in “Personal token”. Never send it in a message.
Without a launcher (phone), the app reaches a {host} repository only through a workstation's launcher: apply this configuration on a workstation.`,
      `Noch kein Konto auf {host}? Erstellen Sie eines auf https://{host}/users/sign_up (E-Mail-Adresse bestätigen, einfachen Benutzernamen wählen) und geben Sie diesen Namen dem Administrator, der Sie zum Projekt {web} hinzufügt.
1. Melden Sie sich bei {host} an und öffnen Sie {web}/-/settings/access_tokens (Projekt-Tokens: dafür braucht es die Rolle Maintainer im Projekt). Ohne diese Rolle: Ihr Avatar › „Edit profile“ › „Access tokens“, für ein persönliches Token mit demselben Umfang.
2. „Token name“: SOG Pilot; „Expiration date“: höchstens 90 Tage; „Role“: Developer; „Scopes“: write_repository.
3. Erstellen Sie das Token, kopieren Sie es und fügen Sie es hier unter „Persönliches Token“ ein. Senden Sie es nie in einer Nachricht.
Ohne Starter (Telefon) erreicht die App ein Repository auf {host} nur über den Starter eines Rechners: Wenden Sie diese Konfiguration auf einem Rechner an.`,
      `¿Aún sin cuenta en {host}? Créela en https://{host}/users/sign_up (verifique la dirección de correo, elija un nombre de usuario sencillo) y dé ese nombre al administrador, que le añade al proyecto {web}.
1. Inicie sesión en {host} y abra {web}/-/settings/access_tokens (tokens del proyecto: requiere el rol Maintainer en el proyecto). Sin ese rol: su avatar › «Edit profile» › «Access tokens», para un token personal con el mismo alcance.
2. «Token name»: SOG Pilot; «Expiration date»: 90 días como máximo; «Role»: Developer; «Scopes»: write_repository.
3. Cree el token, cópielo y péguelo aquí en «Token personal». No lo envíe nunca en un mensaje.
Sin lanzador (teléfono), la aplicación solo llega a un repositorio de {host} a través del lanzador de un puesto: aplique esta configuración en un puesto.`
    ]
  };
  /** Variante du mode d'emploi : GitHub, dépôt d'une organisation → jeton à grain fin limité au dépôt ; dépôt d'un
   *  utilisateur (ou propriétaire inconnu) → jeton classique, seul possible pour un invité ; GitLab : le sien. */
  const variant = d => kind(d) !== 'github' ? kind(d) : d.ownerType === 'Organization' ? 'githubOrg' : 'githubUser';
  /** Propriétaire d'un dépôt GitHub : 'User' ou 'Organization' (API publique users/<compte>) ; null sans réponse. */
  async function ownerType(d) {
    if (kind(d) !== 'github') return null;
    try {
      const r = await fetch(`${(d.api || 'https://api.github.com').replace(/\/$/, '')}/users/${encodeURIComponent(d.repo.split('/')[0])}`, {
        headers: {
          Accept: 'application/vnd.github+json'
        }
      });
      const tp = r.ok ? (await r.json()).type : null;
      return tp === 'User' || tp === 'Organization' ? tp : null;
    } catch {
      return null;
    }
  }
  /** Mode d'emploi du jeton pour ce dépôt, dans les quatre langues : { fr, en, de, es }. */
  function howto(d) {
    const v = {
      web: webUrl(d),
      repo: d.repo,
      owner: d.repo.split('/')[0],
      host: d.host
    };
    return Object.fromEntries(LANGS.map((l, i) => [l, HOWTO[variant(d)][i].replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m)]));
  }

  /** Configuration d'un pilote : airline (document de la compagnie), data (dépôt sans identifiants, avec son fournisseur github ou
   *  gitlab), trigramme ; usages conseillés : plusieurs appareils. Un fournisseur hors de la liste n'est jamais écrit : erreur
   *  (l'appelant le refuse avant, avec son message). */
  function build({
    airline,
    data,
    trigram,
    by
  }) {
    if (data && (!data.provider || PROVIDER_TABLE[data.provider]?.id !== data.provider)) throw new Error('provider');
    const a = airline && typeof airline === 'object' ? airline : {},
      p = a.pages && typeof a.pages === 'object' ? a.pages : {};
    const d = data ? {
      host: data.host,
      repo: data.repo,
      branch: data.branch || 'main',
      provider: data.provider, // choisi (github ou gitlab) : il voyage avec le dépôt, le côté du pilote s'ouvre dessus
      ...(data.ownerType ? {
        ownerType: data.ownerType
      } : {}),
      ...(data.api ? {
        api: data.api
      } : {})
    } : null;
    return {
      schema: SCHEMA,
      created_at: new Date().toISOString(),
      ...(by ? {
        by
      } : {}),
      airline: {
        name: str(a.name),
        site: str(a.site),
        pages: Object.fromEntries(['recordFlight', 'log', 'fleet', 'aircraft'].filter(k => str(p[k])).map(k => [k, str(p[k])]))
      },
      ...(d ? {
        data: d
      } : {}),
      identity: {
        trigram
      },
      usages: {
        devices: true
      },
      ...(d ? {
        howto: {
          token: howto(d)
        }
      } : {})
    };
  }

  // ---- lien : base64url, compressé si le navigateur le sait
  const b64u = bytes => {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), ch => ch.charCodeAt(0));
  /** Octets d'un flux, au plus MAX (au-delà : refus, contre une bombe de décompression). */
  async function drain(stream) {
    const r = stream.getReader(),
      parts = [];
    let n = 0;
    for (;;) {
      const {
        done,
        value
      } = await r.read();
      if (done) break;
      n += value.length;
      if (n > MAX) {
        r.cancel().catch(() => {});
        throw new Error('too large');
      }
      parts.push(value);
    }
    const out = new Uint8Array(n);
    let o = 0;
    for (const p of parts) out.set(p, o), o += p.length;
    return out;
  }
  /** Configuration → texte du paramètre config= du lien. */
  async function pack(cfg) {
    const json = new TextEncoder().encode(JSON.stringify(cfg));
    if (typeof CompressionStream !== 'function') return `j${b64u(json)}`;
    return `z${b64u(await drain(new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))))}`;
  }
  /** Texte du paramètre config= → objet (non vérifié : passer par validate) ; erreur s'il est illisible. */
  async function unpack(s) {
    const k = String(s || '')[0],
      b = unb64u(String(s).slice(1));
    if (k === 'j') return JSON.parse(new TextDecoder().decode(b));
    if (k !== 'z' || typeof DecompressionStream !== 'function') throw new Error('unreadable');
    return JSON.parse(new TextDecoder().decode(await drain(new Blob([b]).stream().pipeThrough(new DecompressionStream(
      'deflate-raw')))));
  }
  /** Fichier choisi → objet (non vérifié) ; erreur s'il est trop gros ou illisible. */
  async function read(file) {
    if (!file || file.size > MAX) throw new Error('too large');
    return JSON.parse(await file.text());
  }

  /** Vérifie une configuration reçue : { ok: true, cfg } (champs connus seulement, normalisés), ou { ok: false, error,
   *  field?, schema? } — error : schema (autre schéma), field (champ invalide), shape (pas un objet). */
  function validate(x) {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return {
      ok: false,
      error: 'shape'
    };
    if (x.schema !== SCHEMA) return {
      ok: false,
      error: 'schema',
      schema: typeof x.schema === 'string' ? x.schema.slice(0, 40) : '?'
    };
    const bad = field => ({
      ok: false,
      error: 'field',
      field
    });
    const cfg = {
      schema: SCHEMA
    };
    const tri = String(x.identity?.trigram || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{2,5}$/.test(tri)) return bad('identity.trigram');
    cfg.identity = {
      trigram: tri
    };
    if (x.airline != null) {
      const a = x.airline,
        site = str(a?.site);
      if (typeof a !== 'object' || (site && !/^https:\/\/[\w.-]+(:\d+)?(\/[^\s]*)?$/.test(site))) return bad('airline.site');
      const pages = {};
      for (const k of ['recordFlight', 'log', 'fleet', 'aircraft']) {
        const v = str(a.pages?.[k]);
        if (v && !/^\/[^\s]*$/.test(v)) return bad(`airline.pages.${k}`);
        if (v) pages[k] = v;
      }
      cfg.airline = {
        name: str(a.name, 100),
        site,
        pages
      };
    }
    if (x.data != null) {
      const d = x.data,
        host = String(d?.host || '').toLowerCase(),
        repo = String(d?.repo || ''),
        branch = String(d?.branch || 'main');
      if (!/^[a-z0-9.-]+(:\d+)?$/.test(host)) return bad('data.host');
      // fournisseur : le champ, github ou gitlab (un GitLab auto-hébergé est « gitlab » avec son hôte) ; jamais déduit de l'hôte.
      // Hérité des configurations exportées avant 48079d78f, qui n'avaient pas de champ : sans fournisseur et sur github.com, c'est
      // github ; sans fournisseur sur un autre hôte, ou avec une valeur hors de la liste, la configuration est refusée ici
      const prov = d.provider == null || d.provider === '' ? host === 'github.com' ? 'github' : '' : String(d.provider);
      if (PROVIDER_TABLE[prov]?.id !== prov) return {
        ok: false,
        error: 'provider'
      };
      if (!/^[\w.-]+(\/[\w.-]+)+$/.test(repo) || repo.length > 200 || repo.split('/').some(x => /^\.+$/.test(x))) return bad('data.repo');
      if (!/^[\w./-]{1,100}$/.test(branch)) return bad('data.branch');
      const api = d.api == null ? '' : String(d.api);
      if (api && !/^(https:\/\/[\w.-]+(:\d+)?|http:\/\/(127\.0\.0\.1|localhost)(:\d+)?)(\/[\w./-]*)?$/.test(api)) return bad('data.api');
      cfg.data = {
        host,
        repo,
        branch,
        provider: prov,
        ...(d.ownerType === 'User' || d.ownerType === 'Organization' ? {
          ownerType: d.ownerType
        } : {}),
        ...(api ? {
          api
        } : {})
      };
      // mode d'emploi : textes reçus (affichés en texte seul) ; absent : refait du modèle
      const h = x.howto?.token,
        got = h && typeof h === 'object' ? Object.fromEntries(LANGS.filter(l => typeof h[l] === 'string' && h[l].length <= 4000).map(
          l => [l, h[l]])) : {};
      cfg.howto = {
        token: Object.keys(got).length ? got : howto(cfg.data)
      };
    }
    const u = x.usages;
    if (u != null) {
      if (typeof u !== 'object') return bad('usages');
      cfg.usages = {
        devices: u.devices === true,
        users: u.users === true
      };
    }
    return {
      ok: true,
      cfg
    };
  }

  window.SogConfig = {
    SCHEMA,
    parseRepo,
    kind,
    PROVIDER_TABLE,
    links,
    repoField,
    knownProviders,
    providerOf,
    webUrl,
    cloneUrl,
    howto,
    variant,
    ownerType,
    build,
    pack,
    unpack,
    read,
    validate
  };
})();
