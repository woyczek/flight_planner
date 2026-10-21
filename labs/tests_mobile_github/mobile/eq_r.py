import time
from playwright.sync_api import sync_playwright
init = "localStorage.setItem('missionReportingConfig:v1', JSON.stringify({trigram:'ALF'}));"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True); ctx.add_init_script(init)
    pg = ctx.new_page()
    pg.goto('http://127.0.0.1:8790/apps/settings/profil.html?base=equipment', wait_until='load'); time.sleep(5)
    print(pg.evaluate("""() => { const t = document.querySelector('.eq-table'), out = [];
      const walk = (rules, src, layer) => { for (const r of rules) { if (r.cssRules && !r.selectorText) walk(r.cssRules, src, layer || (r.name !== undefined ? 'layer:' + r.name : r.conditionText)); else if (r.selectorText && r.style.display) { try { if (t.matches(r.selectorText)) out.push(src + ' ' + (layer||'') + ' | ' + r.selectorText.slice(0,120) + ' => ' + r.style.display + (r.style.getPropertyPriority('display') ? ' !imp' : '')); } catch {} } } };
      for (const s of document.styleSheets) { try { walk(s.cssRules, (s.href || s.ownerNode.id || 'inline').split('/').pop(), ''); } catch {} }
      return out.join('\\n'); }"""))
    b.close()
