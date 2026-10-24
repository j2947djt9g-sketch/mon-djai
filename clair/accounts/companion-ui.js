  /* Short-lived mascot messages are scoped to the current account and session. */
  let companionSpeech={owner:null,message:'',until:0},companionTimer=null;
  const companionWelcomed=new Set();
  function companionOwner(){return cloud.enabled?(cloud.user?.id||'signed-out'):'local';}
  function syncCompanionOwner(){const owner=companionOwner();if(owner!==companionSpeech.owner){clearTimeout(companionTimer);companionSpeech={owner,message:'',until:0};}}
  function companionContext(){const b=E.balance(data),r=E.reserve(data);const c=balanceCompanion(b,b-r.cents,r.cents,data.setupDone);return {negative:'Faisons le point ensemble.',zero:'Ton solde est à zéro.',setup:'Personnalise tes habitudes.',shortfall:'Un manque reste à prévoir.',committed:'Tes paiements sont couverts.',unreserved:'Aucune dépense prévue.',covered:'Tu gardes une marge.'}[c.state]||'Ton budget, à ton rythme.';}
  function hideCompanionSpeech(){clearTimeout(companionTimer);companionSpeech.until=0;const bubble=$('#companion-speech');if(bubble)bubble.hidden=true;const button=$('[data-action="companion-speak"]');button?.setAttribute?.('aria-expanded','false');}
  function paintCompanionSpeech(){
    const bubble=$('#companion-speech'),button=$('[data-action="companion-speak"]');if(!bubble||!button)return;
    const visible=companionSpeech.until>Date.now()&&!modal&&!$('#welcome')?.open&&page==='home'&&data.initialized;
    bubble.textContent=companionSpeech.message;bubble.hidden=!visible;button.setAttribute?.('aria-expanded',String(visible));
  }
  function sayCompanion(message){
    syncCompanionOwner();if(page!=='home'||!data.initialized||loadError||document.hidden||startupController?.active!==false)return;
    companionSpeech.message=message;companionSpeech.until=Date.now()+5000;clearTimeout(companionTimer);paintCompanionSpeech();
    const owner=companionSpeech.owner;companionTimer=setTimeout(()=>{if(companionSpeech.owner===owner)hideCompanionSpeech();},5000);
  }
  function refreshCompanion(){
    syncCompanionOwner();if(page!=='home'||!data.initialized){hideCompanionSpeech();return;}
    if(startupController?.active===false&&!modal&&!$('#welcome')?.open&&!document.hidden&&!companionWelcomed.has(companionSpeech.owner)){
      companionWelcomed.add(companionSpeech.owner);const next=dueSoon()[0];
      sayCompanion(next?'Un paiement arrive bientôt.':companionContext());
    }else paintCompanionSpeech();
  }
  function replayCompanion(){sayCompanion(companionSpeech.message||companionContext());}
