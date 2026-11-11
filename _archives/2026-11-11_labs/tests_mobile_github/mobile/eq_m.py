import time
from playwright.sync_api import sync_playwright
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));localStorage.setItem('repositoryLanguageMode','fr');"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); ctx.add_init_script(init)
    pg = ctx.new_page()
    pg.goto('http://127.0.0.1:8790/apps/settings/profil.html?base=equipment', wait_until='load'); time.sleep(5)
    print(pg.evaluate("""() => [...document.querySelectorAll('.eq-table')].slice(0,2).map(t => { const tr = t.querySelector('tbody tr'); return 'inMain ' + !!t.closest('main') + ' css ' + !!document.getElementById('equipmentEditorCss') + ' has ' + (document.getElementById('equipmentEditorCss')?.textContent.includes('table-layout:fixed')) + ' table sw ' + t.scrollWidth + ' cw ' + t.clientWidth + ' disp ' + getComputedStyle(t).display + ' | tds ' + [...tr.children].filter(c => c.offsetParent).map(c => c.className + ':' + Math.round(c.getBoundingClientRect().width)).join(' ') + ' | name ' + Math.round(tr.querySelector('.eq-name').scrollWidth); }).join('\\n')"""))
    pg.screenshot(path='eq_m.png')
    b.close()
