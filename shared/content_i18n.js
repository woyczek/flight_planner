// Shared live translation binding. Source strings never depend on current DOM language.
window.RepositoryContentI18n = function(rows) {
  const languages=['fr','en','de','es'], index=new Map(), records=new WeakMap();
  rows.forEach(row=>row.forEach(value=>{if(value&&!index.has(value))index.set(value,row)}));
  // Zones non traduites : code, saisie, [data-no-i18n] (textes déjà composés dans la langue courante), outils de
  // l'en-tête et des blocs (traduits par le menu). Un conteneur [data-i18n] placé dans ces outils (ex. options de
  // page rangées dans le menu ☰) est de nouveau traduit.
  const excluded=el=>{const x=el?.closest('script,style,textarea,pre,[contenteditable],[data-no-i18n],.repo-header-tools,.repo-block-tools');if(!x)return false;const opt=el.closest('[data-i18n]');return !(opt&&x.contains(opt)&&!opt.closest('[data-no-i18n]'))};
  let observer, pending=false;
  // Typographie de la langue affichée, appliquée à l'affichage (nœuds texte et attributs), jamais aux sources où
  // le texte côtoie du code : voir RepositoryContentI18n.typography plus bas.
  const frTypo=(value,lang,el)=>!value||el?.closest?.('code,kbd,samp')?value:window.RepositoryContentI18n.typography(value,lang);
  function translate(value, owner, key, lang) {
    let all=records.get(owner);if(!all){all={};records.set(owner,all)}
    let rec=all[key];
    if(!rec||value!==rec.last){const normalized=value.trim().replace(/\s+/g,' ');let row=index.get(normalized),tail='';if(!row){const source=[...index.keys()].filter(item=>(item.length>=8||/[.:→]$/.test(item))&&normalized.startsWith(item+' ')).sort((a,b)=>b.length-a.length)[0];if(source){row=index.get(source);tail=normalized.slice(source.length)}}if(!row)return value;rec=all[key]={row,tail,prefix:value.match(/^\s*/)[0],suffix:value.match(/\s*$/)[0]}}
    rec.last=rec.prefix+(rec.row[languages.indexOf(lang)]||rec.row[1])+rec.tail+rec.suffix;
    return rec.last;
  }
  function apply(){
    observer?.disconnect();
    const lang=window.RepositoryNav?.getLanguage()||'en';
    try {
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
      while(node=walker.nextNode()){const el=node.parentElement;if(el?.closest('script,style,textarea,pre,[contenteditable]'))continue;/* outils d'en-tête / de bloc : typographie seule (traduits par le menu) */const next=frTypo(excluded(el)?node.nodeValue:translate(node.nodeValue,node,'text',lang),lang,el);if(next!==node.nodeValue)node.nodeValue=next}
      document.querySelectorAll('[title],[placeholder],[aria-label]').forEach(el=>{if(excluded(el.tagName==='TEXTAREA'?el.parentElement:el))return; /* attributs d'une zone de texte traduits, son contenu non */for(const key of ['title','placeholder','aria-label']){const value=el.getAttribute(key);if(value!==null){const next=frTypo(translate(value,el,key,lang),lang,el);if(next!==value)el.setAttribute(key,next)}}});
      document.querySelectorAll('input[readonly][value]').forEach(el=>{if(excluded(el))return;const value=el.value,next=translate(value,el,'value',lang);if(next!==value)el.value=next});
    } finally {observer?.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label']})}
  }
  observer=new MutationObserver(()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;apply()})}});
  window.addEventListener('repository-language-change',apply);apply();
};
// Typographie d'une chaîne selon la langue :
//  - fr : espace fine insécable (U+202F) avant « : ; ! ? » » et après « « », à la place d'une espace simple ou
//    insécable — sans elle, le retour à la ligne peut rejeter la ponctuation en début de ligne ;
//  - en / de / es : pas d'espace avant « : ; ! ? » (textes source français restés tels quels dans une traduction).
window.RepositoryContentI18n.typography=(value,lang)=>{const v=String(value??'');return lang==='fr'
  ? v.replace(/[ \u00A0](?=[:;!?»])/g,'\u202F').replace(/«[ \u00A0]/g,'«\u202F')
  : v.replace(/[ \u00A0\u202F]+(?=[:;!?](?:\s|$))/g,'')};
window.RepositoryContentI18n.frTypo=value=>window.RepositoryContentI18n.typography(value,'fr');
