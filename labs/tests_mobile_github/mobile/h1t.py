import time
from playwright.sync_api import sync_playwright
OUT = '/tmp/claude-0/-home-user/7b1db2ae-25b3-5fa5-91be-db447d44b0c4/scratchpad/mobile/'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    for vp in [(360, 740), (740, 360)]:
        ctx = b.new_context(viewport={'width': vp[0], 'height': vp[1]}, is_mobile=True, has_touch=True)
        ctx.add_init_script("localStorage.setItem('repositoryLanguageMode','fr');localStorage.setItem('repositoryMobileTheme','night');")
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:150]))
        pg.goto('http://127.0.0.1:8790/apps/cr/appareil.html?reg=F-HBKG'); time.sleep(4)
        print(vp, pg.evaluate("() => { const h = document.querySelector('header h1'); return h.textContent + ' | h1 ' + Math.round(h.getBoundingClientRect().width) + 'x' + Math.round(h.getBoundingClientRect().height) + ' scrollW ' + h.scrollWidth + ' | sync ' + (document.querySelector('.repo-sync-button')?.getBoundingClientRect().width|0) + ' backup ' + (document.querySelector('.repo-backup-button:not([hidden])')?.getBoundingClientRect().width|0); }"), errs or '')
        pg.screenshot(path=OUT + f'h1_{vp[0]}.png'); ctx.close()
    b.close()
