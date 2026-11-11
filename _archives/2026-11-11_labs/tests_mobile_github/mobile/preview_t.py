import threading, http.server, functools, time
from playwright.sync_api import sync_playwright
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def guess_type(self, p): return 'text/javascript' if p.endswith('repository_tree') else super().guess_type(p)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8773), functools.partial(Q, directory='/home/user/flight_planner'))
threading.Thread(target=srv.serve_forever, daemon=True).start()
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1500, 'height': 1000})
    ctx.add_init_script(open('init.js').read())
    pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8773/tools/mobile_preview.html', wait_until='load')
    for skin, theme in [('mobile', 'day'), ('mobile-swiss', 'night'), ('mobile', 'night')]:
        pg.select_option('#skin', skin); pg.select_option('#theme', theme); time.sleep(4)
        f = pg.frames[1]
        st = f.evaluate("[document.documentElement.dataset.mobile, document.documentElement.dataset.design, document.documentElement.dataset.mobileTheme, getComputedStyle(document.body).backgroundColor, !!document.querySelector('.repo-sidenav') && getComputedStyle(document.querySelector('.repo-sidenav')).position, [...document.querySelectorAll('.repo-sidenav>ul:first-of-type>li')].filter(li => getComputedStyle(li).display !== 'none').map(li => li.textContent.trim()).join(' | ')]")
        print(skin, theme, st)
        pg.screenshot(path=f'preview_{skin}_{theme}.png')
    # navigation dans le cadre : le mode suit
    f = pg.frames[1]; f.goto('http://127.0.0.1:8773/apps/pilot/aujourdhui.html'); time.sleep(3)
    print('after nav:', f.evaluate("[document.documentElement.dataset.mobile, document.documentElement.dataset.design]"))
    print('top window:', pg.evaluate("document.documentElement.dataset.mobile || '(page outil)'"))
    b.close()
print('errors:', errs or 'none')
