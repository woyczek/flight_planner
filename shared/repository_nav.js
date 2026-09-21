(()=>{
  const cfg=window.REPOSITORY_TREE;if(!cfg)return;
  const script=document.currentScript;
  const root=new URL("../",script.src);
  const rel=decodeURIComponent(location.href.startsWith(root.href)?location.href.slice(root.href.length).split(/[?#]/)[0]:"");
  const page=cfg.pages.find(p=>p.path===rel)||cfg.pages.find(p=>location.pathname.endsWith("/"+p.path));
  const theme=cfg.themes[page?.theme||cfg.defaults.theme]||{};
  const doc=document.documentElement;
  doc.style.setProperty("--repo-bar",theme.bar||"#101319");doc.style.setProperty("--repo-bar-text",theme.barText||"#fff");doc.style.setProperty("--repo-page",theme.page||"#fff");doc.style.setProperty("--repo-accent",theme.accent||"#69a7ff");
  if(theme.favicon&&!document.querySelector('link[rel~="icon"]')){let f=document.createElement("link");f.rel="icon";f.href=new URL(theme.favicon,root).href;document.head.appendChild(f)}
  const grouped=new Map();cfg.pages.forEach(p=>{let bits=(p.menu||p.label).split("/"),group=bits.length>1?bits.shift():"Pages",label=bits.join("/")||p.label;(grouped.get(group)||grouped.set(group,[]).get(group)).push({...p,navLabel:label})});
  const savedLanguage=localStorage.getItem("repositoryLanguageMode")||"auto";
  const detectLanguage=()=>{let x=(navigator.languages?.[0]||navigator.language||"en").slice(0,2).toLowerCase();return ["fr","en","de","es"].includes(x)?x:"en"};
  let language=savedLanguage==="auto"?detectLanguage():savedLanguage;
  const nav=document.createElement("nav");nav.className="repo-nav";nav.setAttribute("aria-label","Navigation du repository");
  nav.innerHTML=`<span class="repo-home">X‑Plane Tools</span><span class="repo-page-title">${escapeHtml(page?.label||document.title)}</span><span class="repo-spacer"></span><select class="repo-language" aria-label="Language"><option value="auto">Auto</option><option value="en">EN</option><option value="fr">FR</option><option value="de">DE</option><option value="es">ES</option></select><span class="repo-menu-wrap"><button class="repo-menu-button" type="button" aria-label="Menu" aria-expanded="false">☰</button><span class="repo-menu" hidden></span></span>`;
  const menu=nav.querySelector(".repo-menu"),languageSelect=nav.querySelector(".repo-language");languageSelect.value=savedLanguage;
  for(const [group,pages] of grouped){let target=menu;if(group!=="Pages"){let details=document.createElement("details");details.className="repo-tree-group";details.open=pages.some(p=>p.path===page?.path);details.innerHTML=`<summary>${escapeHtml(group)}</summary>`;menu.append(details);target=details}pages.forEach(p=>{let href=new URL(p.path,root).href;target.insertAdjacentHTML("beforeend",`<a class="repo-link ${p.path===page?.path?"active":""} ${group!=="Pages"?"repo-sub":""}" href="${href}">${escapeHtml(p.navLabel)}</a>`)})}
  menu.insertAdjacentHTML("beforeend",'<div class="repo-page-actions"></div>');
  const button=nav.querySelector(".repo-menu-button");button.onclick=e=>{e.stopPropagation();menu.hidden=!menu.hidden;button.setAttribute("aria-expanded",String(!menu.hidden))};document.addEventListener("click",e=>{if(!nav.contains(e.target)){menu.hidden=true;button.setAttribute("aria-expanded","false")}});
  function applyLanguage(){language=savedLanguage==="auto"?detectLanguage():savedLanguage;document.documentElement.lang=language;window.dispatchEvent(new CustomEvent("repository-language-change",{detail:{language,mode:savedLanguage}}))}
  languageSelect.onchange=()=>{localStorage.setItem("repositoryLanguageMode",languageSelect.value);location.reload()};
  document.body.style.backgroundColor=theme.page||"";document.body.prepend(nav);window.RepositoryNav={root,page,menu,getLanguage:()=>language,addAction(label,handler,opts={}){let host=menu.querySelector(".repo-page-actions");if(!host.children.length)host.insertAdjacentHTML("beforeend",'<div class="repo-sep"></div><div class="repo-group">Page courante</div>');let b=document.createElement("button");b.type="button";b.className="repo-action";b.textContent=label;b.onclick=()=>{menu.hidden=true;handler(b)};host.appendChild(b);return b},setTheme(name){let t=cfg.themes[name];if(!t)return;doc.style.setProperty("--repo-bar",t.bar);doc.style.setProperty("--repo-bar-text",t.barText);doc.style.setProperty("--repo-page",t.page);doc.style.setProperty("--repo-accent",t.accent);document.body.style.backgroundColor=t.page}};
  applyLanguage();window.dispatchEvent(new CustomEvent("repository-nav-ready",{detail:window.RepositoryNav}));
  function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
})();
