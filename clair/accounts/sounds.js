  /* Device-local feedback. Audio is unlocked only by an explicit interaction. */
  function createSoundFeedback(scope, storage, visible) {
    const storageKey='clair-sounds-v1',voices=new Set();
    let enabled=true,context=null,ready=Promise.resolve(false),generation=0,intentUntil=0,lastSelection=-Infinity;
    const now=()=>scope.performance?.now?.()??Date.now();
    const supported=()=>typeof (scope.AudioContext||scope.webkitAudioContext)==='function';
    const allowed=()=>enabled&&visible();
    function stopVoices(){for(const voice of [...voices]){try{voice.osc.stop();}catch{}try{voice.osc.disconnect();voice.gain.disconnect();}catch{}voices.delete(voice);}}
    function pause(){generation++;intentUntil=0;stopVoices();}
    function refresh(){try{enabled=storage.getItem(storageKey)!=='off';}catch{enabled=false;}if(!enabled)pause();}
    refresh();
    function setEnabled(value){enabled=Boolean(value);pause();try{storage.setItem(storageKey,enabled?'on':'off');return true;}catch{return false;}}
    function unlock(){
      if(!allowed()||!supported())return Promise.resolve(false);
      try{
        if(!context||context.state==='closed'){const Audio=scope.AudioContext||scope.webkitAudioContext;context=new Audio({latencyHint:'interactive'});}
        return (context.state==='running'?Promise.resolve():Promise.resolve(context.resume())).then(()=>context.state==='running').catch(()=>false);
      }catch{return Promise.resolve(false);}
    }
    function tone(frequency,start,duration,level,endFrequency=frequency){
      const osc=context.createOscillator(),gain=context.createGain(),voice={osc,gain};voices.add(voice);
      osc.type='sine';osc.frequency.setValueAtTime(frequency,start);osc.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(level,start+.004);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      osc.connect(gain);gain.connect(context.destination);
      osc.onended=()=>{voices.delete(voice);try{osc.disconnect();gain.disconnect();}catch{}};
      osc.start(start);osc.stop(start+duration+.01);
    }
    function play(kind,fromGesture=false){
      if(!allowed())return Promise.resolve(false);
      if(fromGesture)ready=unlock();
      const ticket=++generation;
      return ready.then(ok=>{
        if(!ok||ticket!==generation||!allowed()||context?.state!=='running')return false;
        stopVoices();const start=context.currentTime+.004;
        if(kind==='selection')tone(680,start,.045,.035,510);
        else{tone(660,start,.065,.035);tone(880,start+.075,.11,.04);}
        return true;
      }).catch(()=>{stopVoices();return false;});
    }
    function selection(){intentUntil=0;const time=now();if(time-lastSelection<45)return Promise.resolve(false);lastSelection=time;return play('selection',true);}
    function saveIntent(){intentUntil=allowed()?now()+2000:0;ready=unlock();}
    function saved(){const active=intentUntil>0&&now()<=intentUntil;intentUntil=0;return active?play('saved'):Promise.resolve(false);}
    function preview(){intentUntil=0;return play('saved',true);}
    return {storageKey,supported,enabled:()=>enabled,setEnabled,refresh,pause,selection,saveIntent,saved,preview,cancelSave:()=>{intentUntil=0;}};
  }
