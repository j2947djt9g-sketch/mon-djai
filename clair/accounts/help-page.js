(function(){
 'use strict';
 const $=s=>document.querySelector(s),form=$('#help-form');let busy=false;
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;busy=true;const button=form.querySelector('button');button.disabled=true;$('#help-error').textContent='';
  try{
   const res=await fetch('https://hkssnbvktfscizojhftl.supabase.co/functions/v1/clair-account-help',{method:'POST',headers:{'content-type':'application/json',apikey:'sb_publishable_qJeSyD7E0cbi8V--qyJJkw_8M4oOKr8'},body:JSON.stringify({email:$('#help-email').value.trim(),reason:$('#help-reason').value,website:$('#help-website').value}),signal:AbortSignal.timeout(15000)});
   const result=await res.json();if(!res.ok)throw Error(result.error||'Demande indisponible.');
   $('#help-entry').hidden=true;$('#help-success').hidden=false;$('#help-success').tabIndex=-1;$('#help-success').focus();
  }catch(error){$('#help-error').textContent=error.name==='TypeError'?'Vérifie ta connexion, puis réessaie.':error.message;}
  finally{busy=false;button.disabled=false;}
 });
})();