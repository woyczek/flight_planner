# Mes missions au téléphone (jeu d'essai servi par le lanceur, pilote ALF)
import sys, time
from playwright.sync_api import sync_playwright
BASE = 'http://127.0.0.1:8790/'
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('repositoryLanguageMode','fr');"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True); ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + 'apps/pilot/mes_missions.html', wait_until='load'); time.sleep(5)
    print(pg.evaluate("""() => { const W = innerWidth, out = [];
      for (const s of document.querySelectorAll('.repo-block')) { const r = s.getBoundingClientRect(); out.push('bloc ' + (s.dataset.blockId||'?') + ' h=' + Math.round(r.height) + (s.scrollWidth > s.clientWidth + 2 ? ' DEBORDE ' + s.scrollWidth : '')); }
      for (const el of document.querySelectorAll('main *')) { const r = el.getBoundingClientRect(); if (r.right > W + 2 && r.width > 40 && getComputedStyle(el).display !== 'none') { out.push('large: ' + el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0] + ' ' + Math.round(r.width)); if (out.length > 30) break; } }
      return out.join('\\n') + '\\nscrollW ' + document.documentElement.scrollWidth; }"""))
    pg.screenshot(path='mm_full.png', full_page=True)
    print('buttons/links in missions block:', pg.evaluate("[...document.querySelectorAll('main button, main a')].filter(e => e.offsetParent).slice(0,25).map(e => e.textContent.trim().slice(0,30)).join(' | ')"))
    print('errors:', errs or 'none')
    b.close()
