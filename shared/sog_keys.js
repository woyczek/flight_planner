(() => {
  'use strict';
  // Clés de poste et signatures (docs/technique/COMPTES_SIGNES.md § 3-4, lot L2) : WebCrypto seulement, rien côté Python.
  //   · par poste (navigateur sur un ordinateur), deux paires NON EXPORTABLES gardées dans la base IndexedDB « sogKeys »
  //     (hors sauvegarde locale : browser_store.js ne sauvegarde qu'une liste fermée de bases) : signature ECDSA P-256
  //     (alg « ES256 ») et échange ECDH P-256 (chiffrement par destinataire, étape 2) ;
  //   · empreinte : SHA-256 de la clé publique de signature (SPKI) ; kid = empreinte complète (hex), affichage court
  //     7F3A-91C2-04BE-D85E (64 premiers bits) ;
  //   · JSON canonique (JCS, RFC 8785 : clés triées, sans blancs, nombres et chaînes sérialisés comme JSON.stringify) ;
  //   · enveloppe signée { sog: "signe/1", contenu, signatures: [{ kid, alg, sig, at }] } ; fiche signée
  //     { …fiche, sig: { kid, alg, sig } } (une signature par fiche : la synchronisation fusionne fiche par fiche) ;
  //   · clé de secours : paire exportable une seule fois, clé privée chiffrée (PBKDF2-SHA256 600 000 + AES-GCM) dans un
  //     fichier que l'utilisateur garde hors ligne ; réimportée non exportable, pour une signature.
  // Champ alg partout : « ES256 » pour toute clé créée ; « Ed25519 » accepté en vérification si le navigateur le connaît.
  // Aucun texte affiché ici : les échecs rendent un code (raison) que les pages traduisent.
  // API : window.SogKeys = create({ db: 'sogKeys' }) ; SogKeys.create({ db }) pour une base séparée (banc d'essai).
  if (window.SogKeys) return;

  const ALGS = {
    ES256: {
      gen: {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      imp: {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      sign: {
        name: 'ECDSA',
        hash: 'SHA-256'
      }
    },
    Ed25519: {
      gen: {
        name: 'Ed25519'
      },
      imp: {
        name: 'Ed25519'
      },
      sign: {
        name: 'Ed25519'
      }
    }
  };
  const DEFAULT_ALG = 'ES256',
    ECDH = {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    SECOURS_ITER = 600000, // PBKDF2-SHA256 du fichier de la clé de secours
    enc = new TextEncoder(),
    subtle = () => window.crypto?.subtle;

  // ---- encodages
  /** Octets → base64url sans remplissage. */
  function b64url(bytes) {
    const b = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  /** base64url (ou base64) → octets ; null si le texte n'en est pas. */
  function unb64url(text) {
    try {
      const s = String(text).replace(/-/g, '+').replace(/_/g, '/');
      return Uint8Array.from(atob(s + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
    } catch {
      return null;
    }
  }
  /** Octets → hexadécimal minuscule. */
  const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');

  /** JSON canonique (JCS, RFC 8785) : objets à clés triées (ordre des unités UTF-16), sans blancs ; undefined et
   *  fonctions omis dans les objets comme JSON.stringify ; NaN, Infinity et types non JSON refusés (erreur). */
  function canonical(value) {
    if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw new TypeError('JSON canonique : nombre non fini');
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(v => v === undefined || typeof v === 'function' ? 'null' : canonical(v)).join(',')}]`;
    if (typeof value === 'object') {
      if (typeof value.toJSON === 'function') return canonical(value.toJSON());
      const keys = Object.keys(value).filter(k => value[k] !== undefined && typeof value[k] !== 'function').sort();
      return `{${keys.map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
    }
    throw new TypeError(`JSON canonique : type ${typeof value} refusé`);
  }
  /** SHA-256 (hex) du JSON canonique d'une valeur : empreinte d'un contenu (chaîne « precedente » du registre). */
  async function digest(value) {
    return hex(await subtle().digest('SHA-256', enc.encode(canonical(value))));
  }

  /** Empreinte d'une clé publique SPKI (octets ou base64) : { kid (hex complet), court (7F3A-91C2-04BE-D85E) }. */
  async function fingerprint(spki) {
    const bytes = typeof spki === 'string' ? unb64url(spki) : new Uint8Array(spki);
    const h = hex(await subtle().digest('SHA-256', bytes));
    return {
      kid: h,
      court: shortOf(h)
    };
  }
  /** Affichage court d'un kid : 16 premiers caractères hexadécimaux en majuscules, par groupes de 4. */
  const shortOf = kid => String(kid || '').slice(0, 16).toUpperCase().match(/.{1,4}/g)?.join('-') || '';

  /** Algorithmes pris en charge par ce navigateur : { ES256: bool, Ed25519: bool, contexte: bool } (contexte : page sûre
   *  avec WebCrypto ; http://127.0.0.1 en est une). Résultat gardé. */
  let support = null;
  async function supports() {
    if (support) return support;
    const s = {
      contexte: !!(window.isSecureContext && subtle()),
      ES256: false,
      Ed25519: false
    };
    if (s.contexte) {
      for (const alg of Object.keys(ALGS)) {
        try {
          await subtle().generateKey(ALGS[alg].gen, false, ['sign', 'verify']);
          s[alg] = true;
        } catch {
          s[alg] = false;
        }
      }
    }
    return support = s;
  }

  // ---- clés publiques importées (vérification), gardées par kid et algorithme
  const imported = new Map();
  /** Clé publique de vérification (CryptoKey) depuis sa forme SPKI base64 ; null si illisible ou algorithme inconnu. */
  async function publicKey(pub, alg = DEFAULT_ALG) {
    const a = ALGS[alg];
    if (!a || !pub) return null;
    const k = `${alg}:${pub}`;
    if (!imported.has(k)) {
      const bytes = unb64url(pub);
      imported.set(k, bytes ? subtle().importKey('spki', bytes, a.imp, true, ['verify']).catch(() => null) : Promise.resolve(null));
    }
    return imported.get(k);
  }
  /** Vérifie une signature brute (base64url) d'une valeur (JSON canonique) par une clé publique SPKI base64 ;
   *  { ok, raison } — raisons : alg (algorithme inconnu ou non pris en charge), cle (clé publique illisible),
   *  format (signature illisible ou contenu non canonisable), signature (ne correspond pas). */
  async function verify(value, sig, pub, alg = DEFAULT_ALG) {
    if (!ALGS[alg]) return {
      ok: false,
      raison: 'alg'
    };
    if (!(await supports())[alg]) return {
      ok: false,
      raison: 'alg'
    };
    const key = await publicKey(pub, alg);
    if (!key) return {
      ok: false,
      raison: 'cle'
    };
    const bytes = unb64url(sig);
    let data;
    try {
      data = enc.encode(canonical(value));
    } catch {
      return {
        ok: false,
        raison: 'format'
      };
    }
    if (!bytes) return {
      ok: false,
      raison: 'format'
    };
    const good = await subtle().verify(ALGS[alg].sign, key, bytes, data).catch(() => false);
    return good ? {
      ok: true
    } : {
      ok: false,
      raison: 'signature'
    };
  }

  // ---- clé de secours : création (export unique, chiffrée par mot de passe), réimportation pour une signature
  /** Clé AES-GCM dérivée d'un mot de passe (PBKDF2-SHA256, sel, itérations) : chiffrement du fichier de secours. */
  async function wrapKey(password, salt, iterations) {
    const base = await subtle().importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveKey']);
    return subtle().deriveKey({
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations
    }, base, {
      name: 'AES-GCM',
      length: 256
    }, false, ['encrypt', 'decrypt']);
  }
  /** Crée la clé de secours : paire ES256 exportable cette fois seulement, clé privée (PKCS#8) chiffrée par le mot de
   *  passe donné ; rend { kid, court, alg, pub, fichier } — fichier : objet JSON à télécharger, seule copie de la clé
   *  privée (rien n'est gardé dans le navigateur). */
  async function createRecovery(password) {
    if (String(password || '').length < 8) throw new Error('mot-de-passe-court');
    const pair = await subtle().generateKey(ALGS.ES256.gen, true, ['sign', 'verify']);
    const spki = await subtle().exportKey('spki', pair.publicKey),
      pkcs8 = new Uint8Array(await subtle().exportKey('pkcs8', pair.privateKey));
    const salt = crypto.getRandomValues(new Uint8Array(16)),
      iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await subtle().encrypt({
      name: 'AES-GCM',
      iv
    }, await wrapKey(password, salt, SECOURS_ITER), pkcs8);
    pkcs8.fill(0);
    const fp = await fingerprint(spki),
      pub = b64url(spki);
    return {
      ...fp,
      alg: 'ES256',
      pub,
      fichier: {
        sog: 'cle-secours/1',
        kid: fp.kid,
        alg: 'ES256',
        pub,
        chiffrement: {
          kdf: 'PBKDF2-SHA256',
          iterations: SECOURS_ITER,
          sel: b64url(salt),
          algo: 'AES-GCM',
          iv: b64url(iv)
        },
        cle: b64url(data),
        cree: new Date().toISOString()
      }
    };
  }
  /** Réimporte la clé de secours d'un fichier (objet ou texte JSON) avec son mot de passe : { kid, court, alg, pub,
   *  signer(valeur) → { kid, alg, sig } } (clé privée non exportable, en mémoire seulement) ; erreur « fichier »,
   *  « mot-de-passe » (ou fichier altéré) ou « cle » (kid ne correspond pas à la clé publique). */
  async function openRecovery(file, password) {
    let f = file;
    try {
      if (typeof f === 'string') f = JSON.parse(f);
    } catch {
      throw new Error('fichier');
    }
    const c = f?.chiffrement || {},
      salt = unb64url(c.sel),
      iv = unb64url(c.iv),
      data = unb64url(f?.cle);
    if (f?.sog !== 'cle-secours/1' || f.alg !== 'ES256' || !salt || !iv || !data || !(c.iterations >= 100000)) throw new Error(
      'fichier');
    let pkcs8;
    try {
      pkcs8 = new Uint8Array(await subtle().decrypt({
        name: 'AES-GCM',
        iv
      }, await wrapKey(password, salt, c.iterations), data));
    } catch {
      throw new Error('mot-de-passe');
    }
    const privateKey = await subtle().importKey('pkcs8', pkcs8, ALGS.ES256.imp, false, ['sign']).catch(() => null);
    pkcs8.fill(0);
    const fp = await fingerprint(f.pub);
    if (!privateKey || fp.kid !== f.kid) throw new Error('cle');
    return {
      ...fp,
      alg: 'ES256',
      pub: f.pub,
      signer: value => signWith(privateKey, fp.kid, 'ES256', value)
    };
  }

  /** Signature d'une valeur (JSON canonique) par une clé privée : { kid, alg, sig }. */
  async function signWith(privateKey, kid, alg, value) {
    const sig = await subtle().sign(ALGS[alg].sign, privateKey, enc.encode(canonical(value)));
    return {
      kid,
      alg,
      sig: b64url(sig)
    };
  }

  /** Jeu de fonctions sur une base de clés de poste (db) ; window.SogKeys est celui de la base « sogKeys ». */
  function create({
    db = 'sogKeys'
  } = {}) {
    /** Base IndexedDB des clés (magasins « cles » : paires du poste ; « registre » : dernière version acceptée, lot L3). */
    const open = () => new Promise((resolve, reject) => {
      const r = indexedDB.open(db, 1);
      r.onupgradeneeded = () => {
        for (const s of ['cles', 'registre'])
          if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s);
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    /** Lecture (get) ou écriture (put / delete) d'une entrée d'un magasin. */
    async function tx(store, mode, fn) {
      const d = await open();
      try {
        return await new Promise((resolve, reject) => {
          const t = d.transaction(store, mode),
            req = fn(t.objectStore(store));
          t.oncomplete = () => resolve(req?.result);
          t.onerror = () => reject(t.error);
          t.onabort = () => reject(t.error);
        });
      } finally {
        d.close();
      }
    }
    const get = (store, key) => tx(store, 'readonly', s => s.get(key)),
      put = (store, key, value) => tx(store, 'readwrite', s => s.put(value, key)),
      del = (store, key) => tx(store, 'readwrite', s => s.delete(key));

    let poste = null; // paires du poste lues une fois (promesse)
    /** Paires du poste { alg, kid, court, pub, ecdh, cree, sign: CryptoKeyPair, echange: CryptoKeyPair } ; créées au
     *  premier appel si create (sinon null). Clés privées non exportables ; publiques exportées en SPKI base64. */
    function posteKeys({
      create: make = true
    } = {}) {
      if (poste) return poste;
      // un seul onglet crée les paires (Web Locks, par base) : deux onglets ouverts au premier usage auraient sinon
      // chacun la leur, la dernière écrite gagnant
      const locked = fn => navigator.locks?.request ? navigator.locks.request(`${db}:poste`, fn) : fn();
      const p = locked(async () => {
        const saved = await get('cles', 'poste');
        if (saved?.sign?.privateKey && saved?.echange?.privateKey) return saved;
        if (!make) return null;
        const sign = await subtle().generateKey(ALGS[DEFAULT_ALG].gen, false, ['sign', 'verify']),
          echange = await subtle().generateKey(ECDH, false, ['deriveKey', 'deriveBits']);
        const spki = await subtle().exportKey('spki', sign.publicKey),
          ecdh = await subtle().exportKey('spki', echange.publicKey);
        const entry = {
          ...(await fingerprint(spki)),
          alg: DEFAULT_ALG,
          pub: b64url(spki),
          ecdh: b64url(ecdh),
          cree: new Date().toISOString(),
          sign,
          echange
        };
        await put('cles', 'poste', entry);
        return entry;
      });
      poste = p.then(v => v || (poste = null, null), e => {
        poste = null;
        throw e;
      });
      return poste;
    }
    /** Identité publique du poste (sans les clés privées) : { kid, court, alg, pub, ecdh, cree } ; null sans clés et
     *  sans création. */
    async function identity({
      create: make = true
    } = {}) {
      const k = await posteKeys({
        create: make
      });
      return k && {
        kid: k.kid,
        court: k.court,
        alg: k.alg,
        pub: k.pub,
        ecdh: k.ecdh,
        cree: k.cree
      };
    }
    /** Signe une valeur avec la clé du poste : { kid, alg, sig } (JSON canonique de la valeur). */
    async function sign(value) {
      const k = await posteKeys();
      return signWith(k.sign.privateKey, k.kid, k.alg, value);
    }
    /** Efface les clés du poste (réenrôlement nécessaire ensuite). */
    async function reset() {
      poste = null;
      await del('cles', 'poste');
    }
    return {
      db,
      posteKeys,
      identity,
      sign,
      reset,
      get,
      put,
      del
    };
  }

  // ---- enveloppes et fiches signées
  /** Enveloppe signée d'un contenu : { sog: 'signe/1', contenu, signatures: [] } (signatures ajoutées par addSignature). */
  const envelope = contenu => ({
    sog: 'signe/1',
    contenu,
    signatures: []
  });
  /** Ajoute la signature d'un signataire (signer : SogKeys.sign, ou signer d'une clé de secours) à une enveloppe ;
   *  la remplace si ce kid avait déjà signé. Rend l'enveloppe. */
  async function addSignature(env, signer = window.SogKeys.sign) {
    const s = {
      ...(await signer(env.contenu)),
      at: new Date().toISOString()
    };
    env.signatures = [...(env.signatures || []).filter(x => x.kid !== s.kid), s];
    return env;
  }
  /** Vérifie les signatures d'une enveloppe. resolve(kid) → { pub, alg } | null (clé connue, et autorisée pour ce
   *  contenu : c'est à l'appelant d'en juger). Rend { ok (au moins une signature valide), valides: [kid],
   *  erreurs: [{ kid, raison }] } ; raisons : format (pas une enveloppe), inconnue (kid non résolu), et celles de
   *  verify. */
  async function verifyEnvelope(env, resolve) {
    if (env?.sog !== 'signe/1' || !env.contenu || !Array.isArray(env.signatures)) return {
      ok: false,
      valides: [],
      erreurs: [{
        kid: '',
        raison: 'format'
      }]
    };
    const valides = [],
      erreurs = [];
    for (const s of env.signatures) {
      const k = await resolve(s?.kid);
      if (!k) {
        erreurs.push({
          kid: s?.kid || '',
          raison: 'inconnue'
        });
        continue;
      }
      if (k.alg && s.alg !== k.alg) {
        erreurs.push({
          kid: s.kid,
          raison: 'alg'
        });
        continue;
      }
      const r = await verify(env.contenu, s.sig, k.pub, s.alg);
      if (r.ok) valides.push(s.kid);
      else erreurs.push({
        kid: s.kid,
        raison: r.raison
      });
    }
    return {
      ok: valides.length > 0,
      valides,
      erreurs
    };
  }
  /** Fiche signée : { …fiche, sig: { kid, alg, sig } }, signature portée sur la fiche canonisée sans « sig ». */
  async function signRecord(record, signer = window.SogKeys.sign) {
    const {
      sig: _old,
      ...rest
    } = record || {};
    return {
      ...rest,
      sig: await signer(rest)
    };
  }
  /** Vérifie une fiche signée ; resolve(kid) → { pub, alg } | null. Rend { ok, kid, raison } (raisons : absente,
   *  inconnue, et celles de verify). */
  async function verifyRecord(record, resolve) {
    const {
      sig,
      ...rest
    } = record || {};
    if (!sig?.kid || !sig.sig) return {
      ok: false,
      kid: '',
      raison: 'absente'
    };
    const k = await resolve(sig.kid);
    if (!k) return {
      ok: false,
      kid: sig.kid,
      raison: 'inconnue'
    };
    if (k.alg && sig.alg !== k.alg) return {
      ok: false,
      kid: sig.kid,
      raison: 'alg'
    };
    const r = await verify(rest, sig.sig, k.pub, sig.alg);
    return {
      ...r,
      kid: sig.kid
    };
  }

  window.SogKeys = {
    ...create(),
    create,
    ALGS: Object.keys(ALGS),
    DEFAULT_ALG,
    supports,
    canonical,
    digest,
    fingerprint,
    shortOf,
    b64url,
    unb64url,
    verify,
    envelope,
    addSignature,
    verifyEnvelope,
    signRecord,
    verifyRecord,
    createRecovery,
    openRecovery
  };
})();
