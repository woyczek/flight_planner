import time, json
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1300, 'height': 900})
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8790/apps/planner/performance_sheets.html?aircraft=A332&create=estimate', wait_until='load'); time.sleep(8)
    st = json.loads(pg.evaluate("localStorage.getItem('flightPerfState') || '{}'"))
    print('keys', list(st.keys()), 'profiles', list((st.get('profiles') or {}).keys()))
    print(pg.evaluate("[...document.querySelectorAll('dialog[open], .repo-notify')].map(d => d.innerText.slice(0,200)).join(' || ')"))
    pg.screenshot(path='ps.png')
    print(errs)
    b.close()
