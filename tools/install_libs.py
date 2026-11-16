"""Installer les bibliothèques Python EN OPTION de la suite (SOG-0376) — lancé par l'UTILISATEUR, par installer_bibliotheques.cmd (Windows) ou installer_bibliotheques.sh (macOS / Linux) ; jamais par le lanceur ni par une page.

Pourquoi un script et pas un bouton : une page ou le lanceur qui installeraient du code pris sur le réseau auraient un pouvoir qu'ils n'ont pas (règle de tools/pdf_guard.py, avis de Sécurisation du 14/11/2026). La page DIT ce qui manque
(verbe `pdf/status`) ; ce script, lancé à la main, INSTALLE. Avis de Sécurisation du 16/11/2026, toutes les conditions sont tenues :
  · la liste et les bornes viennent du SEUL fichier tools/requirements-optional.txt, lu par tools/optional_libs.py (motif strict, liste fermée de noms ; une ligne -e, --index-url, URL, dépôt ou chemin refuse le fichier entier) ;
  · pas de --require-hashes (il gèlerait les correctifs de sécurité) ; à la place --only-binary :all: (aucun code de construction exécuté), --index-url https://pypi.org/simple, --isolated (ni variable PIP_* ni fichier de
    configuration de pip), --no-input ; l'option --allow-pip-config lève --isolated, jamais par défaut ;
  · pour l'utilisateur seulement (--user) ; dans un environnement virtuel --user est omis ; JAMAIS d'élévation, et refus d'être lancé en administrateur ou en root ;
  · toujours « python -m pip », avec -P (Python 3.11 et plus : ni le dossier du script ni le dossier courant ne sont cherchés), un dossier courant VIDE et neutre, sans variable PYTHON* ; jamais -I (il cacherait le dossier de
    l'utilisateur) ;
  · jamais de descente de version : une bibliothèque déjà PLUS RÉCENTE que le maximum du fichier est laissée telle quelle ; seules celles qui manquent ou sont trop anciennes sont passées à pip ;
  · le script dit l'interpréteur et sa version, les paquets et les versions prévus, d'où ils viennent, demande o/N (par défaut non), propose --dry-run (rien n'est lancé), et relit à la fin les versions réellement visibles ;
  · le groupe « pdf » est proposé d'abord ; le groupe « ocr » (lourd) À PART, par une seconde question ; la réponse par défaut est « non » aux deux.
Quatre langues (fr, en, de, es : la langue du système, ou --lang). Bibliothèque standard seulement."""
import argparse
import os
import shutil
import subprocess
import sys
import sysconfig
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
if HERE not in sys.path:
    sys.path.insert(0, HERE)

import optional_libs  # noqa: E402
import pdf_guard  # noqa: E402

INDEX = 'https://pypi.org/simple'
PIP_FLAGS = ('--only-binary', ':all:', '--index-url', INDEX, '--no-input', '--disable-pip-version-check', '--no-warn-script-location')      # --no-warn-script-location : pip avertit que des PROGRAMMES (scripts) installés sont dans un dossier hors du PATH ; la suite n'en lance aucun, elle importe des bibliothèques
TITLES = {'pdf': ('lecture des PDF', 'reading PDFs', 'Lesen von PDF', 'lectura de PDF'),
          'ocr': ('OCR des constructeurs de poste (lourd)', 'OCR for the workstation builders (heavy)', 'OCR für die Rechner-Builder (schwer)', 'OCR de los constructores del equipo (pesado)')}
YES = {'fr': ('o', 'oui'), 'en': ('y', 'yes'), 'de': ('j', 'ja'), 'es': ('s', 'si', 'sí')}
LANGS = ('fr', 'en', 'de', 'es')
M = {      # [fr, en, de, es]
    'python': ('Python : {py} (version {v})', 'Python: {py} (version {v})', 'Python: {py} (Version {v})', 'Python: {py} (versión {v})'),
    'paths': ('Dossier des commandes : {scripts}', 'Command directory: {scripts}', 'Verzeichnis der Befehle: {scripts}', 'Directorio de comandos: {scripts}'),
    'path_warning': ('Ce dossier manque au PATH : les commandes installees ne seront pas trouvees directement. Les imports Python ne dependent pas du PATH.',
                     'This directory is missing from PATH: installed commands cannot be found directly. Python imports do not depend on PATH.',
                     'Dieses Verzeichnis fehlt im PATH: installierte Befehle werden nicht direkt gefunden. Python-Importe haengen nicht vom PATH ab.',
                     'Este directorio falta en PATH: los comandos instalados no se encuentran directamente. Las importaciones de Python no dependen de PATH.'),
    'admin': ('Ce script s’utilise sans droits d’administrateur (il installe pour votre compte seulement) : fermez cette fenêtre et relancez-le comme un utilisateur ordinaire.',
              'This script is run without administrator rights (it installs for your account only): close this window and run it again as an ordinary user.',
              'Dieses Skript läuft ohne Administratorrechte (es installiert nur für Ihr Konto): Fenster schließen und als normaler Benutzer neu starten.',
              'Este script se usa sin derechos de administrador (instala solo para su cuenta): cierre esta ventana y vuelva a lanzarlo como usuario normal.'),
    'refused': ('Le fichier des bornes (tools/requirements-optional.txt) est refusé : {why}. Rien n’est installé.', 'The bounds file (tools/requirements-optional.txt) is refused: {why}. Nothing is installed.',
                'Die Datei der Grenzen (tools/requirements-optional.txt) wird abgelehnt: {why}. Es wird nichts installiert.', 'El archivo de límites (tools/requirements-optional.txt) se rechaza: {why}. No se instala nada.'),
    'group': ('Groupe « {title} »', 'Group “{title}”', 'Gruppe „{title}“', 'Grupo «{title}»'),
    'row': ('  {name:<22} installée : {have:<10} demandée : {want}   → {todo}', '  {name:<22} installed: {have:<10} wanted: {want}   → {todo}', '  {name:<22} installiert: {have:<10} verlangt: {want}   → {todo}', '  {name:<22} instalada: {have:<10} pedida: {want}   → {todo}'),
    'none': ('absente', 'absent', 'fehlt', 'ausente'),
    'do_install': ('à installer', 'to install', 'zu installieren', 'por instalar'),
    'do_upgrade': ('à mettre à jour', 'to upgrade', 'zu aktualisieren', 'por actualizar'),
    'do_ok': ('rien à faire', 'nothing to do', 'nichts zu tun', 'nada que hacer'),
    'do_new': ('plus récente que la borne : laissée telle quelle (jamais de descente de version)', 'newer than the bound: left as it is (a version is never lowered)',
               'neuer als die Grenze: bleibt unverändert (nie eine ältere Version)', 'más reciente que el límite: se deja tal cual (nunca se baja de versión)'),
    'source': ('Ces paquets viennent de {index} (PyPI), en versions précompilées seulement, pour votre compte seulement.', 'These packages come from {index} (PyPI), as prebuilt wheels only, for your account only.',
               'Diese Pakete kommen von {index} (PyPI), nur als fertige Wheels, nur für Ihr Konto.', 'Estos paquetes vienen de {index} (PyPI), solo como ruedas precompiladas, solo para su cuenta.'),
    'ask': ('Installer le groupe « {title} » ? [o/N] ', 'Install the group “{title}”? [y/N] ', 'Gruppe „{title}“ installieren? [j/N] ', '¿Instalar el grupo «{title}»? [s/N] '),
    'skipped': ('Groupe « {title} » : non installé.', 'Group “{title}”: not installed.', 'Gruppe „{title}“: nicht installiert.', 'Grupo «{title}»: no instalado.'),
    'dry': ('Essai à blanc : voici la commande, rien n’est lancé :', 'Dry run: this is the command, nothing is run:', 'Probelauf: dies ist der Befehl, nichts wird ausgeführt:', 'Ensayo: este es el comando, no se lanza nada:'),
    'nothing': ('Groupe « {title} » : rien à installer.', 'Group “{title}”: nothing to install.', 'Gruppe „{title}“: nichts zu installieren.', 'Grupo «{title}»: nada que instalar.'),
    'pip_failed': ('L’installation du groupe « {title} » a échoué (code {code}) : lisez les lignes de pip ci-dessus.', 'The installation of the group “{title}” failed (code {code}): read the pip lines above.',
                   'Die Installation der Gruppe „{title}“ ist fehlgeschlagen (Code {code}): lesen Sie die pip-Zeilen oben.', 'La instalación del grupo «{title}» ha fallado (código {code}): lea las líneas de pip de arriba.'),
    'after': ('Versions visibles maintenant :', 'Versions visible now:', 'Jetzt sichtbare Versionen:', 'Versiones visibles ahora:'),
    'ready': ('Groupe « {title} » : prêt.', 'Group “{title}”: ready.', 'Gruppe „{title}“: bereit.', 'Grupo «{title}»: listo.'),
    'notready': ('Groupe « {title} » : pas prêt.', 'Group “{title}”: not ready.', 'Gruppe „{title}“: nicht bereit.', 'Grupo «{title}»: no listo.'),
    'scripts': ('Les bibliothèques sont installées ; le lanceur n’a pas besoin de programmes dans le PATH (si pip a parlé de « scripts hors du PATH », ce n’est pas une erreur).', 'The libraries are installed; the launcher does not need any program in the PATH (if pip said « scripts not on PATH », it is not an error).',
                'Die Bibliotheken sind installiert; der Starter braucht keine Programme im PATH (wenn pip „Skripte nicht im PATH“ meldete, ist das kein Fehler).', 'Las bibliotecas están instaladas; el lanzador no necesita programas en el PATH (si pip dijo «scripts fuera del PATH», no es un error).'),
    'restart': ('Relancez maintenant le lanceur (lancer.cmd ou sh lancer.sh) : il lit les versions au démarrage de la page.', 'Now restart the launcher (lancer.cmd or sh lancer.sh): it reads the versions when the page starts.',
                'Starten Sie jetzt den Starter neu (lancer.cmd oder sh lancer.sh): er liest die Versionen beim Start der Seite.', 'Vuelva a lanzar ahora el lanzador (lancer.cmd o sh lancer.sh): lee las versiones al abrir la página.'),
}


def language(forced=None, env=None):
    """fr | en | de | es : `--lang`, sinon la langue du système (LC_ALL, LC_MESSAGES, LANG, LANGUAGE ; sous Windows la langue de l'interface), sinon le français."""
    env = os.environ if env is None else env
    if forced in LANGS:
        return forced
    for key in ('LC_ALL', 'LC_MESSAGES', 'LANGUAGE', 'LANG'):
        code = str(env.get(key, ''))[:2].lower()
        if code in LANGS:
            return code
    if sys.platform == 'win32':
        try:
            import ctypes
            return {0x0c: 'fr', 0x09: 'en', 0x07: 'de', 0x0a: 'es'}.get(ctypes.windll.kernel32.GetUserDefaultUILanguage() & 0xff, 'fr')
        except Exception:
            pass
    return 'fr'


def is_admin():
    """Vrai quand le script tourne avec des droits d'administrateur (Windows) ou en root (ailleurs) : il refuse alors de s'exécuter."""
    try:
        if sys.platform == 'win32':
            import ctypes
            return bool(ctypes.windll.shell32.IsUserAnAdmin())
        return os.geteuid() == 0
    except Exception:
        return False


def in_venv():
    return sys.prefix != getattr(sys, 'base_prefix', sys.prefix)


def plan(group, have):
    """[(paquet, version lue, état, décision)] d'un groupe : install (absent) | upgrade (trop ancienne) | ok | new (plus récente que la borne : jamais de descente). Seuls install et upgrade sont donnés à pip."""
    out = []
    for pkg in group['packages']:
        state = pdf_guard.judge(pkg[0], have.get(pkg[0]))
        out.append((pkg, have.get(pkg[0]), state, {'missing': 'install', 'old': 'upgrade', 'ok': 'ok', 'new': 'new'}[state]))
    return out


def pip_command(specs, py=None, venv=None, isolated=True, version=None):
    """La commande pip, sous forme de LISTE (jamais passée à un shell) : « python [-P] -m pip install … » ; --user hors d'un environnement virtuel ; --isolated sauf demande."""
    version = version or sys.version_info
    cmd = [py or sys.executable] + (['-P'] if tuple(version[:2]) >= (3, 11) else []) + ['-m', 'pip', 'install'] + list(PIP_FLAGS)
    if isolated:
        cmd.append('--isolated')
    if not (in_venv() if venv is None else venv):
        cmd.append('--user')
    return cmd + list(specs)


KEEP_ENV = ('PYTHONUSERBASE',)      # le dossier « --user » de l'utilisateur : sans elle, la bibliothèque irait dans un autre site que celui que lit le lanceur


def clean_env(env=None):
    """L'environnement du sous-processus : celui de l'utilisateur sans aucune variable PYTHON* (PYTHONPATH, PYTHONHOME, PYTHONSTARTUP… ne détournent pas pip), sauf PYTHONUSERBASE, que l'utilisateur a posée pour dire où vont ses bibliothèques « --user » (celle que le lanceur lit aussi)."""
    return {k: v for k, v in (os.environ if env is None else env).items() if not k.upper().startswith('PYTHON') or k.upper() in KEEP_ENV}


def scripts_directory():
    if in_venv():
        return sysconfig.get_path('scripts')
    if hasattr(sysconfig, 'get_preferred_scheme'):
        scheme = sysconfig.get_preferred_scheme('user')
    else:      # Python 3.8 / 3.9, encore acceptes par le lanceur
        scheme = 'osx_framework_user' if sys.platform == 'darwin' and getattr(sys, '_framework', None) else os.name + '_user'
    return sysconfig.get_path('scripts', scheme=scheme)


def main(argv=None, *, run=subprocess.run, ask=input, out=print, have_of=None, admin=None):
    ap = argparse.ArgumentParser(description='Installe les bibliothèques Python en option de la suite (tools/requirements-optional.txt).')
    ap.add_argument('--dry-run', action='store_true', help='affiche ce qui serait lancé, ne lance rien')
    ap.add_argument('--allow-pip-config', action='store_true', help='lève --isolated : pip lit alors sa configuration et ses variables PIP_*')
    ap.add_argument('--lang', choices=LANGS)
    args = ap.parse_args(argv)
    lang = language(args.lang)
    L = LANGS.index(lang)

    def say(key, **kw):
        out(M[key][L].format(**kw))

    out(M['python'][L].format(py=sys.executable, v='.'.join(map(str, sys.version_info[:3]))))
    if (is_admin() if admin is None else admin):
        say('admin')
        return 2
    scripts = scripts_directory()
    say('paths', scripts=scripts)
    normalize = lambda p: os.path.normcase(os.path.abspath(p))
    path_dirs = [normalize(p) for p in os.environ.get('PATH', '').split(os.pathsep) if p]
    if normalize(scripts) not in path_dirs:
        say('path_warning')
    try:
        groups = optional_libs.load()
    except ValueError as e:
        say('refused', why=str(e))
        return 2
    names = [p[0] for g in groups for p in g['packages']]
    have = (have_of or pdf_guard.versions)(names)
    isolated = not args.allow_pip_config
    code = 0
    for g in groups:
        title = TITLES.get(g['id'], (g['id'],) * 4)[L]
        rows = plan(g, have)
        out('')
        say('group', title=title)
        for pkg, ver, state, todo in rows:
            out(M['row'][L].format(name=pkg[0], have=ver or M['none'][L], want=optional_libs.spec(pkg)[len(pkg[0]):], todo=M['do_' + todo][L]))
        specs = [optional_libs.spec(pkg) for pkg, _v, _s, todo in rows if todo in ('install', 'upgrade')]
        if not specs:
            say('nothing', title=title)
            continue
        say('source', index=INDEX)
        cmd = pip_command(specs, isolated=isolated)
        if args.dry_run:
            say('dry')
            out('  ' + ' '.join(f'"{x}"' if any(ch in x for ch in ' <>') else x for x in cmd))      # pour l'AFFICHAGE seulement (copiable) : la commande lancée est la liste, jamais passée à un shell
            continue
        answer = ''
        try:
            answer = ask(M['ask'][L].format(title=title)).strip().lower()
        except (EOFError, KeyboardInterrupt):
            answer = ''
        if answer not in YES[lang]:
            say('skipped', title=title)
            continue
        work = tempfile.mkdtemp(prefix='suite-libs-')      # un dossier courant VIDE pour pip, effacé après le passage
        try:
            r = run(cmd, cwd=work, env=clean_env(), stdin=subprocess.DEVNULL)
        finally:
            shutil.rmtree(work, ignore_errors=True)
        if r.returncode != 0:
            say('pip_failed', title=title, code=r.returncode)
            code = 1
    if not args.dry_run:
        after = (have_of or pdf_guard.versions)(names)
        out('')
        say('after')
        for g in groups:
            title = TITLES.get(g['id'], (g['id'],) * 4)[L]
            for pkg in g['packages']:
                out(f'  {pkg[0]:<22} {after.get(pkg[0]) or M["none"][L]}')
            ok = all(pdf_guard.judge(p[0], after.get(p[0])) == 'ok' for p in g['packages'])      # comme `pdf/status` : une version plus récente que la borne n'est pas « prête » non plus
            say('ready' if ok else 'notready', title=title)
        out('')
        say('scripts')
        say('restart')
    return code


if __name__ == '__main__':
    try:
        sys.stdout.reconfigure(errors='replace')
    except Exception:
        pass
    raise SystemExit(main())
