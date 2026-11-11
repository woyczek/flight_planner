# Vue « un jour » : jour affiché, deux appuis (début, fin), retrait, défaire, balayage
import sys, time
from playwright.sync_api import sync_playwright
skin = sys.argv[1] if len(sys.argv) > 1 else 'mobile'
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('repositoryLanguageMode','fr');localStorage.setItem('repositoryMobileSkin','%s');localStorage.setItem('repositoryMobileTheme','day');" % skin
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True); ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8790/apps/pilot/disponibilites.html', wait_until='load'); time.sleep(5)
    st = """() => { const v = document.querySelector('[data-dayview]'); return 'dayview hidden=' + v.hidden + ' grid shown=' + !!document.querySelector('.dt-grid')?.offsetParent + ' | ' + (v.querySelector('.dw-dhead b')?.textContent || '') + ' | list: ' + [...v.querySelectorAll('.dw-dlist li span')].map(x => x.textContent).join(' ; ') + ' | hint: ' + (v.querySelector('.dw-dhint')?.textContent || '') + ' | scrollW ' + document.documentElement.scrollWidth; }"""
    print(pg.evaluate(st)); pg.screenshot(path='dp2_a.png', full_page=True)
    pg.locator('[data-dpill="2"]').tap(); time.sleep(.5); print(pg.evaluate(st))
    print('colbox scrollTop', pg.evaluate("document.querySelector('[data-colbox]').scrollTop"))
    pg.evaluate("document.querySelector('[data-colbox]').scrollTop = 7 * 48; document.querySelector('[data-colbox]').scrollIntoView({block: 'start'})"); time.sleep(.3)
    col = pg.locator('[data-col]'); bb = col.bounding_box()
    pg.mouse.click(bb['x'] + 150, bb['y'] + 8 * 48 + 5); time.sleep(.3); print(pg.evaluate(st))
    bb = col.bounding_box(); print('top', bb['y']); pg.mouse.click(bb['x'] + 150, bb['y'] + 11 * 48 + 30); time.sleep(.8); print(pg.evaluate(st))
    pg.screenshot(path='dp2_b.png')
    pg.locator('[data-dx]').last.tap(); time.sleep(.6); print('after remove', pg.evaluate(st))
    pg.locator('[data-dundo]').tap(); time.sleep(.6); print('after undo', pg.evaluate(st))
    pg.locator('[data-dstep="-1"]').tap(); time.sleep(.4); pg.locator('[data-dstep="-1"]').tap(); time.sleep(.4); pg.locator('[data-dstep="-1"]').tap(); time.sleep(3); print('prev week', pg.evaluate(st))
    pg.locator('[data-view-set="week"]').tap(); time.sleep(.5); print('week', pg.evaluate(st))
    pg.locator('[data-view-set="day"]').tap(); time.sleep(.5)
    pg.screenshot(path='dp2_c.png', full_page=True)
    print('errors:', errs or 'none')
    b.close()
