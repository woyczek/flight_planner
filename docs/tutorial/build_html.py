"""Pages HTML du tutoriel d'installation, produites depuis les fichiers Markdown (installation.fr.md, installation.en.md).
Sous-ensemble Markdown pris en charge : titres, paragraphes, listes à puces, tableaux, images seules sur leur ligne, blocs
de code, gras, italique, code, liens. Relancer après une modification du Markdown :
    python docs/tutorial/build_html.py"""
import html, os, re

HERE = os.path.dirname(os.path.abspath(__file__))

CSS = """
:root{--bg:#f6f8fb;--paper:#fff;--ink:#1f2937;--sub:#4b5563;--line:#e5e7eb;--accent:#1d4ed8;--code:#f1f5f9;--th:#eef2f7}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#0f141b;--paper:#161d27;--ink:#e5e7eb;--sub:#9ca3af;
--line:#2a3442;--accent:#7aa7ff;--code:#1e2733;--th:#1c2533}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.6 "Segoe UI",Helvetica,Arial,sans-serif}
main{max-width:1000px;margin:0 auto;padding:28px 20px 60px;background:var(--paper);min-height:100vh}
h1{font-size:30px;line-height:1.25;margin:0 0 6px}
h2{font-size:23px;margin:38px 0 10px;padding-top:12px;border-top:1px solid var(--line)}
h3{font-size:18px;margin:26px 0 8px}
p,li{color:var(--ink)}
.lead{color:var(--sub);margin-top:0}
a{color:var(--accent)}
code{background:var(--code);padding:1px 5px;border-radius:4px;font-size:.9em}
pre{background:var(--code);padding:12px 14px;border-radius:8px;overflow:auto;font-size:13.5px;line-height:1.45}
pre code{background:none;padding:0}
figure{margin:16px 0 22px}
figure img{display:block;max-width:100%;height:auto;border:1px solid var(--line);border-radius:8px;background:#fff;
box-shadow:0 2px 10px rgba(0,0,0,.08)}
figcaption{font-size:13px;color:var(--sub);margin-top:6px}
.tbl{overflow-x:auto;margin:12px 0 20px}
table{border-collapse:collapse;width:100%;font-size:14.5px}
th,td{border:1px solid var(--line);padding:7px 9px;text-align:left;vertical-align:top}
th{background:var(--th)}
nav.toc{font-size:14px;background:var(--code);border-radius:8px;padding:10px 16px;margin:18px 0}
nav.toc ul{margin:4px 0;padding-left:18px}
.langbar{display:flex;justify-content:flex-end;align-items:center;gap:8px;font-size:14px;color:var(--sub);margin-bottom:6px}
.langbar select{font:inherit;padding:3px 6px;border:1px solid var(--line);border-radius:6px;background:var(--paper);color:var(--ink)}
@media (max-width:640px){main{padding:18px 16px 40px}h1{font-size:25px}}
"""


def inline(s):
    out, i = [], 0
    for m in re.finditer(r'`([^`]+)`', s):
        out.append(_fmt(s[i:m.start()]))
        out.append(f'<code>{html.escape(m.group(1))}</code>')
        i = m.end()
    out.append(_fmt(s[i:]))
    return ''.join(out)


def _link(m):
    text, url = m.group(1), m.group(2)
    if re.match(r'installation\.(fr|en)\.md$', url):
        url = url[:-3] + '.html'
    ext = url.startswith('http')
    return f'<a href="{html.escape(url, True)}"{" rel=\"noopener\"" if ext else ""}>{text}</a>'


LANG = 'fr'


def _fmt(s):
    if LANG == 'fr':  # typographie française : espace fine insécable avant « : ; ! ? » » et après « « »
        s = re.sub(r'[  ]([:;!?»])', ' \1', s).replace('« ', '« ')
    s = html.escape(s, False)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', _link, s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![*\w])\*([^*\n]+)\*(?![*\w])', r'<em>\1</em>', s)
    return s


def slug(s):
    s = re.sub(r'<[^>]+>', '', s).lower()
    return re.sub(r'[^a-z0-9à-ÿ]+', '-', s).strip('-')


def convert(md):
    lines = md.split('\n')
    out, toc, i, para, title, lead = [], [], 0, [], '', ''

    def flush():
        if para:
            out.append(f'<p>{inline(" ".join(para))}</p>')
            para.clear()

    while i < len(lines):
        ln = lines[i]
        if ln.startswith('```'):
            flush()
            code = []
            i += 1
            while i < len(lines) and not lines[i].startswith('```'):
                code.append(lines[i])
                i += 1
            out.append('<pre><code>' + html.escape('\n'.join(code)) + '</code></pre>')
        elif m := re.match(r'^(#{1,3}) (.*)$', ln):
            flush()
            n, txt = len(m.group(1)), m.group(2)
            if n == 1:
                title = txt
                out.append(f'<h1>{inline(txt)}</h1>')
            else:
                sid = slug(txt)
                out.append(f'<h{n} id="{sid}">{inline(txt)}</h{n}>')
                toc.append((n, sid, re.sub(r'<[^>]+>', '', inline(txt))))
        elif m := re.match(r'^!\[([^\]]*)\]\(([^)]+)\)\s*$', ln):
            flush()
            alt, src = m.group(1), m.group(2)
            out.append(f'<figure><a href="{html.escape(src, True)}"><img src="{html.escape(src, True)}" alt="{html.escape(alt, True)}" '
                       f'loading="lazy"></a><figcaption>{html.escape(alt)}</figcaption></figure>')
        elif ln.startswith('|'):
            flush()
            rows = []
            while i < len(lines) and lines[i].startswith('|'):
                rows.append([c.strip() for c in lines[i].strip().strip('|').split('|')])
                i += 1
            i -= 1
            head, body = rows[0], [r for r in rows[1:] if not re.match(r'^:?-+:?$', r[0] or '-')]
            t = '<div class="tbl"><table><thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in head) + '</tr></thead><tbody>'
            t += ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in body)
            out.append(t + '</tbody></table></div>')
        elif ln.startswith('- '):
            flush()
            items = []
            while i < len(lines) and (lines[i].startswith('- ') or (lines[i].startswith('  ') and items)):
                if lines[i].startswith('- '):
                    items.append(lines[i][2:].strip())
                else:
                    items[-1] += ' ' + lines[i].strip()
                i += 1
            i -= 1
            out.append('<ul>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + '</ul>')
        elif not ln.strip():
            flush()
        elif ln.startswith('*') and ln.endswith('*') and not out[1:] and not lead:
            lead = ln
            out.append(f'<p class="lead">{inline(ln)}</p>')
        else:
            para.append(ln.strip())
        i += 1
    flush()
    return title, toc, out


def page(md_path, lang):
    title, toc, body = convert(open(md_path, encoding='utf-8').read())
    nav = '<nav class="toc"><strong>{}</strong><ul>{}</ul></nav>'.format(
        'Sommaire' if lang == 'fr' else 'Contents',
        ''.join(f'<li><a href="#{sid}">{txt}</a></li>' for n, sid, txt in toc if n == 2))
    # sommaire après l'introduction (titre et ligne d'en-tête)
    k = next((j for j, b in enumerate(body) if b.startswith('<h2')), len(body))
    body = body[:k] + [nav] + body[k:]
    # menu de langue (en plus du lien de la ligne d'en-tête) : page de l'autre langue
    opts = ''.join(f'<option value="installation.{c}.html"{" selected" if c == lang else ""}>{n}</option>'
                   for c, n in (('fr', 'Français'), ('en', 'English')))
    bar = (f'<div class="langbar"><label for="lang">{"Langue" if lang == "fr" else "Language"}</label>'
           f'<select id="lang" onchange="location.href=this.value">{opts}</select></div>')
    body = [bar] + body
    return (f'<!doctype html>\n<html lang="{lang}">\n<head>\n<meta charset="utf-8">\n'
            f'<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>{html.escape(re.sub(r" — .*", "", title))}</title>\n'
            f'<style>{CSS}</style>\n</head>\n<body>\n<main>\n' + '\n'.join(body) + '\n</main>\n</body>\n</html>\n')


if __name__ == '__main__':
    for lang in ('fr', 'en'):
        LANG = lang
        src = os.path.join(HERE, f'installation.{lang}.md')
        dst = os.path.join(HERE, f'installation.{lang}.html')
        open(dst, 'w', encoding='utf-8', newline='\n').write(page(src, lang))
        print(dst)
