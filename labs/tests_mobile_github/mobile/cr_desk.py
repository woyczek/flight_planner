import time
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    for w in (1400, 600):
        pg = b.new_page(viewport={'width': w, 'height': 900}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        for u in ('apps/cr/mission_cr.html', 'apps/cr/COMBAT/combat_cr.html'):
            pg.goto('http://127.0.0.1:8790/' + u); time.sleep(4)
            print(w, u, pg.evaluate("document.documentElement.dataset.mobile + ' ' + [...document.querySelectorAll('.mc-step')].map(s => s.dataset.step + (s.classList.contains('open') ? ':open' : ':closed')).join(' ') + ' header ' + getComputedStyle(document.querySelector('header.mc-header')).position"), errs or '')
    b.close()
