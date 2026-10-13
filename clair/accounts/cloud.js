/* Clair account sync. Supabase JS 2.102.0. No service-role key belongs here. */
(function(root){
  'use strict';
  class ClairCloud {
    constructor(config, hooks, sdk=root.supabase){
      this.config=config;this.hooks=hooks;this.enabled=!!config;this.user=null;
      this.client=null;this.ready=!this.enabled;this.status=this.enabled?'loading':'local';
      this.record=null;this.conflict=null;this.busy=false;this.timer=null;this.epoch=0;
      this.displayName='';this.error='';this.disposed=false;
      if(this.enabled){
        if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.url)||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.key))throw Error('Configuration des comptes invalide.');
        this.client=sdk.createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'clair-account-session-v1'}});
      }
    }
    key(uid=this.user?.id){return uid?'clair-account-budget-v1-'+uid:null;}
    emit(){this.hooks.status?.(this);}
    decode(raw,uid){
      if(!raw)return null;const value=JSON.parse(raw),m=value._cloud;
      if(!m||m.userId!==uid||!Number.isSafeInteger(m.revision)||m.revision<0||typeof m.dirty!=='boolean'||typeof m.operationId!=='string')throw Error('La copie locale du compte est invalide. Elle est conservée.');
      const payload={...value};delete payload._cloud;
      return {payload:this.hooks.normalize(payload),meta:m};
    }
    pack(payload){
      if(!this.user)throw Error('Connecte-toi pour enregistrer dans ton compte.');
      const meta={userId:this.user.id,revision:this.record?.meta.revision||0,dirty:true,operationId:crypto.randomUUID()};
      return JSON.stringify({...payload,_cloud:meta});
    }
    saved(raw){this.record=this.decode(raw,this.user.id);this.status='pending';this.emit();this.schedule();}
    schedule(){clearTimeout(this.timer);if(this.user&&!this.conflict&&!this.disposed)this.timer=setTimeout(()=>this.sync(),900);}
    async init(){
      if(!this.enabled)return;
      this.client.auth.onAuthStateChange((event,session)=>{
        if(event==='PASSWORD_RECOVERY')this.hooks.recovery?.();
        if(event==='SIGNED_OUT'||(session?.user.id&&session.user.id!==this.user?.id))setTimeout(()=>this.attach(session?.user||null),0);
      });
      const {data,error}=await this.client.auth.getSession();
      if(error){this.error='La session n’a pas pu être restaurée.';this.ready=true;this.status='signed-out';this.emit();return;}
      await this.attach(data.session?.user||null);
    }
    async attach(user){
      if(user?.id===this.user?.id&&this.ready)return;
      const epoch=++this.epoch;clearTimeout(this.timer);this.record=null;this.conflict=null;this.error='';this.ready=false;this.user=user;
      if(!user){this.status='signed-out';this.ready=true;this.hooks.leave?.();this.emit();return;}
      this.displayName=String(user.user_metadata?.display_name||'').slice(0,64);
      this.status='loading';this.emit();
      try{
        this.hooks.enter?.(user,null);
        this.record=this.decode(localStorage.getItem(this.key()),user.id);
        this.hooks.enter?.(user,this.record);
        this.ready=true;
        await this.sync(epoch);
        if(epoch!==this.epoch)return;
        if(!this.record&&!this.conflict&&this.status==='synced')this.hooks.empty?.(user);
      }catch(error){if(epoch!==this.epoch)return;this.hooks.badCache?.(error,localStorage.getItem(this.key()));this.error=error.message;this.status='error';this.ready=true;this.emit();}
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
      if(!this.enabled||!this.user||this.busy||this.conflict||this.disposed)return;
      this.busy=true;const userId=this.user.id;
      try{
        if(navigator.onLine===false)throw Error('offline');
        const remote=await this.read();if(expectedEpoch!==this.epoch)return;
        const raw=localStorage.getItem(this.key(userId));this.record=this.decode(raw,userId);
        if(this.record?.meta.dirty){
          const pending=this.record;
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
        this.status=navigator.onLine===false?'offline':'error';
        this.error=this.status==='offline'?'Tes modifications restent sur cet appareil.':'Synchronisation indisponible. Tes modifications restent sur cet appareil.';this.emit();
      }finally{this.busy=false;if(expectedEpoch!==this.epoch&&this.user)this.schedule();}
    }
    setConflict(remote){
      this.conflict={remote};this.status='conflict';this.error='Deux appareils ont modifié ton budget. Choisis la copie à conserver.';this.emit();
    }
    resolve(useRemote){
      if(!this.conflict)return;
      if(useRemote){
        if(!this.conflict.remote)throw Error('Aucune copie en ligne n’est disponible.');
        this.adopt(this.conflict.remote);return;
      }
      // The conflict UI exports the device copy before asking the user to choose.
      this.record.meta.revision=this.conflict.remote?.revision||0;this.record.meta.operationId=crypto.randomUUID();this.record.meta.dirty=true;
      const raw=JSON.stringify({...this.record.payload,_cloud:this.record.meta});localStorage.setItem(this.key(),raw);this.conflict=null;this.hooks.apply?.(this.record.payload,raw);this.status='pending';this.emit();this.schedule();
    }
    async logout(){
      if(this.record?.meta.dirty){await this.sync();if(this.record?.meta.dirty)throw Error('Enregistre les modifications en ligne avant de te déconnecter, ou exporte une sauvegarde.');}
      const uid=this.user?.id;const {error}=await this.client.auth.signOut({scope:'local'});if(error)throw Error('Déconnexion indisponible. Réessaie.');
      if(uid)localStorage.removeItem(this.key(uid));await this.attach(null);
    }
  }
  root.ClairCloud=ClairCloud;
})(window);
