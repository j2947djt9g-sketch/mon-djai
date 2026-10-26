/* Installation belongs to the masterboard, independently of Clair's own app. */
(function(){
 'use strict';
 const dialog=document.querySelector('#install-dialog'),instructions=document.querySelector('#install-instructions'),now=document.querySelector('#install-now'),status=document.querySelector('#install-status');
 const displayMode=matchMedia('(display-mode: standalone)');
 let deferredPrompt=null,busy=false,installationRequested=false;
 const inApp=()=>Boolean(navigator.standalone||displayMode.matches);
 const ios=/iPad|iPhone|iPod/i.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
 const android=/Android/i.test(navigator.userAgent);
 const safari=/Safari/i.test(navigator.userAgent)&&!/Chrome|Chromium|Edg|OPR|CriOS|FxiOS/i.test(navigator.userAgent);
 function render(){
  const installed=inApp();
  document.querySelectorAll('[data-install]').forEach(button=>{button.hidden=installed||installationRequested;button.disabled=busy;});
  document.querySelectorAll('[data-install-description]').forEach(node=>{node.textContent=installed?'Le masterboard est ouvert comme une application.':installationRequested?'L’installation a été demandée. Retrouve l’icône Clair Admin sur ton appareil.':'Ajoute-le à ton écran d’accueil ou ouvre-le dans sa propre fenêtre sur ordinateur.';});
  now.hidden=!deferredPrompt||installed||installationRequested;
  now.disabled=busy;
 }
 function showInstructions(){
  if(ios){
   instructions.innerHTML='<ol class="install-steps"><li><span>Ouvre cette page dans <strong>Safari</strong>.</span></li><li><span>Ouvre <strong>Partager</strong>, directement ou depuis le menu de la page.</span></li><li><span>Choisis <strong>Sur l’écran d’accueil</strong>, puis active <strong>Ouvrir comme app web</strong> si proposé.</span></li><li><span>Appuie sur <strong>Ajouter</strong>.</span></li></ol>';
  }else if(android){
   instructions.innerHTML='<ol class="install-steps"><li><span>Ouvre cette page dans <strong>Chrome</strong>.</span></li><li><span>Ouvre le menu <strong>⋮</strong> en haut à droite.</span></li><li><span>Choisis <strong>Ajouter à l’écran d’accueil</strong> ou <strong>Installer l’application</strong>, puis confirme.</span></li></ol>';
  }else if(safari){
   instructions.innerHTML='<ol class="install-steps"><li><span>Dans Safari sur Mac, ouvre le menu <strong>Fichier</strong>.</span></li><li><span>Choisis <strong>Ajouter au Dock</strong>, puis confirme avec <strong>Ajouter</strong>.</span></li></ol><p class="install-tip">Si cette option est absente, essaie depuis Chrome ou Edge.</p>';
  }else{
   instructions.innerHTML='<ol class="install-steps"><li><span>Ouvre le masterboard dans <strong>Chrome ou Edge</strong>.</span></li><li><span>Clique sur l’icône <strong>Installer</strong> dans la barre d’adresse, si elle apparaît.</span></li><li><span>Sinon, ouvre le menu <strong>⋮</strong> ou <strong>…</strong> et cherche <strong>Installer cette page comme application</strong> ou <strong>Applications</strong>.</span></li></ol><p class="install-tip">Le nom de la commande dépend du navigateur. Tu peux aussi continuer à utiliser le masterboard dans cet onglet.</p>';
  }
 }
 async function requestInstall(){
  if(busy||inApp()||installationRequested)return;
  status.textContent='';showInstructions();if(!dialog.open)dialog.showModal();render();
  if(!deferredPrompt)return;
  const prompt=deferredPrompt;deferredPrompt=null;busy=true;render();
  try{
   await prompt.prompt();
   const choice=await prompt.userChoice;
   if(choice.outcome==='accepted'){
    installationRequested=true;
    status.textContent='Installation demandée. Ton appareil prépare l’icône Clair Admin.';
   }else status.textContent='Installation annulée. Tu peux réessayer plus tard ou suivre les étapes ci-dessus.';
  }catch{
   status.textContent='La fenêtre d’installation n’a pas pu s’ouvrir. Suis les étapes ci-dessus.';
  }finally{busy=false;render();}
 }
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;render();});
 window.addEventListener('appinstalled',()=>{deferredPrompt=null;installationRequested=true;status.textContent='Installation demandée. Retrouve Clair Admin sur ton appareil.';render();});
 displayMode.addEventListener('change',render);
 document.querySelectorAll('[data-install]').forEach(button=>button.addEventListener('click',requestInstall));
 now.addEventListener('click',requestInstall);
 document.querySelector('#close-install').addEventListener('click',()=>dialog.close());
 render();
 if('serviceWorker' in navigator&&window.isSecureContext){
  navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{
   document.querySelectorAll('[data-install-feedback]').forEach(node=>{node.textContent='L’installation automatique est indisponible. Le bouton affiche aussi les étapes du navigateur.';});
  });
 }
})();
