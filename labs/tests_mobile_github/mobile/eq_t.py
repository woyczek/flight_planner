# Mes appareils (Mon profil) et Apparence au téléphone
import sys, time
from playwright.sync_api import sync_playwright
W = int(sys.argv[1]) if len(sys.argv) > 1 else 390
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('repositoryLanguageMode','fr');localStorage.setItem('repositoryMobileTheme','day');"
OUT = '/tmp/claude-0/-home-user/7b1db2ae-25b3-5fa5-91be-db447d44b0c4/scratchpad/mobile/'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    mob = W < 700
    ctx = b.new_context(viewport={'width': W, 'height': 844 if mob else 900}, is_mobile=mob, has_touch=mob); ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8790/apps/settings/profil.html?base=equipment', wait_until='load'); time.sleep(5)
    st = "() => { const s = [...document.querySelectorAll('[data-eq-st]')]; const rows = [...document.querySelectorAll('#eqTypes tbody tr')].filter(r => r.offsetParent); return 'states ' + s.length + ' first ' + (s[0]?.dataset.eqSt) + '=' + s[0]?.dataset.s + ' | rows ' + rows.length + ' maxH ' + Math.max(...rows.map(r => r.getBoundingClientRect().height)) + ' | table W ' + Math.round(document.querySelector('.eq-table')?.getBoundingClientRect().width) + ' scrollW ' + document.documentElement.scrollWidth + ' | aircraft ' + JSON.stringify(JSON.parse(localStorage.getItem('pilotAvailability:v1')||localStorage.getItem('missionAvailability:v1')||'{}').ALF?.aircraft || null); }"
    print(pg.evaluate(st))
    pg.screenshot(path=OUT + f'eq_{W}_a.png')
    first = pg.locator('[data-eq-st]').first
    first.scroll_into_view_if_needed()
    for i in range(4):
        first.click(); time.sleep(.3); print('click', i + 1, pg.evaluate("document.querySelector('[data-eq-st]').dataset.s + ' ' + document.querySelector('[data-eq-st]').title"))
    first.click(); first.click(); time.sleep(.3)
    pg.locator('.eq-more summary').first.click(); time.sleep(.4)
    print('menu', pg.evaluate("() => { const p = document.querySelector('.eq-more[open] .eq-pop'); if (!p) return 'none'; const r = p.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' : ' + p.innerText.replace(/\\n+/g, ' | ').slice(0, 300); }"))
    pg.screenshot(path=OUT + f'eq_{W}_b.png')
    pg.mouse.click(5, 300); time.sleep(.3); print('closed', pg.evaluate("!document.querySelector('.eq-more[open]')"))
    print(pg.evaluate(st))
    pg.goto('http://127.0.0.1:8790/apps/settings/apparence.html', wait_until='load'); time.sleep(4)
    print('apparence blocks', pg.evaluate("[...document.querySelectorAll('[data-block-id]')].filter(s => s.offsetParent).map(s => s.dataset.blockId).join(', ') + ' | note ' + !!document.querySelector('.ap-phone-note')"))
    pg.screenshot(path=OUT + f'ap_{W}.png', full_page=True)
    print('errors:', errs or 'none')
    b.close()
