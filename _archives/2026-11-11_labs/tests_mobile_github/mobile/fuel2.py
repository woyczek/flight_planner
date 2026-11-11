import time, sys
from playwright.sync_api import sync_playwright
W = int(sys.argv[1]) if len(sys.argv) > 1 else 390
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('repositoryLanguageMode','en');localStorage.setItem('repositoryMobileTheme','night');"
OUT = '/tmp/claude-0/-home-user/7b1db2ae-25b3-5fa5-91be-db447d44b0c4/scratchpad/mobile/'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    mob = W < 700
    ctx = b.new_context(viewport={'width': W, 'height': 844}, is_mobile=mob, has_touch=mob); ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8790/apps/planner/flight_performance_planner.html?aircraft=A332&create=estimate', wait_until='load'); time.sleep(9)
    for d in pg.locator('dialog[open] button.primary').all()[:1]:
        try: d.click(); time.sleep(2)
        except Exception as e: print('dlg', e)
    print('profiles', pg.evaluate("Object.keys(JSON.parse(localStorage.getItem('flightPerfState')||'{}').profiles||{}).join(',') + ' last ' + JSON.parse(localStorage.getItem('flightPerfState')||'{}').lastAircraft"))
    pg.goto('http://127.0.0.1:8790/apps/planner/flight_performance_planner.html', wait_until='load'); time.sleep(5)
    print(pg.evaluate("'params open ' + document.getElementById('flightParams').open + ' | fl visible ' + !!document.getElementById('fl').offsetParent + ' | dist visible ' + !!document.getElementById('dist').offsetParent"))
    if pg.get_by_text('No aircraft').count():
        pg.get_by_text('No aircraft').first.click(); time.sleep(1)
        print('picker:', pg.evaluate("[...document.querySelectorAll('[role=option], .ap-item, li button, .picker-item')].slice(0,8).map(e => e.textContent.trim().slice(0,40)).join(' | ')"))
        pg.get_by_text('A330', exact=False).first.click(); time.sleep(3)
    pg.fill('#dist', '600') if pg.locator('#dist').is_visible() else pg.evaluate("document.getElementById('dist').value = 600")
    pg.locator('#calc').click(); time.sleep(4)
    print(pg.evaluate("""() => { const s = document.getElementById('decChart'); if (!s || !s.getBoundingClientRect().width) return 'no decChart'; const xs = [...s.querySelectorAll('text')].filter(t => /^FL\\d/.test(t.textContent) && !/plan/.test(t.textContent)).map(t => t.textContent); return 'dec labels: ' + xs.join(' '); }"""))
    el = pg.locator('#decChart')
    if el.count() and el.is_visible():
        el.scroll_into_view_if_needed(); time.sleep(.5); el.screenshot(path=OUT + f'dec_{W}.png')
    pg.evaluate("scrollTo(0,0)"); time.sleep(.3); pg.screenshot(path=OUT + f'fuel_{W}.png')
    print('errors', errs or 'none')
    b.close()
