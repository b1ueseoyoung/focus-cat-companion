import {test,expect} from 'bun:test';
import {resolve} from 'node:path';
import {AsyncLocalStorage} from 'node:async_hooks';
let loadId=0;
function host(options={}){const saved=new Map(),runtime=new Map(),timers=new Map(),readSnapshots=new Map(),reads=new AsyncLocalStorage();let now=0,drawing=false,id=0,hooks=new Map(),session='isolated-reload',nextNow=null,nextCompanionWrite=null;const addr=r=>r.key+':'+r.id,dispatch=fn=>options.snapshotReads?reads.run(new Map(),fn):fn();const $={command:{list:async()=>[{name:'focus-cat',plugin:'focus-cat-companion@inline'}],register:async()=>{}},session:{id:async()=>session},store:{get:async k=>saved.get(k),set:async(k,v)=>saved.set(k,structuredClone(v))},state:{get:async r=>{const address=addr(r),snapshot=reads.getStore();if(snapshot?.has(address))return snapshot.get(address);let value=runtime.get(address)||{value:undefined,version:0};if(readSnapshots.has(address)){value=readSnapshots.get(address);readSnapshots.delete(address);}if(snapshot){value=structuredClone(value);snapshot.set(address,value);}return value;},set:async(r,v,o={})=>{if(drawing)throw Error('write during drawing');const old=runtime.get(addr(r))||{version:0};if(o.ifVersion!==undefined&&old.version!==o.ifVersion)return{isSet:false,version:old.version};const version=old.version+1;runtime.set(addr(r),{value:structuredClone(v),version});if(r.key==='companionRuntime'&&nextCompanionWrite){const blocked=nextCompanionWrite;nextCompanionWrite=null;blocked.enter();await blocked.result;}return{isSet:true,version};}},clock:{now:async()=>{if(nextNow){const wait=nextNow;nextNow=null;wait.enter();return await wait.result;}return now;},every:(ms,fn)=>{const key=++id;timers.set(key,{ms,fn:()=>dispatch(fn),at:now+ms,repeat:true});return{cancel:()=>timers.delete(key)}},after:(ms,fn)=>{const key=++id;timers.set(key,{ms,fn:()=>dispatch(fn),at:now+ms,repeat:false});return{cancel:()=>timers.delete(key)}}},ui:{invalidate:()=>{},resolve:()=>({Box:p=>({type:'Box',props:p,children:p.children}),Text:p=>({type:'Text',props:p,children:p.children}),Raster:p=>({type:'Raster',props:p,children:[]})})}};
async function load(){timers.clear();hooks=new Map();const m=await import(resolve(import.meta.dir,'../hooks/register.js')+'?isolated='+ ++loadId);m.register((name,...args)=>hooks.set(name,args.at(-1)));}
const fire=(name,e={},next=async()=>({unchanged:true}))=>dispatch(()=>hooks.get(name)($,e,next));
async function render(working=false,width=40,rows=4){drawing=true;try{return await fire('ui.render',{surface:'terminal',props:{hasSurvey:false,isWorking:working,bodyColumns:width,maxRows:rows}},async()=>({type:'Box',props:{height:0},children:[]}));}finally{drawing=false;}}
async function advance(ms){const end=now+ms;while(true){const entry=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];if(!entry||entry[1].at>end)break;now=entry[1].at;if(!entry[1].repeat)timers.delete(entry[0]);await entry[1].fn();if(timers.has(entry[0]))entry[1].at=now+entry[1].ms;}now=end;}
function blockNextNow(){let enter,release;const entered=new Promise(r=>enter=r),result=new Promise(r=>release=r);nextNow={enter,result};return{entered,release};}
function blockNextCompanionWrite(){let enter,release;const entered=new Promise(r=>enter=r),result=new Promise(r=>release=r);nextCompanionWrite={enter,result};return{entered,release};}
return{load,fire,render,advance,saved,runtime,timers,blockNextNow,blockNextCompanionWrite,setNow:value=>now=value,setSession:value=>session=value,readSnapshotOnce:(key,value)=>readSnapshots.set(key,structuredClone(value)),companion:()=>runtime.get('companionRuntime:'+session)?.value};}
test('20 module replacements retain running timer, walking position, motion preference and <=2 clocks',async()=>{const h=host();await h.load();await h.fire('session.start');await h.fire('command.run',{args:'restart'});await h.fire('turn.start',{turnId:'a',text:'never submitted'});await h.render(true);await h.advance(720);expect(h.companion().frame).toBe(3);for(let i=0;i<20;i++){const before=h.companion(),remaining=h.saved.get('timer:isolated-reload').remaining;await h.load();await h.render(true);await h.advance(1);expect(h.companion().x).toBe(before.x);expect(h.companion().frame).toBe(before.frame);expect(h.saved.get('timer:isolated-reload').remaining).toBe(remaining);expect(h.timers.size).toBe(2);}const held=h.runtime.get('companionRuntime:isolated-reload');h.runtime.set('companionRuntime:isolated-reload',{value:{...structuredClone(held.value),frame:2,turnHold:1,x:0,direction:1},version:held.version+1});await h.load();await h.render(true);await h.advance(1);expect(h.companion().frame).toBe(2);expect(h.companion().turnHold).toBe(1);await h.advance(240);expect(h.companion().x).toBe(0);expect(h.companion().frame).toBe(2);expect(h.companion().turnHold).toBe(0);await h.advance(240);expect(h.companion().x).toBe(1);expect(h.companion().frame).toBe(3);await h.fire('command.run',{args:'motion off'});await h.load();await h.render(true);await h.advance(1);expect(h.companion().reduced).toBe(true);expect(h.timers.size).toBe(1);});
test('approval survives reload; denied/post-tool event recovers; old callback cannot overwrite new owner',async()=>{const h=host();await h.load();await h.fire('session.start');await h.fire('turn.start',{turnId:'a'});await h.render(true);let end;const p=h.fire('tool.call',{tool:'Bash',tool_use_id:'x'},()=>new Promise(r=>end=r));for(let i=0;i<12&&!end;i++)await Promise.resolve();await h.fire('classic.PermissionRequest',{tool_name:'Bash'});await h.load();await h.render(true);await h.advance(1);expect(h.companion().waiting).toContain('Bash');expect(h.timers.size).toBe(0);await h.fire('classic.PermissionDenied',{tool_name:'Bash',tool_use_id:'x'});await h.advance(480);expect(h.companion().waiting.length).toBe(0);const owner=h.companion().owner;end({deny:'mock denial'});await p;expect(h.companion().owner).toBe(owner);expect(h.timers.size).toBe(1);await h.render(false);await h.advance(1);expect(h.timers.size).toBe(0);});
test('first render writes no host state, deferred claim succeeds; idle and collapsed band no periodic clocks',async()=>{const h=host();await h.load();await h.render(false);expect(h.runtime.size).toBe(0);await h.advance(1);expect(h.companion().active).toBe(false);expect(h.timers.size).toBe(0);await h.fire('turn.start',{turnId:'a'});await h.render(true,40,0);expect(h.timers.size).toBe(0);await h.render(true,40,4);expect(h.timers.size).toBe(1);await h.render(false);await h.advance(1);expect(h.timers.size).toBe(0);});
test('an already running old clock cannot overwrite a new owner, even with a retained state snapshot',async()=>{
 const h=host({snapshotReads:true});await h.load();await h.fire('session.start');await h.fire('command.run',{args:'restart'});
 const oldClock=[...h.timers.values()].find(c=>c.ms===1000),snapshot=structuredClone(h.runtime.get('companionRuntime:isolated-reload'));
 h.setNow(1000);const blocked=h.blockNextNow(),oldWork=oldClock.fn();await blocked.entered;
 await h.load();await h.fire('session.start');await h.advance(1000);
 const before=structuredClone(h.saved.get('timer:isolated-reload')),held=structuredClone(h.runtime.get('timerRuntime:isolated-reload'));
 expect(before.remaining).toBe(1498000);
 h.readSnapshotOnce('companionRuntime:isolated-reload',snapshot);blocked.release(1000);await oldWork;
 expect(h.saved.get('timer:isolated-reload')).toEqual(before);expect(h.runtime.get('timerRuntime:isolated-reload')).toEqual(held);expect(h.timers.size).toBe(1);
});
test('a first drawing with a running restored timer starts clocks only after its deferred ownership claim',async()=>{
 const h=host(),timer={version:1,phase:'focus',remaining:1499000,completed:2,status:'running',motion:0,visible:true,last:0};
 h.saved.set('timer:isolated-reload',{...timer,status:'paused'});h.runtime.set('timerRuntime:isolated-reload',{value:timer,version:1});
 await h.load();await h.render(false);expect([...h.timers.values()].map(c=>c.ms)).toEqual([1]);
 await h.advance(1);expect([...h.timers.values()].map(c=>c.ms)).toEqual([1000]);
});
test('first command/turn activation accepts its successful claim despite pre-claim dispatch snapshots',async()=>{
 const command=host({snapshotReads:true});await command.load();await command.fire('command.run',{args:'restart'});
 expect(command.saved.get('timer:isolated-reload').remaining).toBe(1500000);expect(command.runtime.get('timerRuntime:isolated-reload').value.status).toBe('running');expect(command.timers.size).toBe(1);
 await command.advance(1000);expect(command.saved.get('timer:isolated-reload').remaining).toBe(1499000);
 const turn=host({snapshotReads:true});await turn.load();await turn.fire('turn.start',{turnId:'initial'});expect(turn.companion().active).toBe(true);expect(turn.companion().turnId).toBe('initial');expect(turn.timers.size).toBe(1);
 await turn.render(true);await turn.advance(480);expect(turn.companion().x).toBe(2);
});
test('clear/resume switch pauses the old timer and preserves each session independently',async()=>{
 const h=host();await h.load();await h.fire('session.start');await h.fire('command.run',{args:'restart'});await h.fire('turn.start',{turnId:'old-turn'});await h.advance(2000);
 const other={version:1,phase:'short',remaining:123456,completed:3,status:'paused',motion:0,visible:true};h.saved.set('timer:isolated-next',other);
 h.setSession('isolated-next');await h.fire('classic.SessionStart',{source:'clear'});
 expect(h.saved.get('timer:isolated-reload').remaining).toBe(1498000);expect(h.saved.get('timer:isolated-reload').status).toBe('paused');
 expect(h.saved.get('timer:isolated-next')).toEqual(other);expect(h.companion().active).toBe(false);expect(h.timers.size).toBe(0);
 expect(h.runtime.get('companionRuntime:isolated-reload').value.active).toBe(false);
 await h.fire('command.run',{args:'restart'});await h.advance(1000);expect(h.saved.get('timer:isolated-next').remaining).toBe(299000);
 h.setSession('isolated-reload');await h.fire('classic.SessionStart',{source:'resume'});
 expect(h.saved.get('timer:isolated-next').status).toBe('paused');expect(h.saved.get('timer:isolated-reload').remaining).toBe(1498000);expect(h.timers.size).toBe(0);
});
test('an old callback held across a session switch cannot mutate the new session or unpause the old timer',async()=>{
 const h=host();await h.load();await h.fire('session.start');await h.fire('command.run',{args:'restart'});
 const oldClock=[...h.timers.values()].find(c=>c.ms===1000);h.setNow(1000);const blocked=h.blockNextNow(),oldWork=oldClock.fn();await blocked.entered;
 h.setSession('isolated-next');await h.fire('classic.SessionStart',{source:'fork'});
 const beforeStore=structuredClone([...h.saved]),beforeRuntime=structuredClone([...h.runtime]);blocked.release(1000);await oldWork;
 expect([...h.saved]).toEqual(beforeStore);expect([...h.runtime]).toEqual(beforeRuntime);expect(h.saved.get('timer:isolated-reload').status).toBe('paused');expect(h.timers.size).toBe(0);
});
test('abort and a thrown start hook stop walking; failed tools recover approval without swallowing failures',async()=>{
 const h=host();await h.load();await h.fire('session.start');await h.fire('turn.start',{turnId:'a'});await h.render(true);expect(h.timers.size).toBe(1);
 await h.fire('turn.abort',{turnId:'other'});expect(h.companion().active).toBe(true);
 await h.fire('turn.abort',{turnId:'a'});expect(h.companion().reason).toBe('aborted');expect(h.companion().active).toBe(false);expect(h.timers.size).toBe(0);
 const startError=Error('mock start failed');await expect(h.fire('turn.start',{turnId:'b'},async()=>{throw startError;})).rejects.toBe(startError);
 expect(h.companion().reason).toBe('error');expect(h.companion().active).toBe(false);expect(h.timers.size).toBe(0);
 await h.fire('turn.start',{turnId:'c'});await h.render(true);let release;const toolError=Error('mock tool failed');const pending=h.fire('tool.call',{tool:'Bash',tool_use_id:'failed'},()=>new Promise((resolve,reject)=>release=()=>reject(toolError)));
 for(let i=0;i<20&&!release;i++)await Promise.resolve();await h.fire('classic.PermissionRequest',{tool_name:'Bash'});expect(h.companion().waiting).toContain('Bash');expect(h.timers.size).toBe(0);
 await h.fire('classic.PostToolUseFailure',{tool_name:'Bash'});expect(h.companion().waiting).toEqual([]);expect(h.timers.size).toBe(1);
 const rejected=pending.then(()=>{throw Error('Expected original tool error');},error=>error);release();expect(await rejected).toBe(toolError);
 expect(h.companion().waiting).toEqual([]);await h.fire('turn.complete',{turnId:'c',reason:'error'});expect(h.timers.size).toBe(0);
});
test('finishing one parallel tool never clears another same-name tool approval wait',async()=>{
 const h=host();await h.load();await h.fire('session.start');await h.fire('turn.start',{turnId:'a'});await h.render(true);let releaseA,releaseB;
 const a=h.fire('tool.call',{tool:'Bash',tool_use_id:'approved'},()=>new Promise(r=>releaseA=r)),b=h.fire('tool.call',{tool:'Bash',tool_use_id:'waiting'},()=>new Promise(r=>releaseB=r));
 for(let i=0;i<30&&(!releaseA||!releaseB);i++)await Promise.resolve();await h.fire('classic.PermissionRequest',{tool_name:'Bash'});
 await h.fire('classic.PostToolUseFailure',{tool_name:'Bash'});expect(h.companion().waiting).toContain('Bash');expect(h.companion().tools.length).toBe(2);
 await h.fire('classic.PostToolUse',{tool_name:'Bash',tool_use_id:'approved'});releaseA({original:'A'});await a;
 expect(h.companion().waiting).toContain('Bash');expect(h.companion().tools).toEqual([['waiting','Bash']]);expect(h.timers.size).toBe(0);
 await h.fire('classic.PermissionDenied',{tool_name:'Bash',tool_use_id:'waiting'});expect(h.companion().waiting).toEqual([]);expect(h.timers.size).toBe(1);releaseB({original:'B'});await b;
});

test('reload and new-session activation discard a dance while retaining completion deduplication',async()=>{
 const h=host();await h.load();await h.fire('session.start');await h.render(true);await h.fire('turn.start',{turnId:'completed-before-reload'});
 await h.fire('turn.complete',{turnId:'completed-before-reload',reason:'answer',isAborted:false});await h.advance(360);
 expect(h.companion().danceActive).toBe(true);expect(h.companion().danceFrame).toBe(3);
 await h.load();await h.render(false);await h.advance(1);
 expect(h.companion().danceActive).toBe(false);expect(h.companion().danceHeld).toBe(false);expect(h.companion().danceFrame).toBe(0);
 expect(h.companion().lastCompletedTurnId).toBe('completed-before-reload');expect(h.companion().completionEligible).toBe(false);expect(h.timers.size).toBe(0);
 await h.fire('turn.complete',{turnId:'completed-before-reload',reason:'answer',isAborted:false});await h.render(true);
 expect(h.companion().active).toBe(false);expect(h.companion().danceActive).toBe(false);expect(h.timers.size).toBe(0);
 await h.fire('turn.start',{turnId:'completed-before-switch'});await h.fire('turn.complete',{turnId:'completed-before-switch',reason:'answer',isAborted:false});await h.advance(240);expect(h.companion().danceFrame).toBe(2);
 h.setSession('isolated-dance-next');await h.fire('classic.SessionStart',{source:'fork'});await h.render(false);
 expect(h.companion().danceActive).toBe(false);expect(h.companion().danceHeld).toBe(false);expect(h.companion().lastCompletedTurnId).toBe(null);expect(h.companion().completionEligible).toBe(false);expect(h.timers.size).toBe(0);
 await h.fire('turn.complete',{turnId:'completed-before-switch',reason:'answer',isAborted:false});await h.advance(1000);expect(h.companion().danceActive).toBe(false);expect(h.timers.size).toBe(0);
 for(const active of [false,true]){
  const restored=host();restored.runtime.set('companionRuntime:isolated-reload',{value:{version:1,owner:'earlier-module',turnId:'in-progress',active,reason:active?'walking':'idle',waiting:[],tools:[],x:0,direction:1,frame:2,turnHold:0,reduced:false,character:'a',danceActive:false,danceHeld:false,danceFrame:0,completionEligible:true,lastCompletedTurnId:'older-completed'},version:1});
  await restored.load();await restored.fire('session.start');expect(restored.companion().completionEligible).toBe(active);
  await restored.fire('turn.complete',{turnId:'in-progress',reason:'answer',isAborted:false});expect(restored.companion().danceActive).toBe(active);
 }
});

test('abort and captured callbacks from an obsolete motion mode cannot advance or resurrect a dance',async()=>{
 const h=host();await h.load();await h.fire('session.start');await h.render(true);await h.fire('turn.start',{turnId:'abort-dance'});await h.fire('turn.complete',{turnId:'abort-dance',reason:'answer',isAborted:false});
 const abortedClock=[...h.timers.values()].find(clock=>clock.ms===120);await h.advance(120);await h.fire('turn.abort',{turnId:'abort-dance'});
 expect(h.companion().danceActive).toBe(false);expect(h.companion().danceHeld).toBe(false);expect(h.timers.size).toBe(0);
 let beforeRuntime=structuredClone([...h.runtime]),beforeStore=structuredClone([...h.saved]);await abortedClock.fn();expect([...h.runtime]).toEqual(beforeRuntime);expect([...h.saved]).toEqual(beforeStore);
 await h.fire('turn.start',{turnId:'mode-one'});await h.fire('turn.complete',{turnId:'mode-one',reason:'answer',isAborted:false});const oldDance=[...h.timers.values()].find(clock=>clock.ms===120);
 await h.fire('turn.start',{turnId:'mode-two'});expect(h.companion().active).toBe(true);expect(h.companion().danceActive).toBe(false);beforeRuntime=structuredClone([...h.runtime]);await oldDance.fn();expect([...h.runtime]).toEqual(beforeRuntime);
 const oldWalk=[...h.timers.values()].find(clock=>clock.ms===240);await h.fire('turn.complete',{turnId:'mode-two',reason:'answer',isAborted:false});beforeRuntime=structuredClone([...h.runtime]);await oldWalk.fn();expect([...h.runtime]).toEqual(beforeRuntime);
 await h.advance(960);expect(h.companion().danceActive).toBe(false);expect(h.companion().danceFrame).toBe(0);expect(h.timers.size).toBe(0);
});

test('a previous dance callback held inside CAS cannot advance the next completed turn dance',async()=>{
 const h=host();await h.load();await h.fire('session.start');await h.render(true);await h.fire('turn.start',{turnId:'old-dance'});await h.fire('turn.complete',{turnId:'old-dance',reason:'answer',isAborted:false});
 const blocked=h.blockNextCompanionWrite(),oldTick=h.advance(120);await blocked.entered;
 const newStart=h.fire('turn.start',{turnId:'new-dance'});for(let i=0;i<15;i++)await Promise.resolve();
 const newComplete=h.fire('turn.complete',{turnId:'new-dance',reason:'answer',isAborted:false});for(let i=0;i<15;i++)await Promise.resolve();
 blocked.release();await Promise.all([oldTick,newStart,newComplete]);
 expect(h.companion().turnId).toBe('new-dance');expect(h.companion().lastCompletedTurnId).toBe('new-dance');expect(h.companion().danceActive).toBe(true);expect(h.companion().danceFrame).toBe(0);
 expect([...h.timers.values()].map(clock=>clock.ms)).toEqual([120]);await h.advance(960);expect(h.companion().danceActive).toBe(false);expect(h.timers.size).toBe(0);
});

async function approvalTool(h,id,input,initial=input){
 let enter,release;const entered=new Promise(resolve=>enter=resolve),result=new Promise(resolve=>release=resolve);
 const pending=h.fire('tool.call',{tool:'Bash',tool_use_id:id,...initial},async()=>{await h.fire('tool.check',{tool:'Bash',tool_use_id:id,input},async()=>({decision:'ask'}));enter();return result;});
 await entered;return{pending,release};
}
for(const first of ['prompted','unprompted'])test('distinct-input same-name calls clear only their own approval when '+first+' finishes first',async()=>{
 const h=host();await h.load();await h.fire('session.start');await h.fire('turn.start',{turnId:'parallel'});await h.render(true);
 const a=await approvalTool(h,'unprompted',{command:'synthetic long'}),b=await approvalTool(h,'prompted',{command:'synthetic short'});
 await h.fire('classic.PermissionRequest',{tool_name:'Bash',tool_input:{command:'synthetic short'}});
 expect(h.companion().approvals[0].ids).toEqual(['prompted']);
 await h.fire('classic.PostToolUse',{tool_name:'Bash',tool_use_id:first});
 const chosen=first==='prompted'?b:a;chosen.release({kept:first});expect(await chosen.pending).toEqual({kept:first});
 const before=h.companion().x;await h.advance(480);
 if(first==='prompted'){expect(h.companion().waiting).toEqual([]);expect(h.companion().x).not.toBe(before);}else{expect(h.companion().waiting).toEqual(['Bash']);expect(h.companion().x).toBe(before);}
 const remaining=first==='prompted'?a:b;remaining.release({kept:'last'});await remaining.pending;expect(h.companion().waiting).toEqual([]);
});
for(const behavior of ['allow','deny'])test('explicit '+behavior+' settles only its own request, even with identical parallel inputs',async()=>{
 const h=host();await h.load();await h.fire('session.start');await h.fire('turn.start',{turnId:'decisions'});await h.render(true);
 const input={command:'synthetic identical'},a=await approvalTool(h,'a',input),b=await approvalTool(h,'b',input);
 let entered,settle;const reached=new Promise(resolve=>entered=resolve),answer=new Promise(resolve=>settle=resolve);
 const request=h.fire('classic.PermissionRequest',{tool_name:'Bash',tool_input:input},()=>{entered();return answer;});await reached;
 await h.fire('classic.PermissionRequest',{tool_name:'Bash',tool_input:input});expect(h.companion().approvals.length).toBe(2);
 const result={decision:{behavior,...behavior==='deny'?{message:'synthetic denial'}:{updatedInput:input}}};settle(result);expect(await request).toBe(result);
 expect(h.companion().approvals.length).toBe(1);const before=h.companion().x;await h.advance(480);expect(h.companion().x).toBe(before);
 a.release({kept:'a'});await a.pending;expect(h.companion().waiting).toEqual(['Bash']);b.release({kept:'b'});await b.pending;expect(h.companion().waiting).toEqual([]);
});
test('tool.check uses the permission input after rewriting and persists no tool arguments or fingerprints',async()=>{
 const h=host();await h.load();await h.fire('session.start');await h.fire('turn.start',{turnId:'rewrite'});await h.render(true);
 const a=await approvalTool(h,'a',{command:'synthetic-original'}),b=await approvalTool(h,'b',{command:'synthetic-rewritten',nested:{b:2,a:1}},{command:'synthetic-original'});
 await h.fire('classic.PermissionRequest',{tool_name:'Bash',tool_input:{nested:{a:1,b:2},command:'synthetic-rewritten'}});
 expect(h.companion().approvals[0].ids).toEqual(['b']);expect(JSON.stringify([...h.runtime])).not.toContain('synthetic-');expect(JSON.stringify([...h.saved])).not.toContain('synthetic-');
 expect(Object.keys(h.companion().approvals[0]).sort()).toEqual(['ids','token','tool']);
 await h.fire('classic.PostToolUseFailure',{tool_name:'Bash',tool_use_id:'b'});expect(h.companion().waiting).toEqual([]);
 b.release({kept:'b'});await b.pending;a.release({kept:'a'});await a.pending;
});
test('identical input matching keeps its uncertain candidate group until all candidates finish',async()=>{
 const h=host();await h.load();await h.fire('session.start');await h.fire('turn.start',{turnId:'ambiguous'});await h.render(true);
 const input={command:'synthetic identical'},a=await approvalTool(h,'a',input),b=await approvalTool(h,'b',input);
 await h.fire('classic.PermissionRequest',{tool_name:'Bash',tool_input:input});expect(h.companion().approvals[0].ids).toEqual(['a','b']);
 await h.fire('classic.PermissionDenied',{tool_name:'Bash',tool_use_id:'b'});expect(h.companion().approvals[0].ids).toEqual(['a']);expect(h.companion().waiting).toEqual(['Bash']);
 a.release({kept:'a'});await a.pending;expect(h.companion().waiting).toEqual([]);b.release({kept:'b'});await b.pending;
});
test('request identity survives reload and old tool completions cannot change the new owner',async()=>{
 const h=host({snapshotReads:true});await h.load();await h.fire('session.start');await h.fire('turn.start',{turnId:'reload-approval'});await h.render(true);
 const a=await approvalTool(h,'unprompted',{command:'synthetic long'}),b=await approvalTool(h,'prompted',{command:'synthetic short'});
 await h.fire('classic.PermissionRequest',{tool_name:'Bash',tool_input:{command:'synthetic short'}});const token=h.companion().approvals[0].token;
 await h.load();await h.render(true);await h.advance(1);expect(h.companion().approvals).toEqual([{token,tool:'Bash',ids:['prompted']}]);
 await h.fire('classic.PostToolUse',{tool_name:'Bash',tool_use_id:'prompted'});expect(h.companion().waiting).toEqual([]);const before=h.companion().x;await h.advance(480);expect(h.companion().x).not.toBe(before);
 const stable=structuredClone([...h.runtime]);a.release({kept:'old a'});b.release({kept:'old b'});await Promise.all([a.pending,b.pending]);expect([...h.runtime]).toEqual(stable);
});
test('an old permission decision cannot clear a later turn request and tool errors still propagate',async()=>{
 const h=host();await h.load();await h.fire('session.start');await h.fire('turn.start',{turnId:'old'});await h.render(true);
 const a=await approvalTool(h,'old-call',{command:'synthetic old'});let enter,release;const reached=new Promise(resolve=>enter=resolve),answer=new Promise(resolve=>release=resolve);
 const request=h.fire('classic.PermissionRequest',{tool_name:'Bash',tool_input:{command:'synthetic old'}},()=>{enter();return answer;});await reached;
 await h.fire('turn.abort',{turnId:'old'});await h.fire('turn.start',{turnId:'new'});const b=await approvalTool(h,'new-call',{command:'synthetic new'});
 await h.fire('classic.PermissionRequest',{tool_name:'Bash',tool_input:{command:'synthetic new'}});const current=structuredClone(h.companion().approvals);
 release({decision:{behavior:'allow'}});await request;expect(h.companion().approvals).toEqual(current);a.release({kept:'old'});await a.pending;expect(h.companion().approvals).toEqual(current);
 b.release({kept:'new'});await b.pending;const failure=Error('synthetic failure');
 await expect(h.fire('tool.call',{tool:'Bash',tool_use_id:'error'},async()=>{await h.fire('classic.PermissionRequest',{tool_name:'Bash'});throw failure;})).rejects.toBe(failure);expect(h.companion().waiting).toEqual([]);
});
