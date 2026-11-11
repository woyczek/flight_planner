import time, sys
from playwright.sync_api import sync_playwright
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('repositoryLanguageMode','fr');localStorage.setItem('repositoryMobileTheme','day');"
OUT = '/tmp/claude-0/-home-user/7b1db2ae-25b3-5fa5-91be-db447d44b0c4/scratchpad/mobile/'
tag = sys.argv[1] if len(sys.argv) > 1 else 'avant'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://127.0.0.1:8790/apps/cr/appareil.html?reg=F-UHIB', wait_until='load'); time.sleep(5)
    print(pg.evaluate("""() => { const h = document.querySelector('header'); return 'h1: ' + JSON.stringify(h?.querySelector('h1')?.textContent) + ' visible ' + !!h?.querySelector('h1')?.offsetWidth + ' | header ' + Math.round(h.getBoundingClientRect().height) + ' | tabs: ' + [...document.querySelectorAll('.repo-tab')].map(t => t.textContent.trim() + (t.offsetParent ? '' : '(caché)')).join(', ') + ' | blocs: ' + [...document.querySelectorAll('[data-block-id]')].map(s => s.dataset.blockId).join(', ') + ' | links: ' + [...document.querySelectorAll('main a')].slice(0, 12).map(a => a.textContent.trim().slice(0, 25)).join(' / '); }"""))
    pg.screenshot(path=OUT + f'fiche_{tag}.png')
    pg.screenshot(path=OUT + f'fiche_{tag}_full.png', full_page=True)
    print('errors', errs or 'none')
    b.close()
