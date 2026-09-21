// Shared live translation binding. Source strings never depend on current DOM language.
window.RepositoryContentI18n = function(rows) {
  const languages=['fr','en','de','es'], index=new Map(), records=new WeakMap();
  rows.forEach(row=>row.forEach(value=>{if(value&&!index.has(value))index.set(value,row)}));
  const excluded=el=>el?.closest('script,style,textarea,pre,[contenteditable],.repo-header-tools,.repo-block-tools');
  let observer, pending=false;
  function translate(value, owner, key, lang) {
    let all=records.get(owner);if(!all){all={};records.set(owner,all)}
    let rec=all[key];
    if(!rec||value!==rec.last){const row=index.get(value.trim());if(!row)return value;rec=all[key]={row,prefix:value.match(/^\s*/)[0],suffix:value.match(/\s*$/)[0]}}
    rec.last=rec.prefix+(rec.row[languages.indexOf(lang)]||rec.row[1])+rec.suffix;
    return rec.last;
  }
  function apply(){
    observer?.disconnect();
    const lang=window.RepositoryNav?.getLanguage()||'en';
    try {
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
      while(node=walker.nextNode()){if(excluded(node.parentElement))continue;const next=translate(node.nodeValue,node,'text',lang);if(next!==node.nodeValue)node.nodeValue=next}
      document.querySelectorAll('[title],[placeholder],[aria-label]').forEach(el=>{if(excluded(el))return;for(const key of ['title','placeholder','aria-label']){const value=el.getAttribute(key);if(value!==null){const next=translate(value,el,key,lang);if(next!==value)el.setAttribute(key,next)}}});
    } finally {observer?.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label']})}
  }
  observer=new MutationObserver(()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;apply()})}});
  window.addEventListener('repository-language-change',apply);apply();
};
