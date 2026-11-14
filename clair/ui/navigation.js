function selectedPrimary(page){return ['rules','budget'].includes(page)?'settings':page;}
function renderDesktopNavigation(host,items,page,icon){
 const selected=selectedPrimary(page);
 for(const item of items){
  let button=host.querySelector('[data-nav="'+item.id+'"]');
  if(!button){button=document.createElement('button');button.dataset.nav=item.id;host.appendChild(button);}
  const markup='<span aria-hidden="true">'+icon(item.icon)+'</span>'+item.label;
  if(button.innerHTML!==markup)button.innerHTML=markup;
  button.classList.toggle('active',selected===item.id);
  if(selected===item.id)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
 }
}
