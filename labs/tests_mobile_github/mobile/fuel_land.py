# Carburant, petit téléphone en paysage : en-tête, barre du bas et hauteur des courbes
import time, sys
from playwright.sync_api import sync_playwright
W, H = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (667, 375)
tag = sys.argv[3] if len(sys.argv) > 3 else 'avant'
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('repositoryLanguageMode','fr');localStorage.setItem('repositoryMobileTheme','night');"
OUT = '/tmp/claude-0/-home-user/7b1db2ae-25b3-5fa5-91be-db447d44b0c4/scratchpad/mobile/'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2, is_mobile=True, has_touch=True); ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
    pg.goto('http://127.0.0.1:8790/apps/planner/performance_sheets.html?aircraft=A332&create=estimate', wait_until='load'); time.sleep(9)
    pg.goto('http://127.0.0.1:8790/apps/planner/flight_performance_planner.html', wait_until='load'); time.sleep(5)
    if pg.get_by_text('Aucun avion').count():
        pg.get_by_text('Aucun avion').first.click(); time.sleep(1)
        pg.locator('text=A330 MRTT').first.click(); time.sleep(3)
    pg.evaluate("document.getElementById('dist').value = 600")
    pg.locator('#calc').click(); time.sleep(4)
    print(pg.evaluate("""() => { const o = []; const hd = document.querySelector('.repo-header'), sn = document.querySelector('.repo-sidenav'), tb = document.querySelector('.repo-tabs');
      o.push('header ' + Math.round(hd.getBoundingClientRect().height) + ' ' + getComputedStyle(hd).position + ' | tabs ' + Math.round(tb?.getBoundingClientRect().height || 0) + ' | bottom bar ' + Math.round(sn.getBoundingClientRect().height));
      for (const s of document.querySelectorAll('svg.opt-chart, #decChart, svg')) { const r = s.getBoundingClientRect(); if (r.height > 120) o.push((s.id || s.className.baseVal || 'svg') + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
      return o.join('\\n'); }"""))
    for i, sel in enumerate(['#decChart', '#climbChart']):
        el = pg.locator(sel)
        if el.count() and el.is_visible():
            el.scroll_into_view_if_needed(); pg.evaluate(f"document.querySelector('{sel}').closest('.fl-dec-main, .perf-row, section').scrollIntoView({{block: 'start'}})"); time.sleep(.5)
            pg.screenshot(path=OUT + f'land_{tag}_{i}.png')
    print('errors', errs or 'none')
    b.close()
