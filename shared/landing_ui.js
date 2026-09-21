(()=>{
  if(!window.RepositoryNav)return;
  const button=document.getElementById("optionsButton"),menu=document.getElementById("optionsMenu"),host=RepositoryNav.menu.querySelector(".repo-page-actions");
  if(button)button.style.display="none";
  const syncLanguage=e=>{languageMode=e.detail?.mode==="auto"?"auto":(e.detail?.language||RepositoryNav.getLanguage());applyLanguage()};window.addEventListener("repository-language-change",syncLanguage);syncLanguage({detail:{language:RepositoryNav.getLanguage(),mode:localStorage.getItem("repositoryLanguageMode")||"auto"}});
  if(menu&&host){host.insertAdjacentHTML("beforeend",'<div class="repo-sep"></div><div class="repo-group">Options de l’analyse</div>');menu.hidden=false;menu.style.position="static";menu.style.display="block";menu.style.width="auto";menu.style.minWidth="0";menu.style.maxHeight="none";menu.style.boxShadow="none";menu.style.border="0";menu.style.background="transparent";host.append(menu);closeOptionsMenu=function(){menu.hidden=false}}
  RepositoryNav.addAction("Choisir les fichiers CSV / LOG",()=>document.getElementById("fileButton")?.click());
  RepositoryNav.addAction("Imprimer / PDF",()=>document.getElementById("printBtn")?.click());
})();
