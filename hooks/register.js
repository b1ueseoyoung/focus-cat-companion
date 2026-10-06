// Self-contained original pixel companion: approved four rows; preserved independent local timer.
const DURATIONS={focus:1500000,short:300000,long:900000};
function createState(saved,now){
 const valid=saved&&saved.version===1&&Object.hasOwn(DURATIONS,saved.phase)&&Number.isFinite(saved.remaining)&&saved.remaining>=0&&saved.remaining<=DURATIONS[saved.phase]&&Number.isSafeInteger(saved.completed)&&saved.completed>=0;
 return {version:1,phase:valid?saved.phase:'focus',remaining:valid?saved.remaining:DURATIONS.focus,completed:valid?saved.completed:0,status:valid?(saved.remaining===0?'ready':'paused'):'idle',last:now,motion:valid&&Number.isFinite(saved.motion)&&saved.motion>=0?saved.motion:0,visible:valid?saved.visible!==false:true};
}
function tick(s,now){
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
function act(s,action,now){tick(s,now);
 if(action==='start'){if(s.status==='ready')return 'Use next before starting.';s.status='running';}
 else if(action==='pause'){if(s.status==='running')s.status='paused';}
 else if(action==='reset'){s.remaining=DURATIONS[s.phase];s.status='idle';s.motion=0;}
 else if(action==='restart'){s.remaining=DURATIONS[s.phase];s.status='running';s.motion=0;}
 else if(action==='next'){if(s.phase==='focus'&&s.status!=='ready')return 'Complete focus before next.';s.phase=s.phase==='focus'?(s.completed%4===0?'long':'short'):'focus';s.remaining=DURATIONS[s.phase];s.status='idle';s.motion=0;}
 else if(action==='hide'){s.visible=false;if(s.status==='running')s.status='paused';}
 else if(action==='show')s.visible=true;
 return null;
}
function snapshot(s){return {version:1,phase:s.phase,remaining:s.remaining,completed:s.completed,status:s.remaining===0?'ready':'paused',motion:s.motion,visible:s.visible};}
function clockText(s){const sec=Math.ceil(s.remaining/1000);return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
// Approved A: the exact original 8x8 sample in four terminal rows.
export const CAT_WIDTH=8,CAT_ROWS=4,CAT_FRAMES=4,WALK_INTERVAL_MS=240,DANCE_FRAMES=8,DANCE_INTERVAL_MS=120;
export function createCompanion(){return {turnId:null,active:false,reason:'idle',waiting:new Set(),tools:new Map(),x:0,direction:1,frame:0,turnHold:0,columns:80,rows:4,visible:true,reduced:false,character:'a',danceActive:false,danceHeld:false,danceFrame:0,completionEligible:false,lastCompletedTurnId:null};}
export function pose(s){return s.danceActive?'celebrating':s.active?(s.waiting.size?'approval':'walking'):s.reason;}
export function stopDance(s,freeze=false){s.danceActive=false;s.danceHeld=freeze;if(!freeze)s.danceFrame=0;}
export function startDance(s){
 if(s.active||s.waiting.size||s.reduced||!s.visible||s.rows<CAT_ROWS||s.columns<CAT_WIDTH)return false;
 s.danceActive=true;s.danceHeld=false;s.danceFrame=0;return true;
}
export function advanceDance(s){
 if(!s.danceActive||s.active||s.waiting.size||s.reduced||!s.visible||s.rows<CAT_ROWS||s.columns<CAT_WIDTH)return false;
 if(s.danceFrame>=DANCE_FRAMES-1)stopDance(s);else s.danceFrame++;
 return true;
}
export function advance(s){
 if(!s.active||s.waiting.size||s.reduced||!s.visible||s.rows<CAT_ROWS||s.columns<CAT_WIDTH)return false;
 const limit=Math.max(0,Math.floor(s.columns)-CAT_WIDTH);
 s.x=Math.max(0,Math.min(limit,Math.floor(s.x)));
 if(s.turnHold>0){s.turnHold--;return true;}
 s.frame=(s.frame+1)%CAT_FRAMES;
 if(!limit){s.x=0;s.direction=1;return true;}
 s.x=Math.max(0,Math.min(limit,s.x+s.direction));
 if(s.x===limit){s.direction=-1;s.turnHold=1;}
 else if(s.x===0){s.direction=1;s.turnHold=1;}
 return true;
}

// Generated from approved A sample and directly repaired B pixels.
export const CAT_PIXEL_DATA={"a":{"hold":[[null,null,null,null,null,null,10185809,null],[null,10185809,10185809,15447949,15447949,10185809,10185809,null],[null,10185809,14261360,14261360,14261360,14261360,10185809,null],[null,15447949,6705220,16773589,16773589,6705220,15447949,null],[null,null,16773589,16773589,16773589,16773589,10185809,null],[null,null,10185809,16773589,16773589,14261360,null,10185809],[null,null,null,16773589,16773589,10185809,14261360,null],[null,null,null,10185809,null,10185809,null,null]],"walk":[[[null,null,null,null,null,null,10185809,null],[null,10185809,10185809,15447949,15447949,10185809,10185809,null],[null,10185809,14261360,14261360,14261360,14261360,10185809,null],[null,15447949,6705220,16773589,16773589,6705220,15447949,null],[null,null,16773589,16773589,16773589,16773589,10185809,null],[null,null,10185809,16773589,16773589,14261360,null,10185809],[null,null,null,16773589,16773589,10185809,14261360,null],[null,null,null,10185809,null,10185809,null,null]],[[null,null,null,null,null,null,10185809,null],[null,10185809,10185809,15447949,15447949,10185809,10185809,null],[null,10185809,14261360,14261360,14261360,14261360,10185809,null],[null,15447949,6705220,16773589,16773589,6705220,15447949,null],[null,null,16773589,16773589,16773589,16773589,10185809,null],[null,null,10185809,16773589,16773589,14261360,null,null],[null,null,null,16773589,16773589,10185809,14261360,10185809],[null,null,10185809,null,null,10185809,null,null]],[[null,null,null,null,null,null,10185809,null],[null,10185809,10185809,15447949,15447949,10185809,10185809,null],[null,10185809,14261360,14261360,14261360,14261360,10185809,null],[null,15447949,6705220,16773589,16773589,6705220,15447949,null],[null,null,16773589,16773589,16773589,16773589,10185809,null],[null,null,10185809,16773589,16773589,14261360,null,10185809],[null,null,null,16773589,16773589,10185809,14261360,null],[null,null,null,10185809,null,null,10185809,null]],[[null,null,null,null,null,null,10185809,null],[null,10185809,10185809,15447949,15447949,10185809,10185809,null],[null,10185809,14261360,14261360,14261360,14261360,10185809,null],[null,15447949,6705220,16773589,16773589,6705220,15447949,null],[null,null,16773589,16773589,16773589,16773589,10185809,null],[null,null,10185809,16773589,16773589,14261360,10185809,null],[null,null,null,16773589,16773589,10185809,14261360,null],[null,null,null,10185809,null,10185809,null,null]]],"dance":[[[null,null,null,null,null,null,10185809,null],[null,10185809,10185809,15447949,15447949,10185809,10185809,null],[null,10185809,14261360,14261360,14261360,14261360,10185809,null],[null,15447949,6705220,16773589,16773589,6705220,15447949,null],[null,null,16773589,16773589,16773589,16773589,10185809,null],[null,null,10185809,16773589,16773589,14261360,null,10185809],[null,null,null,16773589,16773589,10185809,14261360,null],[null,null,null,10185809,null,10185809,null,null]],[[null,null,null,null,null,null,10185809,null],[null,10185809,10185809,15447949,15447949,10185809,10185809,null],[null,10185809,14261360,14261360,14261360,14261360,10185809,null],[null,15447949,6705220,16773589,16773589,6705220,15447949,null],[null,null,16773589,16773589,16773589,16773589,10185809,null],[null,10185809,10185809,16773589,16773589,14261360,null,10185809],[null,null,null,16773589,16773589,10185809,14261360,null],[null,null,null,10185809,null,10185809,null,null]],[[null,null,null,null,null,null,10185809,null],[null,10185809,10185809,15447949,15447949,10185809,10185809,null],[null,10185809,14261360,14261360,14261360,14261360,10185809,null],[null,15447949,6705220,16773589,16773589,6705220,15447949,null],[null,null,16773589,16773589,16773589,16773589,10185809,null],[null,10185809,10185809,16773589,16773589,14261360,null,10185809],[null,null,null,10185809,null,10185809,14261360,null],[null,null,null,10185809,null,10185809,null,null]],[[null,null,null,null,null,null,10185809,null],[null,10185809,10185809,15447949,15447949,10185809,10185809,null],[null,10185809,14261360,14261360,14261360,14261360,10185809,null],[null,15447949,6705220,16773589,16773589,6705220,15447949,null],[null,null,16773589,16773589,16773589,16773589,10185809,null],[null,null,10185809,16773589,16773589,14261360,10185809,10185809],[null,null,null,10185809,null,10185809,14261360,null],[null,null,null,10185809,null,10185809,null,null]],[[null,null,null,null,null,null,10185809,null],[null,10185809,10185809,15447949,15447949,10185809,10185809,null],[null,10185809,14261360,14261360,14261360,14261360,10185809,null],[null,15447949,6705220,16773589,16773589,6705220,15447949,null],[null,null,16773589,16773589,16773589,16773589,10185809,null],[null,10185809,10185809,16773589,16773589,14261360,10185809,10185809],[null,null,null,16773589,16773589,10185809,14261360,null],[null,null,null,10185809,null,10185809,null,null]],[[null,null,null,null,null,null,10185809,null],[null,10185809,10185809,15447949,15447949,10185809,10185809,null],[null,10185809,14261360,14261360,14261360,14261360,10185809,null],[null,15447949,6705220,16773589,16773589,6705220,15447949,null],[null,null,16773589,16773589,16773589,16773589,10185809,null],[null,10185809,10185809,16773589,16773589,14261360,10185809,10185809],[null,null,null,10185809,null,10185809,14261360,null],[null,null,null,10185809,null,10185809,null,null]],[[null,null,null,null,null,null,10185809,null],[null,10185809,10185809,15447949,15447949,10185809,10185809,null],[null,10185809,14261360,14261360,14261360,14261360,10185809,null],[null,15447949,6705220,16773589,16773589,6705220,15447949,null],[null,null,16773589,16773589,16773589,16773589,10185809,null],[null,null,10185809,16773589,16773589,14261360,10185809,10185809],[null,null,null,16773589,16773589,10185809,14261360,null],[null,null,null,10185809,null,10185809,null,null]],[[null,null,null,null,null,null,10185809,null],[null,10185809,10185809,15447949,15447949,10185809,10185809,null],[null,10185809,14261360,14261360,14261360,14261360,10185809,null],[null,15447949,6705220,16773589,16773589,6705220,15447949,null],[null,null,16773589,16773589,16773589,16773589,10185809,null],[null,null,10185809,16773589,16773589,14261360,null,10185809],[null,null,null,16773589,16773589,10185809,14261360,null],[null,null,null,10185809,null,10185809,null,null]]]},"b":{"hold":[[null,null,null,null,null,null,null,null],[null,12355434,12355434,null,null,14922124,null,null],[null,12355434,16774104,14922124,16774104,15324859,null,null],[null,16774104,7494220,16774104,16774104,7494220,12355434,null],[null,16774104,16774104,16774104,16774104,16774104,12355434,null],[null,null,15324859,16774104,15324859,15324859,16774104,null],[null,null,12355434,12355434,16774104,16774104,16774104,null],[null,null,null,12355434,null,12355434,null,null]],"walk":[[[null,null,null,null,null,null,null,null],[null,12355434,12355434,null,null,14922124,null,null],[null,12355434,16774104,14922124,16774104,15324859,null,null],[null,16774104,7494220,16774104,16774104,7494220,12355434,null],[null,16774104,16774104,16774104,16774104,16774104,12355434,null],[null,null,15324859,16774104,15324859,15324859,16774104,null],[null,null,12355434,12355434,16774104,16774104,16774104,null],[null,null,null,12355434,null,12355434,null,null]],[[null,null,null,null,null,null,null,null],[null,12355434,12355434,null,null,14922124,null,null],[null,12355434,16774104,14922124,16774104,15324859,null,null],[null,16774104,7494220,16774104,16774104,7494220,12355434,null],[null,16774104,16774104,16774104,16774104,16774104,12355434,null],[null,null,15324859,16774104,15324859,15324859,16774104,null],[null,null,12355434,12355434,16774104,16774104,16774104,16774104],[null,null,12355434,null,null,12355434,null,null]],[[null,null,null,null,null,null,null,null],[null,12355434,12355434,null,null,14922124,null,null],[null,12355434,16774104,14922124,16774104,15324859,null,null],[null,16774104,7494220,16774104,16774104,7494220,12355434,null],[null,16774104,16774104,16774104,16774104,16774104,12355434,null],[null,null,15324859,16774104,15324859,15324859,16774104,null],[null,null,12355434,12355434,16774104,16774104,16774104,null],[null,null,null,12355434,null,null,12355434,null]],[[null,null,null,null,null,null,null,null],[null,12355434,12355434,null,null,14922124,null,null],[null,12355434,16774104,14922124,16774104,15324859,null,null],[null,16774104,7494220,16774104,16774104,7494220,12355434,null],[null,16774104,16774104,16774104,16774104,16774104,12355434,null],[null,null,15324859,16774104,15324859,15324859,16774104,null],[null,null,12355434,12355434,16774104,16774104,null,null],[null,null,null,12355434,null,12355434,null,null]]],"dance":[[[null,null,null,null,null,null,null,null],[null,12355434,12355434,null,null,14922124,null,null],[null,12355434,16774104,14922124,16774104,15324859,null,null],[null,16774104,7494220,16774104,16774104,7494220,12355434,null],[null,16774104,16774104,16774104,16774104,16774104,12355434,null],[null,null,15324859,16774104,15324859,15324859,16774104,null],[null,null,12355434,12355434,16774104,16774104,16774104,null],[null,null,null,12355434,null,12355434,null,null]],[[null,null,null,null,null,null,null,null],[null,12355434,12355434,null,null,14922124,null,null],[null,12355434,16774104,14922124,16774104,15324859,null,null],[null,16774104,7494220,16774104,16774104,7494220,12355434,null],[null,16774104,16774104,16774104,16774104,16774104,12355434,null],[null,12355434,15324859,16774104,15324859,15324859,16774104,null],[null,null,12355434,12355434,16774104,16774104,16774104,null],[null,null,null,12355434,null,12355434,null,null]],[[null,null,null,null,null,null,null,null],[null,12355434,12355434,null,null,14922124,null,null],[null,12355434,16774104,14922124,16774104,15324859,null,null],[null,16774104,7494220,16774104,16774104,7494220,12355434,null],[null,16774104,16774104,16774104,16774104,16774104,12355434,null],[null,12355434,15324859,12355434,16774104,15324859,16774104,null],[null,null,12355434,12355434,null,16774104,16774104,null],[null,null,null,12355434,null,12355434,null,null]],[[null,null,null,null,null,null,null,null],[null,12355434,12355434,null,null,14922124,null,null],[null,12355434,16774104,14922124,16774104,15324859,null,null],[null,16774104,7494220,16774104,16774104,7494220,12355434,null],[null,16774104,16774104,16774104,16774104,16774104,12355434,null],[null,null,15324859,12355434,16774104,15324859,12355434,null],[null,null,12355434,12355434,null,16774104,16774104,null],[null,null,null,12355434,null,12355434,null,null]],[[null,null,null,null,null,null,null,null],[null,12355434,12355434,null,null,14922124,null,null],[null,12355434,16774104,14922124,16774104,15324859,null,null],[null,16774104,7494220,16774104,16774104,7494220,12355434,null],[null,16774104,16774104,16774104,16774104,16774104,12355434,null],[null,12355434,15324859,16774104,15324859,15324859,12355434,null],[null,null,12355434,12355434,16774104,16774104,16774104,null],[null,null,null,12355434,null,12355434,null,null]],[[null,null,null,null,null,null,null,null],[null,12355434,12355434,null,null,14922124,null,null],[null,12355434,16774104,14922124,16774104,15324859,null,null],[null,16774104,7494220,16774104,16774104,7494220,12355434,null],[null,16774104,16774104,16774104,16774104,16774104,12355434,null],[null,12355434,15324859,12355434,16774104,15324859,12355434,null],[null,null,12355434,12355434,null,16774104,16774104,null],[null,null,null,12355434,null,12355434,null,null]],[[null,null,null,null,null,null,null,null],[null,12355434,12355434,null,null,14922124,null,null],[null,12355434,16774104,14922124,16774104,15324859,null,null],[null,16774104,7494220,16774104,16774104,7494220,12355434,null],[null,16774104,16774104,16774104,16774104,16774104,12355434,null],[null,null,15324859,16774104,15324859,15324859,12355434,null],[null,null,12355434,12355434,16774104,16774104,16774104,null],[null,null,null,12355434,null,12355434,null,null]],[[null,null,null,null,null,null,null,null],[null,12355434,12355434,null,null,14922124,null,null],[null,12355434,16774104,14922124,16774104,15324859,null,null],[null,16774104,7494220,16774104,16774104,7494220,12355434,null],[null,16774104,16774104,16774104,16774104,16774104,12355434,null],[null,null,15324859,16774104,15324859,15324859,16774104,null],[null,null,12355434,12355434,16774104,16774104,16774104,null],[null,null,null,12355434,null,12355434,null,null]]]}};

export function pixelRaster(cat,columns){
 columns=Math.max(0,Math.floor(columns));if(columns<8)return null;
 const data=CAT_PIXEL_DATA[cat.character==='b'?'b':'a'];
 const dance=cat.danceActive||cat.danceHeld,danceFrame=Math.max(0,Math.floor(cat.danceFrame||0))%8;
 const grid=dance?data.dance[danceFrame]:cat.active?data.walk[Math.max(0,Math.floor(cat.frame||0))%4]:data.hold;
 const offset=dance?[0,-1,0,1,0,-1,0,0][danceFrame]:0;
 const x=Math.max(0,Math.min(columns-8,Math.floor(cat.x||0)+offset)),mirror=cat.direction<0;
 const bytes=new Uint8Array(columns*4*12),view=new DataView(bytes.buffer),DEFAULT=0x01000000;
 for(let row=0;row<4;row++)for(let col=0;col<columns;col++){
  const offset=col-x,source=mirror?7-offset:offset;
  const upper=offset>=0&&offset<8?grid[row*2][source]:null;
  const lower=offset>=0&&offset<8?grid[row*2+1][source]:null;
  let glyph=0x20,foreground=DEFAULT,background=DEFAULT;
  if(upper===null&&lower!==null){glyph=0x2584;foreground=lower;}
  else if(upper!==null){glyph=0x2580;foreground=upper;if(lower!==null)background=lower;}
  const index=(row*columns+col)*12;
  view.setUint32(index,glyph,true);view.setUint32(index+4,foreground,true);view.setUint32(index+8,background,true);
 }
 const cells=typeof bytes.toBase64==='function'?bytes.toBase64():btoa(String.fromCharCode(...bytes));
 return {columns,rows:4,cells};
}

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
const preferenceKeys={character:'companion:character',reduced:'companion:reduced'};
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
async function restorePreferences($){
 const legacy=preferenceRecord(await $.store.get('companion:preferences'));
 const character=await $.store.get(preferenceKeys.character),reduced=await $.store.get(preferenceKeys.reduced);
 // Read old records without rewriting them: migration writes could race a
 // command from another session. A present per-field key is authoritative,
 // even when invalid (A / motion on), and unknown legacy fields stay intact.
 if(character!==undefined)cat.character=selectedCharacter(character);
 else if(Object.prototype.hasOwnProperty.call(legacy,'character'))cat.character=selectedCharacter(legacy.character);
 if(reduced!==undefined)cat.reduced=reduced===true;
 else if(Object.prototype.hasOwnProperty.call(legacy,'reduced'))cat.reduced=legacy.reduced===true;
}
function savePreference($,field,value,t=identity()){
 const work=preferencesQueue.catch(()=>{}).then(async()=>{
  if(!await ownsRuntime($,t))return false;
  const key=preferenceKeys[field],previous=await $.store.get(key);
  // Fence after the asynchronous read: a replaced owner must not issue a new
  // preference write. An already-issued store.set is not atomically cancelled.
  if(!await ownsRuntime($,t))return false;
  if(previous!==value)await $.store.set(key,value);
  if(!await ownsRuntime($,t))return false;
  if(field==='character')cat.character=selectedCharacter(value);
  if(field==='reduced'){cat.reduced=value;if(!cat.reduced&&cat.danceHeld)stopDance(cat);}
  // Keep local runtime changes ordered while different sessions write their
  // own preference keys without overwriting one another's fields.
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
 const previous=await $.state.get({plugin:'focus-cat-companion',key:'companionRuntime',id:sessionId});restoreCat(previous.value,true);await restorePreferences($);cat.visible=timer.visible;
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
 if(action==='character a'||action==='character b'){const t=identity(),character=action.slice(-1);if(!await savePreference($,'character',character,t)||!isCurrent(t))return{text:'Cat preferences changed during reload; run the command again.'};return{text:'Cat character '+character.toUpperCase()+'.'};}
 if(action==='motion on'||action==='motion off'){const t=identity(),reduced=action==='motion off';if(!await savePreference($,'reduced',reduced,t)||!isCurrent(t))return{text:'Cat preferences changed during reload; run the command again.'};return{text:'Cat motion '+(reduced?'off':'on')+'.'};}
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
