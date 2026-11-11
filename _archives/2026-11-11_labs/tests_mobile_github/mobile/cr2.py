# CR au téléphone : chemin Mes missions → A-001A → Créer le CR ; étapes, en-tête, bouton Sauvegarder
import sys, time
from playwright.sync_api import sync_playwright
BASE = 'http://127.0.0.1:8790/'
skin = sys.argv[1] if len(sys.argv) > 1 else 'mobile'
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('repositoryLanguageMode','fr');localStorage.setItem('repositoryMobileSkin','%s');" % skin
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True); ctx.add_init_script(init)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    ctx.on('page', lambda np: np.on('pageerror', lambda e: errs.append(str(e))))
    pg.goto(BASE + 'apps/pilot/mes_missions.html', wait_until='load'); time.sleep(4)
    pg.get_by_text('A-001A').first.tap(); time.sleep(2)
    pg.get_by_text('Ouvrir la mission').first.tap(); time.sleep(3)
    pg.locator('[data-go="cr"]').first.tap(); time.sleep(6)
    pg = ctx.pages[-1]
    print('url', pg.url)
    js = """() => { const h = document.querySelector('header.mc-header'), cs = getComputedStyle(h), st = document.querySelector('[data-action=store]');
      const steps = [...document.querySelectorAll('.mc-step')].map(s => s.dataset.step + (s.classList.contains('open') ? ':open' : ':closed')).join(' ');
      const nav = document.querySelector('.mc-steps-nav'), r = nav.getBoundingClientRect(), sr = st.getBoundingClientRect();
      return `header pos=${cs.position} h=${Math.round(h.getBoundingClientRect().height)} top=${Math.round(h.getBoundingClientRect().top)} | steps ${steps} | nav top=${Math.round(r.top)} h=${Math.round(r.height)} | store ${getComputedStyle(st).position} @${Math.round(sr.left)},${Math.round(sr.top)} ${Math.round(sr.width)}x${Math.round(sr.height)} | H=${document.documentElement.scrollHeight} scrollW=${document.documentElement.scrollWidth}`; }"""
    print(pg.evaluate(js)); pg.screenshot(path='cr2_a.png')
    pg.mouse.wheel(0, 1500); time.sleep(1); print(pg.evaluate(js)); pg.screenshot(path='cr2_b.png')
    pg.locator('.mc-steps-nav button').nth(1).tap(); time.sleep(1.5); print(pg.evaluate(js)); pg.screenshot(path='cr2_c.png')
    pg.locator('#mc-step-result .mc-step-head').tap(); time.sleep(1.5); print(pg.evaluate(js)); pg.screenshot(path='cr2_d.png')
    print('errors:', errs or 'none')
    b.close()
