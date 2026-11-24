"""A child process that dies with its parent (standard library only).

The user's words (24 Nov 2026): « 26 python, 100 chromium »; seven static servers of passes had stayed behind. A pass that ends, fails or is
interrupted closes its server and its browsers by try/finally and the exit handlers of run.py; but a pass that is KILLED the hard way (the
process killed, not asked: on Windows nothing of Python runs then) leaves its children behind. So each child watches its parent: when the parent
is gone (its number is no longer a running process, or lives with another start time: the numbers are reused) the child cleans up and exits.

    import parent_watch
    parent_watch.watch(parent_pid, cleanup)      # a thread of the child; cleanup() closes what the child holds (a browser)
"""
import os
import threading
import time

import heavy_lock as HL

EVERY = 1.0  # seconds between two looks at the parent


def parent_gone(pid, start):
    """True when the process `pid`, which started at `start` (None: unknown), no longer runs."""
    if not HL.pid_alive(pid):
        return True
    now = HL.start_time(pid)
    return start is not None and now is not None and abs(now - start) > HL.SAME_START


def watch(pid, cleanup=None, every=EVERY):
    """Starts the watch: when `pid` is gone, `cleanup()` runs (its failures are ignored) and this process exits at once.  Returns the thread."""
    start = HL.start_time(pid)

    def loop():
        while True:
            time.sleep(every)
            if parent_gone(pid, start):
                try:
                    if cleanup:
                        cleanup()
                except Exception:
                    pass
                os._exit(0)
    t = threading.Thread(target=loop, daemon=True, name='parent-watch')
    t.start()
    return t
