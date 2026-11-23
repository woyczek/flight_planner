"""ONE heavy job at a time on this computer (decision of the ergonomist, 24 Nov 2026; SOG-0594).

Heavy is every script that starts a headless browser: a pass of tests/v3/run.py (a full pass, a targeted one, a single case), a
capture of a mock-up or of a tutorial, a diagnostic.  Two at once crashed a browser driver (30 Oct), and a replay measured on a
loaded computer is not a measure.  So they take THIS lock, the one entry point of the sessions' scripts, and a held lock makes the
script WAIT: it does not run beside the other, and it never runs « anyway ».

The rules (the ergonomist's):
  1. The lock of a LIVE process is never freed, however long it has held it: a pass on a loaded computer is long.  Past two hours
     the one that waits SAYS who holds it and since when, and goes on waiting.  Nobody stops another one's process.
  2. A process is DEAD (its lock is an orphan, said and freed) when its number is gone OR when the number lives with another start
     time than the one written in the lock (Windows reuses the numbers: the old process is dead).
  3. The wait has an END, said: the one that waits tells every minute who holds the lock, and at its `timeout` (an ARGUMENT, not a
     hidden constant) it gives up with the sentence and a failure code; it never runs anyway.
  4. The lock holds only: what for, the process number, the process start time, the worktree.  It is a file in the computer's temp
     folder, never in the repository (the sessions' worktrees must see each other's).

In a script:                       from heavy_lock import heavy
                                   with heavy('capture of the mock-up', timeout=4 * 3600):
                                       ...                      # the browser starts here
From the command line:             python tests/v3/heavy_lock.py --label "capture" --timeout 14400 -- python my_capture.py
"""
import argparse
import atexit
import contextlib
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# the name changed with the format (an older run.py reads another file, and the old format said `at`: it would have taken ours for a stale one)
LOCK = Path(tempfile.gettempdir()) / 'sog-heavy.lock'
POLL = 10                   # seconds between two looks at a held lock
SAY_EVERY = 60              # the one that waits tells who holds the lock this often
LONG = 2 * 3600             # past this, a live holder is said to be long (never freed)
FRESH = 10                  # a lock file that cannot be read yet is the one of a job that is taking it (os.open done, json.dump not yet)
SAME_START = 2.0            # seconds: two readings of the same process start time agree within this
DEFAULT_TIMEOUT = 4 * 3600  # of the command line and of run.py, as an ARGUMENT (--timeout, --lock-timeout)


def pid_alive(pid):
    """True while a process of this number runs.  On Windows os.kill(pid, 0) would end it: the process is asked through the API."""
    if not isinstance(pid, int) or pid <= 0:
        return False
    if os.name == 'nt':
        import ctypes
        k = ctypes.windll.kernel32
        h = k.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
        if not h:
            return False
        code = ctypes.c_ulong()
        ok = k.GetExitCodeProcess(h, ctypes.byref(code))
        k.CloseHandle(h)
        return bool(ok) and code.value == 259  # STILL_ACTIVE
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def start_time(pid):
    """The start time of the process (seconds since 1970), or None when it cannot be read."""
    try:
        if os.name == 'nt':
            import ctypes
            from ctypes import wintypes
            k = ctypes.windll.kernel32
            h = k.OpenProcess(0x1000, False, pid)
            if not h:
                return None
            c, e, s, u = (wintypes.FILETIME() for _ in range(4))
            ok = k.GetProcessTimes(h, ctypes.byref(c), ctypes.byref(e), ctypes.byref(s), ctypes.byref(u))
            k.CloseHandle(h)
            if not ok:
                return None
            return ((c.dwHighDateTime << 32) | c.dwLowDateTime) / 1e7 - 11644473600
        stat = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
        ticks = int(stat[19])
        boot = next(float(l.split()[1]) for l in Path('/proc/stat').read_text().splitlines() if l.startswith('btime'))
        return boot + ticks / os.sysconf('SC_CLK_TCK')
    except (OSError, ValueError, IndexError, StopIteration, AttributeError):
        return None


def _read(path):
    try:
        h = json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return None
    return h if isinstance(h, dict) else None


def _age(path):
    """Seconds since the lock file was last written (it says since when a lock is held); a large number when it cannot be read."""
    try:
        return time.time() - path.stat().st_mtime
    except OSError:
        return 1e9


def alive(h):
    """True when the process of this lock still runs: its number lives AND (when the lock says it) with the same start time."""
    if not isinstance(h, dict) or not pid_alive(h.get('pid')):
        return False
    want, now = h.get('start'), start_time(h['pid'])
    return not (isinstance(want, (int, float)) and now is not None and abs(now - want) > SAME_START)


def holder(path=None):
    """The running job that holds the lock ({ label, pid, start, cwd }), or None (no lock, or an orphan: its process is dead)."""
    path = path or LOCK
    h = _read(path)
    return h if alive(h) else None


def _since(path):
    return time.strftime('%H:%M', time.localtime(time.time() - _age(path)))


def take(label='', wait=True, path=None, say=print, timeout=None):
    """Takes the lock; True when taken.  Held by a LIVE job: it WAITS (default), telling every minute who holds it, until `timeout`
    seconds (None: no end; 0 gives up at once, as wait=False does; at the end it gives up, says so and returns False: it never runs anyway), or
    (wait=False) returns False at once.  The command line and run.py turn their « 0: no end » into None before calling.  An orphan (its process dead, by number and start time) is said and freed, then the lock is taken."""
    path = path or LOCK
    t0, last_say = time.time(), 0.0
    while True:
        try:
            fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            h = holder(path)
            if h is None and _read(path) is None and _age(path) < FRESH:
                # the file exists but says nothing yet: its owner is between os.open and json.dump, not gone; two heavy jobs must never start together
                if not wait:
                    say('another heavy job is starting (its lock is being written)')
                    return False
                time.sleep(1)
                continue
            if h is None:
                old = _read(path) or {}
                if old:
                    say(f"heavy lock of pid {old.get('pid')} ({old.get('label') or old.get('cwd') or '?'}) freed: its process is dead (orphan)")
                try:
                    path.unlink()
                except OSError:
                    pass
                continue
            who = f"pid {h.get('pid')}, {h.get('label') or 'a pass'}, since {_since(path)}, {h.get('cwd', '?')}"
            if not wait:
                say(f'another heavy job is running ({who})')
                return False
            now = time.time()
            if timeout is not None and now - t0 >= timeout:
                say(f'gave up after {int(now - t0)} s waiting for the heavy job ({who}): this job did NOT run')
                return False
            if now - last_say >= SAY_EVERY:
                long = ' — for over two hours: a long job, still alive, it is waited for' if _age(path) > LONG else ''
                say(f'waiting for the heavy job ({who}) to end{long}…')
                last_say = now
            time.sleep(max(.05, min(POLL, timeout - (time.time() - t0))) if timeout is not None else POLL)   # never past its own end
            continue
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump({'label': label, 'pid': os.getpid(), 'start': start_time(os.getpid()), 'cwd': str(ROOT)}, f)
        atexit.register(drop, path)
        return True


def drop(path=None):
    """Removes the lock if it is this process's."""
    path = path or LOCK
    try:
        if json.loads(path.read_text(encoding='utf-8')).get('pid') == os.getpid():
            path.unlink()
    except (OSError, ValueError, AttributeError):
        pass


@contextlib.contextmanager
def heavy(label='', wait=True, path=None, say=print, timeout=None):
    """`with heavy('what for', timeout=4 * 3600):` the lock held around a heavy job; it waits for the lock (timeout None: without end, 0: gives up
    at once); at the end of its timeout (or at once with wait=False) it raises RuntimeError and the job does not run."""
    if not take(label, wait, path, say=say, timeout=timeout):
        raise RuntimeError('another heavy job is running: this one did not run')
    try:
        yield
    finally:
        drop(path)


def main(argv=None):
    ap = argparse.ArgumentParser(description='Runs a command (a script that starts a headless browser) with the heavy lock held: it waits for its turn.')
    ap.add_argument('--label', default='', help='what the job is, said to the ones that wait')
    ap.add_argument('--timeout', type=int, default=DEFAULT_TIMEOUT, metavar='SECONDS',
                    help=f'how long to wait for the lock before giving up with a failure code (default {DEFAULT_TIMEOUT}; 0: no end)')
    ap.add_argument('--no-wait', action='store_true', help='refuse (exit 3) instead of waiting when another heavy job runs')
    ap.add_argument('command', nargs=argparse.REMAINDER, help='after --')
    args = ap.parse_args(argv)
    cmd = args.command[1:] if args.command and args.command[0] == '--' else args.command
    if not cmd:
        ap.error('give the command after --')
    if not take(args.label or ' '.join(cmd)[:60], wait=not args.no_wait, timeout=args.timeout or None):
        return 3
    try:
        return subprocess.call(cmd)
    finally:
        drop()


if __name__ == '__main__':
    sys.exit(main())
