export const DURATIONS={focus:1500000,short:300000,long:900000};
export function createState(saved,now){
 const valid=saved&&saved.version===1&&Object.hasOwn(DURATIONS,saved.phase)&&Number.isFinite(saved.remaining)&&saved.remaining>=0&&saved.remaining<=DURATIONS[saved.phase]&&Number.isSafeInteger(saved.completed)&&saved.completed>=0;
 return {version:1,phase:valid?saved.phase:'focus',remaining:valid?saved.remaining:DURATIONS.focus,completed:valid?saved.completed:0,status:valid?(saved.remaining===0?'ready':'paused'):'idle',last:now,motion:valid&&Number.isFinite(saved.motion)&&saved.motion>=0?saved.motion:0,visible:valid?saved.visible!==false:true};
}
export function tick(s,now){
 let finished=false;
 const elapsed=now-s.last;s.last=now;
 if(s.status==='running'){
  // A clock discontinuity / long host suspension pauses instead of consuming sleep.
  if(elapsed<0||elapsed>10000){s.status='paused';return;}
  s.remaining=Math.max(0,s.remaining-elapsed);
  if(s.remaining===0){s.status='ready';if(s.phase==='focus')s.completed++;s.motion=0;finished=true;}
 }
 if(s.status!=='paused'&&!finished)s.motion+=Math.max(0,Math.min(1000,elapsed));
}
export function act(s,action,now){tick(s,now);
 if(action==='start'){if(s.status==='ready')return 'Use next before starting.';s.status='running';}
 else if(action==='pause'){if(s.status==='running')s.status='paused';}
 else if(action==='reset'){s.remaining=DURATIONS[s.phase];s.status='idle';s.motion=0;}
 else if(action==='restart'){s.remaining=DURATIONS[s.phase];s.status='running';s.motion=0;}
 else if(action==='next'){if(s.phase==='focus'&&s.status!=='ready')return 'Complete focus before next.';s.phase=s.phase==='focus'?(s.completed%4===0?'long':'short'):'focus';s.remaining=DURATIONS[s.phase];s.status='idle';s.motion=0;}
 else if(action==='hide'){s.visible=false;if(s.status==='running')s.status='paused';}
 else if(action==='show')s.visible=true;
 return null;
}
export function snapshot(s){return {version:1,phase:s.phase,remaining:s.remaining,completed:s.completed,status:s.remaining===0?'ready':'paused',motion:s.motion,visible:s.visible};}
export function clockText(s){const sec=Math.ceil(s.remaining/1000);return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
