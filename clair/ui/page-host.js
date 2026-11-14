// Own only the currently visible page. No inactive/private view cache.
function createPageHost(){
 let current=null;
 function dispose(){if(!current)return;const previous=current;current=null;previous.view.dispose?.();}
 return {dispose,show(host,view,context){
  if(!current||current.owner!==context.owner||current.page!==context.page||current.view!==view){
   dispose();view.mount(host,context);current={owner:context.owner,page:context.page,view,inputs:context.inputs};return;
  }
  if(current.inputs===context.inputs)return;
  view.update(context);current.inputs=context.inputs;
 }};
}
