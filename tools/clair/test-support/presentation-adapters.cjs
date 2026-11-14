// String-only VM fixtures do not implement a browser DOM. Keep their legacy
// handler assertions; verify-render-lifecycle exercises the real DOM adapters.
module.exports=`
if(typeof renderDesktopNavigation!=='function'||typeof createPageHost!=='function'||typeof createJournalController!=='function'||typeof reconcileJournalRows!=='function')throw Error('Missing canonical UI lifecycle module');
// The VM page node stores markup only; model the native clearing operation.
if(typeof $('#page').replaceChildren!=='function')$('#page').replaceChildren=function(){this.innerHTML=''};
renderDesktopNavigation=(host,items,page,icon)=>{host.innerHTML=items.map(n=>'<button data-nav="'+n.id+'" class="'+(selectedPrimary(page)===n.id?'active':'')+'">'+icon(n.icon)+n.label+'</button>').join('')};
reconcileJournalRows=(host,list)=>{host.innerHTML=list.map(t=>txRow(t)).join('')};
simplePageView.update=context=>{$('#page').innerHTML=context.markup()};
settingsPageView.update=context=>{$('#page').innerHTML=context.markup()};
journalPageView.update=()=>{$('#page').innerHTML=journal();journalResults()};
`;
