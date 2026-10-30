/* Clair account sync. Supabase JS 2.102.0. No service-role key belongs here. */
(function(root){
  'use strict';
  class ClairCloud {
    constructor(config, hooks, sdk=root.supabase){
      this.config=config;this.hooks=hooks;this.enabled=!!config;this.user=null;
      this.client=null;this.ready=!this.enabled;this.status=this.enabled?'loading':'local';
      this.record=null;this.conflict=null;this.busy=false;this.timer=null;this.epoch=0;this.authTransition=null;
      this.displayName='';this.error='';this.disposed=false;this.access='unknown';this.accessGeneration=0;
      if(this.enabled){
        if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.url)||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.key))throw Error('Configuration des comptes invalide.');
        this.client=sdk.createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'clair-account-session-v1'}});
      }
    }
    key(uid=this.user?.id){return uid?'clair-account-budget-v1-'+uid:null;}
    emit(){this.hooks.status?.(this);}
    accessError(){return this.access==='suspended'?'Compte suspendu. Paie ton abonnement pour continuer.':'Connexion nécessaire pour vérifier l’accès à ton compte avant de modifier ton budget.';}
    async checkAccess(){
      if(!this.enabled)return true;
      if(!this.user||this.authTransition!==null)throw Error('Connecte-toi pour modifier ton budget.');
      if(navigator.onLine===false){if(this.access!=='suspended')this.access='unknown';throw Error(this.accessError());}
      const epoch=this.epoch,uid=this.user.id,generation=++this.accessGeneration;
      if(this.access!=='suspended')this.access='unknown';
      let timeout;
      try{
        const {data,error}=await Promise.race([this.client.rpc('clair_account_active',{}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Access verification timeout')),12000);})]);
        if(epoch!==this.epoch||uid!==this.user?.id||this.authTransition!==null)throw Error('La session a changé. Vérifie ton compte puis réessaie.');
        if(generation!==this.accessGeneration)return this.access==='active';
        if(error||typeof data!=='boolean')throw Error(this.accessError());
        const restored=this.access==='suspended';this.access=data?'active':'suspended';
        try{const key='clair-account-access-v1-'+uid;if(data)localStorage.removeItem(key);else localStorage.setItem(key,'suspended');}catch{}
        if(!data){clearTimeout(this.timer);this.status='suspended';this.error=this.accessError();}
        else if(restored){this.status=this.record?.meta.dirty?'pending':'synced';this.error='';}
        this.emit();return data;
      }catch(error){
        if(epoch===this.epoch&&generation===this.accessGeneration&&this.access!=='suspended')this.access='unknown';
        throw error;
      }finally{clearTimeout(timeout);}
    }
    async requireWriteAccess(){
      if(!this.enabled)return;
      const epoch=this.epoch;
      if(!await this.checkAccess())throw Error(this.accessError());
      if(epoch!==this.epoch||this.authTransition!==null)throw Error('La session a changé. Vérifie ton compte puis réessaie.');
    }
    decode(raw,uid){
      if(!raw)return null;const value=JSON.parse(raw),m=value._cloud;
      if(!m||m.userId!==uid||!Number.isSafeInteger(m.revision)||m.revision<0||typeof m.dirty!=='boolean'||typeof m.operationId!=='string')throw Error('La copie locale du compte est invalide. Elle est conservée.');
      const payload={...value};delete payload._cloud;
      return {payload:this.hooks.normalize(payload),meta:m};
    }
    pack(payload){
      if(!this.user||this.authTransition!==null)throw Error('Connecte-toi pour enregistrer dans ton compte.');
      if(this.access!=='active')throw Error(this.accessError());
      const meta={userId:this.user.id,revision:this.record?.meta.revision||0,dirty:true,operationId:crypto.randomUUID()};
      return JSON.stringify({...payload,_cloud:meta});
    }
    saved(raw){this.record=this.decode(raw,this.user.id);this.status='pending';this.emit();this.schedule();}
    schedule(){clearTimeout(this.timer);if(this.user&&!this.conflict&&!this.disposed)this.timer=setTimeout(()=>this.sync(),900);}
    async init(){
      if(!this.enabled)return;
      this.client.auth.onAuthStateChange((event,session)=>{
        if(event==='PASSWORD_RECOVERY'){
          this.hooks.recovery?.(session?.user);
          if(session?.user.id&&session.user.id!==this.user?.id){this.ready=false;this.status='loading';}
          this.emit();
        }
        if(event==='SIGNED_OUT'||(session?.user.id&&session.user.id!==(this.authTransition?this.authTransition.user?.id:this.user?.id))){
          // Invalidate in-flight work now; Auth callbacks must defer their asynchronous work.
          const epoch=++this.epoch;this.authTransition={epoch,user:session?.user||null};clearTimeout(this.timer);this.ready=false;this.status='loading';this.emit();
          setTimeout(()=>{if(this.authTransition?.epoch!==epoch||this.epoch!==epoch)return;return this.attach(this.authTransition.user);},0);
        }
      });
      const authEpoch=this.epoch;
      const {data,error}=await this.client.auth.getSession();
      if(authEpoch!==this.epoch){if(this.authTransition)await this.attach(this.authTransition.user);return;}
      if(error){this.error='La session n’a pas pu être restaurée.';this.ready=true;this.status='signed-out';this.emit();return;}
      await this.attach(data.session?.user||null);
    }
    async attach(user){
      const transitioning=this.authTransition!==null;this.authTransition=null;
      if(!transitioning&&user?.id===this.user?.id&&(this.ready||(this.user&&this.status==='loading')))return;
      const epoch=++this.epoch;clearTimeout(this.timer);this.record=null;this.conflict=null;this.error='';this.ready=false;this.user=user;this.access='unknown';++this.accessGeneration;
      try{if(user&&localStorage.getItem('clair-account-access-v1-'+user.id)==='suspended')this.access='suspended';}catch{}
      if(!user){this.status='signed-out';this.ready=true;this.hooks.leave?.();this.emit();return;}
      this.displayName=String(user.user_metadata?.display_name||'').slice(0,64);
      this.status='loading';this.emit();
      let cachedRaw=null;
      try{
        this.hooks.enter?.(user,null);
        cachedRaw=localStorage.getItem(this.key());
        this.record=this.decode(cachedRaw,user.id);
        this.hooks.enter?.(user,this.record);
        this.ready=true;
        // Auth is ready even while the independent budget request is pending.
        // Recovery can now show its password form without waiting for this sync.
        this.emit();
        await this.sync(epoch);
        if(epoch!==this.epoch)return;
        this.hooks.opened?.();
        if(!this.record&&!this.conflict&&this.status==='synced')this.hooks.empty?.(user);
      }catch(error){if(epoch!==this.epoch)return;this.error=error.message;this.status='error';this.ready=true;this.hooks.badCache?.(error,cachedRaw);this.emit();}
    }
    async read(){
      const {data,error}=await this.client.from('clair_budgets').select('payload,revision,operation_id,display_name,updated_at').eq('user_id',this.user.id).maybeSingle();
      if(error)throw error;return data;
    }
    wire(payload){
      const clean=structuredClone(payload);delete clean._cloud;
      // Keep large wallpaper photos on each device instead of retransmitting them with each purchase.
      if(clean.preferences){clean.preferences.photo=null;if(clean.preferences.wallpaper==='photo')clean.preferences.wallpaper='plain';}
      return clean;
    }
    adopt(row, expectedEpoch=this.epoch){
      if(expectedEpoch!==this.epoch)return;
      const payload=this.hooks.normalize(row.payload);
      if(this.record?.payload.preferences?.photo){payload.preferences.photo=this.record.payload.preferences.photo;if(this.record.payload.preferences.wallpaper==='photo')payload.preferences.wallpaper='photo';}
      const meta={userId:this.user.id,revision:row.revision,dirty:false,operationId:row.operation_id};
      const raw=JSON.stringify({...payload,_cloud:meta});
      localStorage.setItem(this.key(),raw);this.record={payload,meta};this.displayName=row.display_name||this.displayName;this.conflict=null;
      this.status='synced';this.error='';this.hooks.apply?.(payload,raw);this.emit();
    }
    async sync(expectedEpoch=this.epoch){
      if(!this.enabled||!this.user||this.authTransition!==null||this.busy||this.disposed)return;
      this.busy=true;const userId=this.user.id;
      try{
        if(navigator.onLine===false)throw Error('offline');
        if(!await this.checkAccess()||this.conflict)return;
        if(expectedEpoch!==this.epoch)return;
        const remote=await this.read();if(expectedEpoch!==this.epoch)return;
        const raw=localStorage.getItem(this.key(userId));this.record=this.decode(raw,userId);
        // Old clients can strip currency from their cache. Preserve both copies before any write.
        if(remote?.payload?.initialized&&this.record?.payload.initialized&&((remote.payload.currency||'EUR')!==(this.record.payload.currency||'EUR')||(remote.payload.currencyRevision||0)!==(this.record.payload.currencyRevision||0))){if(this.record.meta.dirty)this.setConflict(remote);else this.adopt(remote,expectedEpoch);return;}
        // Older clients remove unknown savings fields while normalizing their cache.
        // Never promote that reduced cache into a replacement for named cloud projects.
        if(remote?.payload?.savingsSchema===1&&raw&&JSON.parse(raw).savingsSchema!==1){
          if(this.record?.meta.dirty)this.setConflict(remote);
          else this.adopt(remote,expectedEpoch);
          return;
        }
        if(this.record?.meta.dirty){
          const pending=this.record;
          if(remote&&JSON.stringify(this.wire(pending.payload))===JSON.stringify(this.wire(this.hooks.normalize(remote.payload)))){this.adopt(remote,expectedEpoch);return;}
          if((remote?.revision||0)!==pending.meta.revision&&remote?.operation_id!==pending.meta.operationId){this.setConflict(remote);return;}
          const {data,error}=await this.client.rpc('save_clair_budget',{p_payload:this.wire(pending.payload),p_expected_revision:pending.meta.revision,p_operation_id:pending.meta.operationId,p_display_name:this.displayName});
          if(expectedEpoch!==this.epoch)return;if(error)throw error;
          if(!data?.saved){this.setConflict(data?.row||null);return;}
          const latest=this.decode(localStorage.getItem(this.key(userId)),userId);
          if(latest?.meta.operationId!==pending.meta.operationId){
            // A new edit arrived while saving. Advance its base revision without replacing the edit.
            if(latest){latest.meta.revision=data.row.revision;localStorage.setItem(this.key(userId),JSON.stringify({...latest.payload,_cloud:latest.meta}));this.record=latest;this.hooks.apply?.(latest.payload,JSON.stringify({...latest.payload,_cloud:latest.meta}));this.status='pending';this.schedule();}
          }else this.adopt(data.row,expectedEpoch);
        }else if(remote){
          if(!this.record||remote.revision!==this.record.meta.revision)this.adopt(remote,expectedEpoch);
          else{this.status='synced';this.error='';this.emit();}
        }else if(this.record?.meta.revision){this.setConflict(null);}
        else{this.status='synced';this.error='';this.emit();}
      }catch(error){
        if(expectedEpoch!==this.epoch)return;
        this.status=this.access==='suspended'?'suspended':navigator.onLine===false?'offline':'error';
        this.error=this.status==='suspended'?this.accessError():this.status==='offline'?'Tes modifications restent sur cet appareil.':'Synchronisation indisponible. Tes modifications restent sur cet appareil.';this.emit();
      }finally{this.busy=false;if(expectedEpoch!==this.epoch&&this.user)this.schedule();}
    }
    setConflict(remote){
      this.conflict={remote};this.status='conflict';this.error='Deux appareils ont modifié ton budget. Choisis la copie à conserver.';this.emit();
    }
    resolve(useRemote){
      if(this.access!=='active')throw Error(this.accessError());
      if(!this.conflict)return;
      if(useRemote){
        if(!this.conflict.remote)throw Error('Aucune copie en ligne n’est disponible.');
        this.adopt(this.conflict.remote);return;
      }
      if(this.conflict.remote?.payload.initialized&&this.record?.payload.initialized&&((this.conflict.remote.payload.currency||'EUR')!==(this.record.payload.currency||'EUR')||(this.conflict.remote.payload.currencyRevision||0)!==(this.record.payload.currencyRevision||0)))throw Error('Les copies utilisent des devises différentes ou une ancienne conversion. Sauvegarde cette copie, puis conserve la copie en ligne.');
      // The conflict UI exports the device copy before asking the user to choose.
      const meta={...this.record.meta,revision:this.conflict.remote?.revision||0,operationId:crypto.randomUUID(),dirty:true};
      // Commit metadata only after persistence succeeds, so a full storage leaves both copies intact.
      const raw=JSON.stringify({...this.record.payload,_cloud:meta});localStorage.setItem(this.key(),raw);this.record={payload:this.record.payload,meta};this.conflict=null;this.hooks.apply?.(this.record.payload,raw);this.status='pending';this.emit();this.schedule();
    }
    async convertCurrency(to,revision,asOf){
      const epoch=this.epoch,startingRaw=this.user?localStorage.getItem(this.key()):null;
      await this.requireWriteAccess();
      if(epoch!==this.epoch)throw Error('Le compte a changé pendant la conversion.');
      if(!this.user||!this.ready||this.busy||this.converting||this.conflict||this.status!=='synced'||this.record?.meta.dirty||this.record?.meta.revision!==revision)throw Error('Synchronise ton budget et recommence l’aperçu.');
      this.converting=true;this.busy=true;this.emit();
      try{
        const {data,error}=await this.client.rpc('convert_clair_currency',{p_currency:to,p_expected_revision:revision,p_operation_id:crypto.randomUUID(),p_as_of:asOf});
        if(epoch!==this.epoch)throw Error('Le compte a changé pendant la conversion.');
        if(error)throw Error(error.message||'Conversion indisponible. Ton budget est conservé.');
        if(!data?.saved){this.setConflict(data?.row||null);throw Error('Un autre appareil a modifié le budget. Vérifie la copie en ligne.');}
        const latestRaw=localStorage.getItem(this.key());
        if(latestRaw!==startingRaw){
          const latest=this.decode(latestRaw,this.user.id);
          if(latest?.meta.dirty){this.record=latest;this.hooks.apply?.(latest.payload,latestRaw);this.setConflict(data.row);throw Error('Un autre onglet a modifié le budget pendant la conversion. Les deux copies sont conservées.');}
          if(latest&&latest.meta.revision>=data.row.revision){this.record=latest;this.status='synced';this.hooks.apply?.(latest.payload,latestRaw);return;}
        }
        this.adopt(data.row,epoch);
      }catch(error){if(epoch===this.epoch&&!this.conflict){this.status='error';this.error='Vérification de la conversion en ligne nécessaire.';this.schedule();}throw error;
      }finally{this.converting=false;this.busy=false;this.emit();}
    }
    async logout(){
      const uid=this.user?.id;
      if(this.record?.meta.dirty){await this.sync();if(this.record?.meta.dirty)throw Error('Enregistre les modifications en ligne avant de te déconnecter, ou exporte une sauvegarde.');}
      if(this.user?.id!==uid||this.authTransition!==null)throw Error('La session a changé. Vérifie le compte avant de te déconnecter.');
      const {error}=await this.client.auth.signOut({scope:'local'});if(error)throw Error('Déconnexion indisponible. Réessaie.');
      // Close authenticated views first, even if the browser refuses cache removal.
      if(this.user?.id===uid&&(!this.authTransition?.user||this.authTransition.user.id===uid))await this.attach(null);
      if(uid)localStorage.removeItem(this.key(uid));
    }
  }
  root.ClairCloud=ClairCloud;
})(window);

