import time
from playwright.sync_api import sync_playwright
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    for w in (1400, 700):
        c = b.new_context(viewport={'width': w, 'height': 900}); c.add_init_script(init); pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('http://127.0.0.1:8790/apps/pilot/disponibilites.html'); time.sleep(4)
        print(w, pg.evaluate("document.documentElement.dataset.mobile + ' view-switch hidden=' + document.querySelector('[data-view]').hidden + ' day hidden=' + document.querySelector('[data-dayview]').hidden + ' grid=' + !!document.querySelector('.dt-grid').offsetParent"), errs or '')
    b.close()
