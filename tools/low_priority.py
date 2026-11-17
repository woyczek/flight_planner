"""La priorité des sous-processus LOURDS du lanceur (SOG-0437) — décidée ICI, en un seul endroit.

Règle (ergonomie et Sécurité, 17 nov. 2026) : un travail de fond du lanceur ne prend JAMAIS le pas sur le simulateur ni sur l'écran. Sur le poste de l'utilisateur, X-Plane et le navigateur partagent la machine ;
un sous-processus lourd (la lecture des PDF par pypdf, le navigateur sans fenêtre des constructions, la construction des données du monde, les scripts de la base d'aéronefs) qui tourne à la priorité NORMALE leur
dispute les cœurs, et une reconnaissance de caractères prend tous les cœurs pendant des minutes. Tout sous-processus lourd est donc lancé à la priorité BASSE :

  · Windows : IDLE_PRIORITY_CLASS (`creationflags`, posé à la création : le processus n'a jamais tourné à une autre priorité, ses fils héritent) ;
  · macOS, Linux : `nice` 19 (posé dans le fils avant l'exécution).
Une priorité basse ne rend pas le travail plus lent quand la machine est libre : il ne cède la place que lorsqu'une tâche à priorité normale veut le cœur. La reconnaissance de caractères (et toute bibliothèque
qui lance autant de fils qu'il y a de cœurs) est de plus BORNÉE à la moitié des cœurs : `cpu_budget()` et `threads_env()`.

Qui l'appelle : tools/pdf_guard.py (_run_child), tools/regen/base.py (launch_browser), tools/regen/aircraft.py (_run), tools/regen/weather.py (le constructeur), tools/proc_ocr.py (la session Procédures, la borne).
Un cas (K437) refuse qu'un autre fichier de tools/ pose lui-même une priorité : une seule décision. Bibliothèque standard seulement."""
import os

WIN_CLASS = 0x00000040      # IDLE_PRIORITY_CLASS : seulement quand la machine est libre (BELOW_NORMAL 0x00004000 aurait encore disputé les cœurs au simulateur)
NICE = 19                   # le plus bas (macOS, Linux)
THREAD_VARS = ('OMP_THREAD_LIMIT', 'OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'NUMEXPR_NUM_THREADS', 'VECLIB_MAXIMUM_THREADS', 'ORT_NUM_THREADS')


def popen_args(kw=None):
    """Les arguments de subprocess.Popen d'un sous-processus lourd, ceux donnés (`kw`, copiés) complétés de la priorité basse : Windows `creationflags |= IDLE_PRIORITY_CLASS`, ailleurs un `preexec_fn` qui règle `nice`
    (celui qui y est déjà est gardé et appelé d'abord). Se passe en `subprocess.Popen(cmd, **low_priority.popen_args({...}))`."""
    kw = dict(kw or {})
    if os.name == 'nt':
        kw['creationflags'] = int(kw.get('creationflags') or 0) | WIN_CLASS
    else:
        before = kw.get('preexec_fn')

        def lower():
            if before:
                before()
            try:
                os.nice(NICE)
            except OSError:      # pas le droit, ou déjà au plus bas : le sous-processus tourne comme il est
                pass
        kw['preexec_fn'] = lower
    return kw


def lower_self():
    """Abaisse le processus COURANT à la priorité basse (un outil autonome qui tourne longtemps, ou une reconnaissance de caractères lancée dans le processus d'un constructeur) : Windows SetPriorityClass(IDLE_PRIORITY_CLASS),
    ailleurs nice. Rend vrai si c'est fait ; jamais d'exception."""
    try:
        if os.name == 'nt':
            import ctypes
            k = ctypes.windll.kernel32
            k.GetCurrentProcess.restype = ctypes.c_void_p
            k.SetPriorityClass.argtypes = [ctypes.c_void_p, ctypes.c_uint]
            return bool(k.SetPriorityClass(k.GetCurrentProcess(), WIN_CLASS))
        os.nice(NICE)
        return True
    except (OSError, AttributeError, ValueError):
        return False


def cpu_budget():
    """Le nombre de cœurs qu'un travail lourd peut prendre : la MOITIÉ des cœurs (au moins un)."""
    return max(1, (os.cpu_count() or 2) // 2)


def threads_env(env=None):
    """L'environnement (une copie de `env`, ou de celui du lanceur) où les bibliothèques de calcul (OpenMP, OpenBLAS, MKL, ONNX Runtime… : Tesseract, RapidOCR) ne lancent pas plus de fils que `cpu_budget()`."""
    out = dict(os.environ if env is None else env)
    for k in THREAD_VARS:
        out[k] = str(cpu_budget())
    return out
