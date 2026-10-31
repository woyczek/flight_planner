"""Assemble le manuel de chaque application (frame/help/SPEC.md § 2) : frame/help/<app>.<langue>.md, pour fr, en, de, es
(pilot, maintenance : l'aide ouverte est celle de l'application affichée, Simplification 31 oct. 2026).

Sources, pour chaque application de APPS (frame/app.js) :
  · son introduction : frame/help/intro.<langue>.md pour Pilote, frame/help/intro-<app>.<langue>.md pour les autres ;
  · modules/<id>/help/<langue>.md : le chapitre de chacun de ses modules, dans l'ordre de son menu (APPS.<app>.modules) ;
  · puis les chapitres des écrans du cadre (FRAME_CHAPTERS : frame/settings/help/<langue>.md, Réglages).
Règles :
  · un module qui a un dossier help/ doit avoir ses quatre langues, un titre « # … » en tête et au moins une section
    « ## … » (la première est l'aide en page) : sinon refus, rien n'est écrit ;
  · un module sans dossier help/ est signalé (« sans chapitre ») et laissé de côté ;
  · une traduction porte <!-- fr: <empreinte> --> (12 premiers caractères du SHA-1 de fr.md) : une empreinte absente ou
    différente est signalée « à retraduire », sans refus ;
  · les ancres (<a id="x"></a> d'un paragraphe ou d'un titre) : les mêmes dans les quatre langues, préfixées par l'id du
    chapitre, uniques dans le manuel ; celles qu'un module cite dans ctx.helpAnchor(...) existent (le « ? » du téléphone
    y mène : #help?m=<id>&a=<ancre>) ;
  · la feuille de route (frame/help/roadmap.json) : chaque texte en quatre langues et des états connus, sinon refus ;
  · les tutoriels (liste TUTORIALS de help.js) : frame/help/tutorial/<id>.<langue>.md, écrits en anglais ; anglais et
    français obligatoires, un seul titre « # » en tête, chaque image citée présente dans tutorial/img/, sinon refus ;
    une traduction porte <!-- en: <empreinte> --> de l'anglais (« à retraduire » sinon) ; allemand ou espagnol absent :
    signalé (l'anglais est affiché) ;
  · --check : vérifie et dit ce qui changerait, sans écrire.
Usage : python frame/help/build_help.py [--check]
"""
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LANGS = ('fr', 'en', 'de', 'es')
# chapitres des écrans du cadre, après les modules : (id, dossier)
FRAME_CHAPTERS = [('settings', os.path.join(ROOT, 'frame', 'settings', 'help'))]
GENERATED = '<!-- Fichier produit par frame/help/build_help.py : ne pas le modifier, modifier les sources (modules/<id>/help/). -->'


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read().replace('\r\n', '\n')


def rel(path):
    return os.path.relpath(path, ROOT).replace(os.sep, '/')


def app_modules():
    """{ application: [modules dans l'ordre de son menu] } d'après les blocs APPS.<app> = { … modules: [ … ] } de frame/app.js,
    dans l'ordre du fichier (Pilote d'abord)."""
    app = read(os.path.join(ROOT, 'frame', 'app.js'))
    out = {}
    for m in re.finditer(r'\bAPPS\.(\w+) = \{(.*?)\n  \};', app, re.S):
        b = re.search(r'\bmodules:\s*\[\s*\{(.*?)\n\s*\}\]', m.group(2), re.S)
        if b:
            out[m.group(1)] = re.findall(r"\bid:\s*'([\w-]+)'", b.group(1))
    if 'pilot' not in out:
        sys.exit('frame/app.js : APPS.pilot.modules introuvable')
    return out


def intro_path(app, lang):
    """Introduction du manuel d'une application."""
    return os.path.join(HERE, f'intro.{lang}.md' if app == 'pilot' else f'intro-{app}.{lang}.md')


def fingerprint(text):
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:12]


def roadmap_errors():
    """Feuille de route (frame/help/roadmap.json, sog-roadmap/1) : chaque texte en quatre langues, états connus."""
    p = os.path.join(HERE, 'roadmap.json')
    if not os.path.isfile(p):
        return []
    try:
        d = json.loads(read(p))
    except ValueError as e:
        return [f'frame/help/roadmap.json : JSON illisible ({e})']
    out = []
    if d.get('schema') != 'sog-roadmap/1':
        out.append('frame/help/roadmap.json : schéma attendu sog-roadmap/1')
    states = d.get('states') or {}

    def texts(o, where):
        for lang in LANGS:
            if not str((o or {}).get(lang) or '').strip():
                out.append(f'frame/help/roadmap.json : {where} sans texte « {lang} »')

    texts(d.get('note'), 'note')
    for k, v in states.items():
        texts(v, f'état {k}')
    for a in d.get('apps') or []:
        texts(a.get('label'), f"application {a.get('id')}")
        if a.get('state') not in states:
            out.append(f"frame/help/roadmap.json : application {a.get('id')} à l'état inconnu « {a.get('state')} »")
    for lane in d.get('lanes') or []:
        lid = lane.get('id')
        texts(lane.get('label'), f'voie {lid}')
        for i, it in enumerate(lane.get('items') or []):
            texts(it, f'voie {lid}, élément {i + 1}')
            if it.get('state') not in states:
                out.append(f"frame/help/roadmap.json : voie {lid}, élément {i + 1} à l'état inconnu « {it.get('state')} »")
    return out


ANCHOR = re.compile(r'<a id="([\w-]+)"></a>')


def anchor_errors(mid, texts):
    """Ancres d'un chapitre : les mêmes dans les quatre langues, préfixées par « <id>- » ; et, pour un module, celles que
    son module.js cite dans ctx.helpAnchor(...) (un gabarit `fuel-step-${n}` : au moins une ancre de ce préfixe)."""
    out = []
    sets = {lang: ANCHOR.findall(t) for lang, t in texts.items()}
    ref = sets.get('fr', [])
    for lang, found in sets.items():
        if found != ref:
            out.append(f'modules/{mid}/help/{lang}.md : ancres {found} ≠ celles du français {ref}')
    for a in ref:
        if not a.startswith(mid + '-'):
            out.append(f'chapitre {mid} : l\'ancre « {a} » doit commencer par « {mid}- »')
    module_js = os.path.join(ROOT, 'modules', mid, 'module.js')
    if os.path.isfile(module_js):
        for call in re.findall(r'helpAnchor\??\.?\((.*?)\);', read(module_js), re.S):
            for lit, tmpl in re.findall(r'[\'"`]([\w-]+)(\$\{)?', call):
                if not lit.startswith(mid + '-'):
                    continue
                if not any((a.startswith(lit) if tmpl else a == lit) for a in ref):
                    out.append(f'modules/{mid}/module.js : ctx.helpAnchor cite « {lit}{"…" if tmpl else ""} », absent du chapitre')
    return out


def tutorial_check():
    """Tutoriels (TUTORIALS de help.js) : (erreurs, notes) — anglais et français présents, titre, images, empreintes."""
    errors, notes = [], []
    m = re.search(r'const TUTORIALS = \[(.*?)\];', read(os.path.join(HERE, 'help.js')), re.S)
    ids = re.findall(r"\bid:\s*'([\w-]+)'", m.group(1)) if m else []
    if not ids:
        return ['frame/help/help.js : liste TUTORIALS introuvable'], notes
    d = os.path.join(HERE, 'tutorial')
    for tid in ids:
        en = os.path.join(d, f'{tid}.en.md')
        fp = fingerprint(read(en).strip()) if os.path.isfile(en) else None
        for lang in ('en', 'fr', 'de', 'es'):
            p = os.path.join(d, f'{tid}.{lang}.md')
            if not os.path.isfile(p):
                if lang in ('en', 'fr'):
                    errors.append(f'{rel(p)} manquant')
                else:
                    notes.append(f'{rel(p)} : à traduire (l\'anglais est affiché)')
                continue
            t = read(p).strip()
            if not t.startswith('# ') or len(re.findall(r'^# ', t, re.M)) != 1:
                errors.append(f'{rel(p)} : un seul titre « # … », en tête')
            for src in re.findall(r'!\[[^\]]*\]\(([^)\s]+)', t):
                if not re.match(r'^[a-z]+:', src) and not os.path.isfile(os.path.join(d, *src.split('/'))):
                    errors.append(f'{rel(p)} : image absente {src}')
            got = re.search(r'<!-- en: ([0-9a-f]{12}) -->', t)
            if lang != 'en' and fp and (not got or got.group(1) != fp):
                notes.append(f'{rel(p)} : à retraduire (en: {fp})')
    return errors, notes


def main(args):
    check = '--check' in args
    errors, notes = [], []
    apps = app_modules()
    intro = {}  # (app, langue) → texte
    for a in apps:
        for lang in LANGS:
            p = intro_path(a, lang)
            if not os.path.isfile(p):
                errors.append(f'{rel(p)} manquant')
            else:
                intro[(a, lang)] = read(p).strip()
    chapter = {}  # id → { langue: bloc du manuel }
    seen_anchors = {}
    # chapitres des modules (chacun une fois, dans l'ordre des menus), puis ceux des écrans du cadre (Réglages)
    order = list(dict.fromkeys(m for ms in apps.values() for m in ms))
    for mid, d in [(m, os.path.join(ROOT, 'modules', m, 'help')) for m in order] + FRAME_CHAPTERS:
        if not os.path.isdir(d):
            notes.append(f'{mid} : sans chapitre')
            continue
        texts = {}
        for lang in LANGS:
            p = os.path.join(d, f'{lang}.md')
            if not os.path.isfile(p):
                errors.append(f'{rel(d)}/{lang}.md manquant')
                continue
            t = read(p).strip()
            if not t.startswith('# '):
                errors.append(f'{rel(d)}/{lang}.md : doit commencer par un titre « # … »')
            if len(re.findall(r'^# ', t, re.M)) != 1:
                errors.append(f'{rel(d)}/{lang}.md : un seul titre « # … » par chapitre')
            if not re.search(r'^## ', t, re.M):
                errors.append(f'{rel(d)}/{lang}.md : aucune section « ## … » (aide en page)')
            texts[lang] = t
        if 'fr' in texts:
            fp = fingerprint(read(os.path.join(d, 'fr.md')).strip())
            for lang in LANGS[1:]:
                got = re.search(r'<!-- fr: ([0-9a-f]{12}) -->', texts.get(lang, ''))
                if lang in texts and (not got or got.group(1) != fp):
                    notes.append(f'{rel(d)}/{lang}.md : à retraduire (fr: {fp})')
        if texts:
            errors += anchor_errors(mid, texts)
            for a in ANCHOR.findall(texts.get('fr', '')):
                if a in seen_anchors:
                    errors.append(f'ancre « {a} » en double (chapitres {seen_anchors[a]} et {mid})')
                seen_anchors[a] = mid
        for lang, t in texts.items():
            title, _, rest = t.partition('\n')
            chapter.setdefault(mid, {})[lang] = f'<!-- chapter: {mid} -->\n{title}\n\n{rest.strip()}\n'
    errors += roadmap_errors()
    te, tn = tutorial_check()
    errors += te
    notes += tn
    for n in notes:
        print('  ' + n)
    if errors:
        for e in errors:
            print('ERREUR ' + e)
        sys.exit(f'{len(errors)} erreur(s) : rien n\'est écrit.')
    changed, counts = [], []
    for a, ms in apps.items():
        ids = [m for m in ms if m in chapter] + [mid for mid, _ in FRAME_CHAPTERS if mid in chapter]
        counts.append(f'{a} {len(ids)}')
        for lang in LANGS:
            out = f'{GENERATED}\n\n{intro[(a, lang)]}\n\n' + '\n'.join(chapter[i][lang] for i in ids if lang in chapter[i])
            p = os.path.join(HERE, f'{a}.{lang}.md')
            if not os.path.isfile(p) or read(p) != out:
                changed.append(f'frame/help/{a}.{lang}.md')
                if not check:
                    with open(p, 'w', encoding='utf-8', newline='\n') as f:
                        f.write(out)
    print(f'{", ".join(counts)} chapitre(s) ; {len(changed)} fichier(s) {"à écrire" if check else "écrit(s)"}' + (f' : {", ".join(changed)}' if changed else ''))


if __name__ == '__main__':
    main(sys.argv[1:])
