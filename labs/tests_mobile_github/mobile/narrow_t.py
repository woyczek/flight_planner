# Ordinateur (souris), fenêtre réduite : onglets et navigation restent disponibles
import sys, threading, http.server, functools, time
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def guess_type(self, p): return 'text/javascript' if p.endswith('repository_tree') else super().guess_type(p)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8774), functools.partial(Q, directory='/home/user/flight_planner'))
threading.Thread(target=srv.serve_forever, daemon=True).start()
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1300, 'height': 900})
    ctx.add_init_script(open('init.js').read())
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8774/' + sys.argv[1], wait_until='load'); time.sleep(3)
    q = """[document.documentElement.dataset.mobile, [...document.querySelectorAll('.repo-tab')].filter(a => getComputedStyle(a).display !== 'none').map(a => a.textContent).join(', '),
      (() => { const n = document.querySelector('.repo-sidenav'); return n ? getComputedStyle(n).display + ' ' + getComputedStyle(n).position : 'pas de barre'; })(),
      [...document.querySelectorAll('.repo-sidenav>ul:first-of-type>li')].filter(li => getComputedStyle(li).display !== 'none').map(li => li.textContent.trim()).join(' | ')]"""
    print('large :', pg.evaluate(q))
    pg.set_viewport_size({'width': 700, 'height': 900}); time.sleep(1.5)
    print('réduite:', pg.evaluate(q))
    pg.click('.repo-sidenav-more button'); time.sleep(.4)
    print('plus:', pg.evaluate("[...document.querySelectorAll('.repo-more-panel .repo-more-item')].map(a => a.textContent.trim() + ' → ' + (a.getAttribute('href') || 'bouton').split('/').pop()).join(' | ')"))
    pg.screenshot(path='narrow.png')
    b.close()
print('errors:', errs or 'none')
