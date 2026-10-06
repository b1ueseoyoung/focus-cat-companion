export function pixelLayout(timer,cat,width,maxRows){
 width=Number.isFinite(width)?Math.max(0,Math.min(512,Math.floor(width))):0;
 const height=Number.isFinite(maxRows)?Math.max(0,Math.floor(maxRows)):0;
 cat.visible=timer.visible;cat.rows=0;cat.columns=0;
 if(!timer.visible||!width||!height)return {mode:'hidden',columns:width,rows:0};
 if(height<CAT_ROWS||width<CAT_WIDTH)return {mode:'timer',columns:width,rows:1,timerText:clockText(timer)};
 const side=width>=CAT_WIDTH+7,lane=side?width-7:width;
 cat.rows=CAT_ROWS;cat.columns=lane;cat.x=Math.max(0,Math.min(lane-CAT_WIDTH,Math.floor(cat.x||0)));
 const raster=pixelRaster(cat,lane);
 return {mode:'raster',columns:width,rows:CAT_ROWS,raster,timerText:side?clockText(timer):null};
}

let timer=null,cat=createCompanion(),timerClock=null,catClock=null,catClockMode=null,catClockTurnId=null,catClockGeneration=0,timerKey=null,sessionId=null,initialized=false,initializing=null,enabled=false,owner=crypto.randomUUID(),runtimeVersion=0,lastTimer='',lastHostTimer='',lastCat='',timerBusy=false,queue=Promise.resolve(),preferencesQueue=Promise.resolve(),runtimeQueue=Promise.resolve(),commitClock=null,claimed=false;
let timerQueue=Promise.resolve(),timerVersion=0,timerEpoch=0;
const redraw=$=>$.ui.invalidate('ui.render');
const selectedCharacter=value=>value==='b'?'b':'a';
const preferenceRecord=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const catData=()=>({version:1,owner,turnId:cat.turnId,active:cat.active,reason:cat.reason,waiting:[...cat.waiting],tools:[...cat.tools],x:cat.x,direction:cat.direction,frame:cat.frame,turnHold:cat.turnHold,reduced:cat.reduced,character:selectedCharacter(cat.character),danceActive:cat.danceActive,danceHeld:cat.danceHeld,danceFrame:cat.danceFrame,completionEligible:cat.completionEligible,lastCompletedTurnId:cat.lastCompletedTurnId});
const identity=()=>({owner,id:sessionId,key:timerKey,timer});
const isCurrent=t=>enabled&&initialized&&t.owner===owner&&t.id===sessionId&&t.timer===timer;
function cancelClocks(){if(catClock)catClock.cancel();if(timerClock)timerClock.cancel();if(commitClock)commitClock.cancel();catClock=null;catClockMode=null;catClockTurnId=null;catClockGeneration++;timerClock=null;commitClock=null;}
// state.get can retain the dispatch's snapshot. The versioned no-op claim is
// the fence that rejects a callback after another module has claimed ownership.
// Store writes already issued to the host are not a multi-key transaction.
async function ownsRuntime($,t=identity()){
 if(!isCurrent(t)||!claimed)return false;
 // runtimeVersion comes only from this module's successful claim/write. An
 // owner getter could still show the pre-claim snapshot in this dispatch.
 return writeCompanionRuntime($,t);
}
function writeCompanionRuntime($,t,{claim=false,version=0,changedOnly=false}={}){
 // Update the successful CAS version before another same-module writer runs.
 // Other modules keep separate queues and must still pass the version fence.
 const work=runtimeQueue.catch(()=>{}).then(async()=>{
  if(!isCurrent(t)||(!claim&&!claimed))return false;
  if(claim&&claimed)return true;
  const value=catData(),signature=JSON.stringify(value);
  if(changedOnly&&signature===lastCat)return true;
  const result=await $.state.set({plugin:'focus-cat-companion',key:'companionRuntime',id:t.id},value,{ifVersion:claim?version:runtimeVersion});
  if(!isCurrent(t)||!result.isSet)return false;
  runtimeVersion=result.version;lastCat=signature;if(claim)claimed=true;return true;
 });
 runtimeQueue=work;return work;
}
function restoreCat(v,reloading=false){if(!v||v.version!==1||typeof v.active!=='boolean')return;cat.turnId=typeof v.turnId==='string'?v.turnId:null;cat.active=v.active;cat.reason=String(v.reason||'idle');cat.waiting=new Set(Array.isArray(v.waiting)?v.waiting.filter(x=>typeof x==='string'):[]);cat.tools=new Map(Array.isArray(v.tools)?v.tools:[]);cat.x=Number.isFinite(v.x)?Math.max(0,v.x):0;cat.direction=v.direction===-1?-1:1;cat.frame=Number.isInteger(v.frame)&&v.frame>=0&&v.frame<CAT_FRAMES?v.frame:0;cat.turnHold=v.turnHold===1?1:0;cat.reduced=v.reduced===true;cat.character=selectedCharacter(v.character);cat.danceActive=!reloading&&v.danceActive===true;cat.danceHeld=!reloading&&v.danceHeld===true;cat.danceFrame=!reloading&&Number.isInteger(v.danceFrame)&&v.danceFrame>=0&&v.danceFrame<DANCE_FRAMES?v.danceFrame:0;cat.lastCompletedTurnId=typeof v.lastCompletedTurnId==='string'?v.lastCompletedTurnId:null;cat.completionEligible=v.completionEligible===true&&cat.lastCompletedTurnId!==cat.turnId&&(!reloading||cat.active);}
function persistCat($){const t=identity();queue=queue.catch(()=>{}).then(()=>writeCompanionRuntime($,t,{changedOnly:true}));return queue;}
function savePreferences($,patch,t=identity()){
 const work=preferencesQueue.catch(()=>{}).then(async()=>{
  if(!await ownsRuntime($,t))return false;
  const previous=preferenceRecord(await $.store.get('companion:preferences'));
  // Fence after the asynchronous read: a replaced owner must not issue a new
  // preference write. An already-issued store.set is not atomically cancelled.
  if(!await ownsRuntime($,t))return false;
  await $.store.set('companion:preferences',{...previous,...patch});
  if(!await ownsRuntime($,t))return false;
  if(Object.prototype.hasOwnProperty.call(patch,'character'))cat.character=selectedCharacter(patch.character);
  if(typeof patch.reduced==='boolean'){cat.reduced=patch.reduced;if(!cat.reduced&&cat.danceHeld)stopDance(cat);}
  // Include runtime persistence in the same preference queue so concurrent
  // character/motion commands retain both merged fields and the final state.
  await change($);return isCurrent(t);
 });
 preferencesQueue=work;return work;
}
async function claimRuntime($,t=identity()){for(let i=0;i<4;i++){if(!isCurrent(t))return;const previous=await $.state.get({plugin:'focus-cat-companion',key:'companionRuntime',id:t.id});if(!isCurrent(t))return;if(await writeCompanionRuntime($,t,{claim:true,version:previous.version}))return;}throw Error('Companion state changed during reload; try reload again.');}
function deferredCommit($){if(commitClock)return;const t=identity();commitClock=$.clock.after(1,async()=>{if(!isCurrent(t))return;commitClock=null;if(!claimed)await claimRuntime($,t);else await persistCat($);if(!isCurrent(t)||!claimed)return;syncClocks($);redraw($);});}
async function saveTimer($,t,valid,state){
 if(!valid())return {ok:false,committed:false};
 const held={...state,last:state.status==='running'?state.last:0},hs=JSON.stringify(held);
 if(hs!==lastHostTimer){
  // Dispatch reads are snapshots. Use the version returned by each write,
  // including a rejected CAS, instead of re-reading a stale dispatch snapshot.
  let written=false;
  for(let attempt=0;attempt<4;attempt++){
   if(!valid()||(attempt>0&&!await ownsRuntime($,t))||!valid())return {ok:false,committed:false};
   const result=await $.state.set({plugin:'focus-cat-companion',key:'timerRuntime',id:t.id},held,{ifVersion:timerVersion});
   if(!valid())return {ok:false,committed:result.isSet};
   timerVersion=result.version;
   if(result.isSet){lastHostTimer=hs;written=true;break;}
  }
  if(!written)return {ok:false,committed:false};
 }
 // Publish locally only after the host accepts the staged timer. A rejected
 // command must remain safe to retry, including non-idempotent next.
 if(!valid())return {ok:false,committed:true};
 Object.assign(t.timer,state);cat.visible=state.visible;
 try{
  if(!await ownsRuntime($,t)||!valid())return {ok:false,committed:true};
  const value=snapshot(state),sig=JSON.stringify(value);
  if(sig!==lastTimer){await $.store.set(t.key,value);if(!valid())return {ok:false,committed:true};lastTimer=sig;}
  return {ok:valid(),committed:true};
 }catch{return {ok:false,committed:true};}
}
function updateTimer($,update,t=identity()){
 const epoch=timerEpoch,valid=()=>isCurrent(t)&&epoch===timerEpoch;
 const work=timerQueue.catch(()=>{}).then(async()=>{
  if(!valid())return {ok:false,committed:false};
  const now=await $.clock.now();
  if(!valid()||!await ownsRuntime($,t)||!valid())return {ok:false,committed:false};
  const state={...t.timer},message=update(state,now);
  const result=await saveTimer($,t,valid,state);
  // A host-committed change survives a later persistence failure. Confirm
  // ownership again before synchronizing clocks after that partial success.
  let sync=result.ok;
  if(!sync&&result.committed&&valid()){try{sync=await ownsRuntime($,t);}catch{}}
  if(sync&&valid()){syncClocks($);redraw($);}
  return {...result,message};
 });
 timerQueue=work;return work;
}
function interruptTimerUpdates(){timerEpoch++;timerQueue=Promise.resolve();cancelClocks();}
function syncClocks($){
 const renderable=enabled&&claimed&&timer?.visible&&cat.visible&&cat.rows>=CAT_ROWS&&cat.columns>=CAT_WIDTH;
 if(cat.danceActive&&(!renderable||cat.reduced||cat.waiting.size)){stopDance(cat,renderable&&cat.reduced&&!cat.waiting.size);deferredCommit($);}
 if(cat.danceHeld&&!renderable){stopDance(cat);deferredCommit($);}
 const mode=renderable&&!cat.reduced&&!cat.waiting.size?(cat.danceActive?'dance':cat.active?'walk':null):null;
 if(catClock&&(catClockMode!==mode||catClockTurnId!==cat.turnId)){catClock.cancel();catClock=null;catClockMode=null;catClockTurnId=null;catClockGeneration++;}
 if(mode&&!catClock){const t=identity(),turnId=cat.turnId,generation=++catClockGeneration;catClockMode=mode;catClockTurnId=turnId;const valid=()=>catClockMode===mode&&catClockGeneration===generation&&cat.turnId===turnId;catClock=$.clock.every(mode==='dance'?DANCE_INTERVAL_MS:WALK_INTERVAL_MS,async()=>{if(!valid()||!await ownsRuntime($,t)||!valid())return;const changed=mode==='dance'?advanceDance(cat):advance(cat);if(changed){await persistCat($);if(isCurrent(t)){syncClocks($);redraw($);}}});}
 const running=enabled&&claimed&&timer?.status==='running';
 if(!running&&timerClock){timerClock.cancel();timerClock=null;}
 if(running&&!timerClock){const t=identity();timerClock=$.clock.every(1000,async()=>{if(timerBusy||!isCurrent(t))return;timerBusy=true;try{await updateTimer($,tick,t);}finally{if(isCurrent(t))timerBusy=false;}});}
}
async function activate($,drawing=false){if(initialized)return;if(initializing)return initializing;initializing=(async()=>{
 const commands=await $.command.list();if(commands.some(c=>c.name==='focus-cat'&&c.plugin!=='focus-cat-companion'&&!c.plugin?.startsWith('focus-cat-companion@'))){initialized=true;return;}
 await $.command.register({name:'focus-cat',description:'Cat pomodoro: start/pause/restart/reset/next; character a/b/status; motion on/off; show/hide/status',argumentHint:'<action>',immediate:true});
 sessionId=await $.session.id();timerKey='timer:'+sessionId;const now=await $.clock.now(),saved=await $.store.get(timerKey),record=await $.state.get({plugin:'focus-cat-companion',key:'timerRuntime',id:sessionId}),held=record.value;timerVersion=record.version;
 timer=createState(saved,now);if(held&&held.version===1&&['running','paused','idle','ready'].includes(held.status)){const restored=createState(held,now);if(restored.phase===held.phase&&restored.remaining===held.remaining){timer=restored;timer.status=held.status;if(timer.status==='running'){timer.last=held.last;tick(timer,now);}}}
 lastTimer=saved?JSON.stringify(saved):'';lastHostTimer=held?JSON.stringify(held):'';
 const previous=await $.state.get({plugin:'focus-cat-companion',key:'companionRuntime',id:sessionId});restoreCat(previous.value,true);const prefs=preferenceRecord(await $.store.get('companion:preferences'));if(typeof prefs.reduced==='boolean')cat.reduced=prefs.reduced;cat.character=selectedCharacter(Object.prototype.hasOwnProperty.call(prefs,'character')?prefs.character:cat.character);cat.visible=timer.visible;
 enabled=true;initialized=true;if(drawing)deferredCommit($);else await claimRuntime($);syncClocks($);
})();try{await initializing;}finally{initializing=null;}}
async function change($){const t=identity();if(!claimed)await claimRuntime($,t);if(!await ownsRuntime($,t))return;syncClocks($);await persistCat($);if(isCurrent(t))redraw($);}
async function toolFinished($,e){if(!enabled||e.agent_id)return;if(typeof e.tool_use_id==='string')cat.tools.delete(e.tool_use_id);else{const matching=[...cat.tools].filter(([,name])=>name===e.tool_name);if(matching.length===1)cat.tools.delete(matching[0][0]);}if(![...cat.tools.values()].includes(e.tool_name))cat.waiting.delete(e.tool_name);await change($);}
export function register(on){
 on('session.start',async($,e,next)=>{await activate($);return next(e);});
 on('classic.SessionStart',{source:['clear','resume','fork']},async($,e,next)=>{if(initialized&&enabled&&await $.session.id()!==sessionId){const t=identity();interruptTimerUpdates();if(await ownsRuntime($,t)){await updateTimer($,(state,now)=>act(state,'pause',now),t);stopDance(cat);cat.completionEligible=false;cat.active=false;cat.waiting.clear();cat.tools.clear();await persistCat($);}cancelClocks();timer=null;cat=createCompanion();sessionId=null;timerKey=null;initialized=false;initializing=null;enabled=false;claimed=false;timerBusy=false;owner=crypto.randomUUID();runtimeVersion=0;timerVersion=0;lastTimer='';lastHostTimer='';lastCat='';queue=Promise.resolve();preferencesQueue=Promise.resolve();runtimeQueue=Promise.resolve();timerQueue=Promise.resolve();await activate($);}return next(e);});
 on('turn.start',async($,e,next)=>{await activate($);if(!enabled)return next(e);stopDance(cat);cat.turnId=e.turnId;cat.completionEligible=true;cat.active=true;cat.reason='walking';cat.waiting.clear();cat.tools.clear();await change($);const t=identity();try{return await next(e);}catch(error){if(isCurrent(t)&&cat.turnId===e.turnId){stopDance(cat);cat.active=false;cat.reason='error';cat.completionEligible=false;cat.lastCompletedTurnId=e.turnId;cat.waiting.clear();cat.tools.clear();await change($);}throw error;}});
 on('turn.step',async function*($,e,next){await activate($);if(enabled&&!e.agentId&&!(cat.lastCompletedTurnId===e.turnId&&!cat.completionEligible)){stopDance(cat);cat.turnId=e.turnId;cat.completionEligible=true;cat.active=true;cat.reason='walking';cat.waiting.clear();cat.tools.clear();await change($);}return yield*next(e);});
 on('turn.complete',async($,e,next)=>{await activate($);if(enabled&&!e.agentId&&cat.turnId===e.turnId&&(e.reason!=='answer'||e.isAborted)&&(cat.danceActive||cat.danceHeld)){stopDance(cat);cat.active=false;cat.reason=e.reason;cat.completionEligible=false;await change($);}if(enabled&&!e.agentId&&(cat.turnId===null||e.turnId===cat.turnId)&&cat.lastCompletedTurnId!==e.turnId){
  const celebrate=cat.completionEligible&&cat.turnId===e.turnId&&e.reason==='answer'&&!e.isAborted&&!cat.waiting.size;
  cat.active=false;cat.reason=e.reason;cat.completionEligible=false;cat.lastCompletedTurnId=e.turnId;cat.waiting.clear();cat.tools.clear();stopDance(cat);if(celebrate)startDance(cat);await change($);
 }return next(e);});
 on('turn.abort',async($,e,next)=>{await activate($);if(enabled&&e.turnId===cat.turnId){stopDance(cat);cat.active=false;cat.reason='aborted';cat.completionEligible=false;cat.lastCompletedTurnId=e.turnId;cat.waiting.clear();cat.tools.clear();await change($);}return next(e);});
 on('tool.call',async($,e,next)=>{await activate($);if(!enabled||e.agentId||!cat.active)return next(e);const t=identity(),turnId=cat.turnId,key=e.tool_use_id;cat.tools.set(key,e.tool);await persistCat($);try{return await next(e);}finally{if(isCurrent(t)&&cat.turnId===turnId){cat.tools.delete(key);if(![...cat.tools.values()].includes(e.tool))cat.waiting.delete(e.tool);await change($);}}});
 on('classic.PermissionRequest',async($,e,next)=>{await activate($);if(enabled&&!e.agent_id&&cat.active&&[...cat.tools.values()].includes(e.tool_name)){cat.waiting.add(e.tool_name);await change($);}return next(e);});
 on('classic.PostToolUse',async($,e,next)=>{await activate($);await toolFinished($,e);return next(e);});
 on('classic.PostToolUseFailure',async($,e,next)=>{await activate($);await toolFinished($,e);return next(e);});
 on('classic.PermissionDenied',async($,e,next)=>{await activate($);await toolFinished($,e);return next(e);});
 on('command.run',{command:'focus-cat'},async($,e,next)=>{await activate($);if(!enabled)return next(e);const action=e.args.trim().toLowerCase()||'status';
 if(action==='character status')return{text:'Cat character '+selectedCharacter(cat.character).toUpperCase()+'.'};
 if(action==='character a'||action==='character b'){const t=identity(),character=action.slice(-1);if(!await savePreferences($,{character},t)||!isCurrent(t))return{text:'Cat preferences changed during reload; run the command again.'};return{text:'Cat character '+character.toUpperCase()+'.'};}
 if(action==='motion on'||action==='motion off'){const t=identity(),reduced=action==='motion off';if(!await savePreferences($,{reduced},t)||!isCurrent(t))return{text:'Cat preferences changed during reload; run the command again.'};return{text:'Cat motion '+(reduced?'off':'on')+'.'};}
 if(!['start','pause','restart','reset','next','show','hide','status'].includes(action))return{text:'Usage: /focus-cat start | pause | restart | reset | next | show | hide | status | character a | character b | character status | motion on | motion off'};
 const result=await updateTimer($,(state,now)=>act(state,action,now));if(!result.ok)return{text:result.committed?'Timer change was applied, but persistence could not be confirmed; check /focus-cat status before retrying.':'Timer state changed while saving; run the command again.'};await change($);return{text:result.message||`${clockText(timer)} ${timer.phase} / ${timer.status}; reply ${pose(cat)}`};});
 on('ui.render',{component:'AbovePrompt'},async($,e,next)=>{const other=await next(e);if(e.surface!=='terminal')return other;await activate($,true);if(!enabled)return other;
 const held=await $.state.get({plugin:'focus-cat-companion',key:'companionRuntime',id:sessionId});if(held.value?.owner===owner&&held.version>runtimeVersion){restoreCat(held.value);runtimeVersion=held.version;lastCat=JSON.stringify(catData());}
 // AbovePrompt's native core is empty and arrives as an opaque engine ref.
 // A concrete tree returned by another mod keeps ownership of the band.
 const hasOther=other&&other.type!=='engine'&&!(other.type==='Box'&&other.props?.height===0&&(!other.children||other.children.length===0));
 if(e.props.hasSurvey||hasOther){cat.rows=0;syncClocks($);return other;}
 const closedTurn=cat.turnId!==null&&cat.lastCompletedTurnId===cat.turnId&&!cat.completionEligible;
 // A visual working flag can arrive before the tool/permission lifecycle.
 // Keep pending approvals until their real completion event clears them.
 if(typeof e.props.isWorking==='boolean'&&cat.active!==e.props.isWorking&&!(e.props.isWorking&&closedTurn)){cat.active=e.props.isWorking;if(cat.active)stopDance(cat);else cat.reason='idle';deferredCommit($);}
 const layout=pixelLayout(timer,cat,e.props.bodyColumns,e.props.maxRows);syncClocks($);if(layout.mode==='hidden')return other;
 const {Box,Text,Raster}=$.ui.resolve(e);
 if(layout.mode==='timer')return Box({key:'focus-cat-band',height:1,width:layout.columns,flexShrink:0,children:[Text({wrap:'truncate',children:[layout.timerText]})]});
 const children=[Raster({key:'focus-cat-pixels',...layout.raster})];
 if(layout.timerText)children.push(Box({width:7,height:4,children:[Text({wrap:'truncate',children:['  '+layout.timerText]})]}));
 return Box({key:'focus-cat-band',height:4,width:layout.columns,flexDirection:'row',flexShrink:0,children});
 });
 on('session.end',async($,e,next)=>{if(initialized&&enabled){const t=identity();interruptTimerUpdates();if(await ownsRuntime($,t)){stopDance(cat);cat.completionEligible=false;cat.active=false;cat.waiting.clear();cat.tools.clear();await updateTimer($,(state,now)=>act(state,'pause',now),t);await persistCat($);}}return next(e);});
}
