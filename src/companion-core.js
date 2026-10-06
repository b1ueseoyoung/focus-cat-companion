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
