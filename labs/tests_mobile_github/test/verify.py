# Ouvre tools/verify_format.html (dépôt servi) et affiche son verdict.
import threading, http.server, functools, time
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8767), functools.partial(Q, directory='/home/user/flight_planner'))
threading.Thread(target=srv.serve_forever, daemon=True).start()
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    pg = b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/acorn.min.js', lambda r: r.fulfill(path='/tmp/claude-0/-home-user/7b1db2ae-25b3-5fa5-91be-db447d44b0c4/scratchpad/acorn/package/dist/acorn.js', content_type='text/javascript'))
    pg.goto('http://127.0.0.1:8767/tools/verify_format.html'); time.sleep(6)
    print(pg.inner_text('body')[:1500]); print('errors:', errs)
    b.close()
