# Mes disponibilités au téléphone (pilote ALF, jeu d'essai)
import sys, time
from playwright.sync_api import sync_playwright
skin = sys.argv[1] if len(sys.argv) > 1 else 'mobile'; out = sys.argv[2] if len(sys.argv) > 2 else 'dp'
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('repositoryLanguageMode','fr');localStorage.setItem('repositoryMobileSkin','%s');localStorage.setItem('repositoryMobileTheme','day');" % skin
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True); ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8790/apps/pilot/disponibilites.html', wait_until='load'); time.sleep(5)
    print(pg.evaluate("""() => { const W = innerWidth, out = [];
      for (const el of document.querySelectorAll('main *')) { const r = el.getBoundingClientRect(); if (r.right > W + 2 && r.width > 40 && getComputedStyle(el).display !== 'none') { out.push('large: ' + el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ' ' + Math.round(r.width)); if (out.length > 15) break; } }
      return out.join('\\n') + '\\nscrollW ' + document.documentElement.scrollWidth + ' H ' + document.documentElement.scrollHeight; }"""))
    pg.screenshot(path=out + '.png', full_page=True)
    print('errors:', errs or 'none')
    b.close()
