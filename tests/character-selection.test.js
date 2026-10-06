import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {AsyncLocalStorage} from 'node:async_hooks';

// Evaluate the staged sources in isolated memory. The generated production
// entry belongs to the renderer/build task and is deliberately not rewritten.
const source=['../src/timer-core.js','../src/native-raster.js','../src/companion-core.js','../hooks/integration.js']
 .map(name=>readFileSync(resolve(import.meta.dir,name),'utf8').replace(/^export (?=const |function )/gm,''))
 .join('\n');
const clone=value=>structuredClone(value);
const preferencesKey='companion:preferences';
const pausedTimer=(overrides={})=>({version:1,phase:'focus',remaining:543210,completed:2,status:'paused',motion:0,visible:true,...overrides});
const runtimeCat=character=>({version:1,owner:'previous-owner',active:false,reason:'idle',turnId:null,waiting:[],tools:[],x:0,direction:1,frame:0,reduced:false,character});

function host({snapshotReads=false}={}){
 const saved=new Map(),runtime=new Map(),clocks=new Map(),writes=[],registered=[],failedCAS=[],reads=new AsyncLocalStorage();
 let session='selection-session',now=0,clockId=0,drawing=false,hooks=new Map(),nextPreferencesRead=null,nextPreferencesWrite=null,nextCompanionWrite=null;
 const address=reference=>reference.key+':'+reference.id;
 const dispatch=fn=>snapshotReads?reads.run(new Map(),fn):fn();
 const $={
  command:{list:async()=>[{name:'focus-cat',plugin:'focus-cat-companion@inline'}],register:async value=>registered.push(clone(value))},
  session:{id:async()=>session},
  store:{get:async key=>{
   const value=clone(saved.get(key));
   if(key===preferencesKey&&nextPreferencesRead){const blocked=nextPreferencesRead;nextPreferencesRead=null;blocked.enter();await blocked.released;}
   return value;
  },set:async(key,value)=>{saved.set(key,clone(value));writes.push({kind:'store',key,value:clone(value)});if(key===preferencesKey&&nextPreferencesWrite){const blocked=nextPreferencesWrite;nextPreferencesWrite=null;blocked.enter();await blocked.released;}}},
  state:{get:async reference=>{
   const key=address(reference),snapshot=reads.getStore();
   if(snapshot?.has(key))return snapshot.get(key);
   const value=clone(runtime.get(key)||{value:undefined,version:0});
   if(snapshot)snapshot.set(key,value);
   return value;
  },set:async(reference,value,options={})=>{
   if(drawing)throw Error('state write during drawing');
   const key=address(reference),previous=runtime.get(key)||{version:0};
   if(options.ifVersion!==undefined&&options.ifVersion!==previous.version){failedCAS.push({key,expected:options.ifVersion,actual:previous.version});return{isSet:false,version:previous.version};}
   const version=previous.version+1;runtime.set(key,{value:clone(value),version});
   writes.push({kind:'state',key:reference.key,id:reference.id,value:clone(value)});
   if(reference.key==='companionRuntime'&&nextCompanionWrite){const blocked=nextCompanionWrite;nextCompanionWrite=null;blocked.enter();await blocked.released;}
   return{isSet:true,version};
  }},
  clock:{now:async()=>now,every:(ms,fn)=>schedule(ms,fn,true),after:(ms,fn)=>schedule(ms,fn,false)},
  ui:{invalidate:()=>{},resolve:()=>({Box:props=>({type:'Box',props,children:props.children}),Text:props=>({type:'Text',props,children:props.children}),Raster:props=>({type:'Raster',props,children:[]})})},
 };
 function schedule(ms,fn,repeat){const id=++clockId;clocks.set(id,{ms,fn:()=>dispatch(fn),at:now+ms,repeat});return{cancel:()=>clocks.delete(id)};}
 function load(){clocks.clear();hooks=new Map();const register=new Function(source+'\nreturn register;')();register((name,...args)=>hooks.set(name,args.at(-1)));}
 const fire=(name,event={},next=async()=>({unchanged:true}))=>dispatch(()=>hooks.get(name)($,event,next));
 const command=args=>fire('command.run',{args});
 async function render(){drawing=true;try{return await fire('ui.render',{surface:'terminal',props:{hasSurvey:false,isWorking:false,bodyColumns:80,maxRows:8}},async()=>({type:'engine',id:'native-empty-slot'}));}finally{drawing=false;}}
 async function advance(ms){const end=now+ms;while(true){const entry=[...clocks].sort((a,b)=>a[1].at-b[1].at)[0];if(!entry||entry[1].at>end)break;now=entry[1].at;if(!entry[1].repeat)clocks.delete(entry[0]);await entry[1].fn();if(clocks.has(entry[0]))entry[1].at=now+entry[1].ms;}now=end;}
 function blockNextPreferencesRead(){let enter,release;const entered=new Promise(resolve=>enter=resolve),released=new Promise(resolve=>release=resolve);nextPreferencesRead={enter,released};return{entered,release};}
 function blockNextPreferencesWrite(){let enter,release;const entered=new Promise(resolve=>enter=resolve),released=new Promise(resolve=>release=resolve);nextPreferencesWrite={enter,released};return{entered,release};}
 function blockNextCompanionWrite(){let enter,release;const entered=new Promise(resolve=>enter=resolve),released=new Promise(resolve=>release=resolve);nextCompanionWrite={enter,released};return{entered,release};}
 const companion=()=>runtime.get('companionRuntime:'+session)?.value;
 const timerWrites=()=>writes.filter(write=>write.kind==='store'?write.key.startsWith('timer:'):write.key==='timerRuntime');
 return{load,fire,command,render,advance,saved,runtime,clocks,writes,registered,failedCAS,companion,timerWrites,blockNextPreferencesRead,blockNextPreferencesWrite,blockNextCompanionWrite,setSession:value=>session=value};
}

test('local character commands select A/B and status without timer writes',async()=>{
 const h=host({snapshotReads:true});h.saved.set('timer:selection-session',pausedTimer());h.load();
 expect(await h.command('character status')).toEqual({text:'Cat character A.'});
 expect(h.registered[0].description).toContain('character a/b/status');
 expect(await h.command(' CHARACTER B ')).toEqual({text:'Cat character B.'});
 expect(h.companion().character).toBe('b');expect(h.saved.get(preferencesKey)).toEqual({character:'b'});
 expect(await h.command('character status')).toEqual({text:'Cat character B.'});
 expect(await h.command('character a')).toEqual({text:'Cat character A.'});expect(h.companion().character).toBe('a');
 const before=clone([...h.saved]);expect((await h.command('character c')).text).toContain('character a | character b | character status');
 expect([...h.saved]).toEqual(before);expect(h.timerWrites()).toEqual([]);expect(h.saved.get('timer:selection-session')).toEqual(pausedTimer());
});

test('motion and selection preserve each other and unknown preference fields',async()=>{
 const h=host(),original={character:'b',reduced:false,future:{anchor:'tail',scale:3},other:['keep',7]};
 h.saved.set(preferencesKey,clone(original));h.load();await h.fire('session.start');
 expect(h.companion().character).toBe('b');
 await h.command('motion off');expect(h.saved.get(preferencesKey)).toEqual({...original,reduced:true});
 await h.command('character a');expect(h.saved.get(preferencesKey)).toEqual({...original,reduced:true,character:'a'});
 await h.command('motion on');expect(h.saved.get(preferencesKey)).toEqual({...original,character:'a'});
 expect(h.companion().character).toBe('a');expect(h.companion().reduced).toBe(false);expect(h.timerWrites()).toEqual([]);
});

test('reset/restart affect only timer state; character changes leave a running timer untouched',async()=>{
 const h=host();h.saved.set(preferencesKey,{character:'b',reduced:true,future:{keep:true}});h.load();await h.fire('session.start');
 await h.command('restart');await h.advance(1000);
 const running=clone(h.runtime.get('timerRuntime:selection-session')),stored=clone(h.saved.get('timer:selection-session')),timerWrites=h.timerWrites().length;
 expect(running.value.status).toBe('running');expect(running.value.remaining).toBe(1499000);
 await h.command('character a');await h.command('character status');
 expect(h.runtime.get('timerRuntime:selection-session')).toEqual(running);expect(h.saved.get('timer:selection-session')).toEqual(stored);expect(h.timerWrites().length).toBe(timerWrites);
 expect(h.clocks.size).toBe(1);expect(h.companion().character).toBe('a');
 const preferences=clone(h.saved.get(preferencesKey));await h.command('reset');
 expect(h.saved.get(preferencesKey)).toEqual(preferences);expect(h.companion().character).toBe('a');expect(h.companion().reduced).toBe(true);
 expect(h.runtime.get('timerRuntime:selection-session').value.status).toBe('idle');expect(h.saved.get('timer:selection-session').remaining).toBe(1500000);expect(h.clocks.size).toBe(0);
 await h.command('restart');expect(h.saved.get(preferencesKey)).toEqual(preferences);expect(h.companion().character).toBe('a');expect(h.runtime.get('timerRuntime:selection-session').value.status).toBe('running');
});

test('selection and motion persist across reload and new-session activation',async()=>{
 const h=host({snapshotReads:true});h.load();await h.fire('session.start');await h.command('character b');await h.command('motion off');
 const prefs=clone(h.saved.get(preferencesKey));h.load();await h.fire('session.start');
 expect(h.companion().character).toBe('b');expect(h.companion().reduced).toBe(true);expect(h.saved.get(preferencesKey)).toEqual(prefs);
 h.saved.set('timer:selection-next',pausedTimer({phase:'short',remaining:123456,completed:3}));
 h.setSession('selection-next');await h.fire('classic.SessionStart',{source:'clear'});
 expect(h.companion().character).toBe('b');expect(h.companion().reduced).toBe(true);expect(h.saved.get(preferencesKey)).toEqual(prefs);
 expect(h.saved.get('timer:selection-next')).toEqual(pausedTimer({phase:'short',remaining:123456,completed:3}));
 await h.command('character a');h.setSession('selection-session');await h.fire('classic.SessionStart',{source:'resume'});
 expect(h.companion().character).toBe('a');expect(h.companion().reduced).toBe(true);
});

test('valid stored preferences take priority over stale runtime character on reload',async()=>{
 const h=host();h.saved.set(preferencesKey,{character:'b',reduced:true});h.runtime.set('companionRuntime:selection-session',{value:runtimeCat('a'),version:4});h.load();
 await h.fire('session.start');expect(h.companion().character).toBe('b');expect(h.companion().reduced).toBe(true);
 await h.command('character a');h.load();await h.fire('session.start');expect(h.companion().character).toBe('a');
});

test('invalid stored character defaults to A without rewriting stored unknown fields',async()=>{
 for(const invalid of ['c','B',null,42,{}]){
  const h=host(),prefs={character:invalid,reduced:true,future:{keep:'unchanged'}};
  h.saved.set(preferencesKey,clone(prefs));h.runtime.set('companionRuntime:selection-session',{value:runtimeCat('b'),version:2});h.load();
  expect(await h.command('character status')).toEqual({text:'Cat character A.'});expect(h.companion().character).toBe('a');
  expect(h.companion().reduced).toBe(true);expect(h.saved.get(preferencesKey)).toEqual(prefs);expect(h.timerWrites()).toEqual([]);
 }
});

test('legacy preferences permit runtime restoration; invalid or absent runtime character defaults to A',async()=>{
 for(const [stored,expected] of [['b','b'],['a','a'],['invalid','a'],[undefined,'a']]){
  const h=host();h.saved.set(preferencesKey,{reduced:true,future:{keep:true}});h.runtime.set('companionRuntime:selection-session',{value:runtimeCat(stored),version:3});h.load();
  await h.fire('session.start');expect(h.companion().character).toBe(expected);expect(h.companion().reduced).toBe(true);expect(h.timerWrites()).toEqual([]);
 }
});

test('parallel character and motion commands serialize preference merges',async()=>{
 const h=host(),unknown={custom:{nested:['preserve']}};h.saved.set(preferencesKey,{character:'a',reduced:false,...unknown});h.load();await h.fire('session.start');
 const responses=await Promise.all([h.command('character b'),h.command('motion off')]);
 expect(responses).toEqual([{text:'Cat character B.'},{text:'Cat motion off.'}]);
 expect(h.saved.get(preferencesKey)).toEqual({character:'b',reduced:true,...unknown});expect(h.companion().character).toBe('b');expect(h.companion().reduced).toBe(true);expect(h.timerWrites()).toEqual([]);
});

test('a pending same-owner clock CAS cannot reject a preference command after its store write',async()=>{
 const h=host();h.saved.set(preferencesKey,{character:'a',reduced:false,future:'keep'});h.load();await h.fire('session.start');await h.fire('turn.start',{turnId:'clock-overlap'});
 const stored=h.blockNextPreferencesWrite(),selection=h.command('character b');await stored.entered;
 const companion=h.blockNextCompanionWrite(),clock=h.advance(240);await companion.entered;
 const failures=h.failedCAS.length;stored.release();
 // Drain the competing command while the successful clock CAS response is
 // held. The host state is already v+1 but this module has not received it.
 for(let i=0;i<30;i++)await Promise.resolve();
 const failedWhilePending=h.failedCAS.length-failures;companion.release();await clock;
 expect(await selection).toEqual({text:'Cat character B.'});expect(failedWhilePending).toBe(0);
 expect(h.saved.get(preferencesKey)).toEqual({character:'b',reduced:false,future:'keep'});expect(h.companion().character).toBe('b');expect(h.timerWrites()).toEqual([]);
});

test('the shared CAS queue preserves deferred first-drawing claim and restored timer clocks',async()=>{
 const h=host({snapshotReads:true});h.saved.set('timer:selection-session',pausedTimer());
 h.runtime.set('timerRuntime:selection-session',{value:{...pausedTimer(),status:'running',last:0},version:1});h.load();
 await h.render();expect(h.writes).toEqual([]);expect([...h.clocks.values()].map(clock=>clock.ms)).toEqual([1]);
 await h.advance(1);expect(h.companion().character).toBe('a');expect([...h.clocks.values()].map(clock=>clock.ms)).toEqual([1000]);expect(h.timerWrites()).toEqual([]);
});

test('a delayed old successful CAS response cannot overwrite the new module owner',async()=>{
 const h=host();h.saved.set(preferencesKey,{character:'a',reduced:false,future:'keep'});h.load();await h.fire('session.start');await h.fire('turn.start',{turnId:'old-clock'});
 const blocked=h.blockNextCompanionWrite(),oldClock=h.advance(240);await blocked.entered;
 h.load();await h.fire('session.start');await h.command('character b');
 const beforeStore=clone([...h.saved]),beforeRuntime=clone([...h.runtime]),beforeWrites=h.writes.length;
 blocked.release();await oldClock;
 expect([...h.saved]).toEqual(beforeStore);expect([...h.runtime]).toEqual(beforeRuntime);expect(h.writes.length).toBe(beforeWrites);expect(h.companion().character).toBe('b');expect(h.timerWrites()).toEqual([]);
});

test('old preferences read cannot write after reload claims a new owner',async()=>{
 const h=host({snapshotReads:true});h.saved.set(preferencesKey,{character:'a',reduced:false,future:'keep'});h.load();await h.fire('session.start');
 const blocked=h.blockNextPreferencesRead(),old=h.command('character b');await blocked.entered;
 h.load();await h.fire('session.start');await h.command('motion off');
 const beforeStore=clone([...h.saved]),beforeRuntime=clone([...h.runtime]),beforeWrites=h.writes.length;
 blocked.release();expect((await old).text).toContain('changed during reload');
 expect([...h.saved]).toEqual(beforeStore);expect([...h.runtime]).toEqual(beforeRuntime);expect(h.writes.length).toBe(beforeWrites);
 expect(h.companion().character).toBe('a');expect(h.companion().reduced).toBe(true);expect(h.timerWrites()).toEqual([]);
});

test('session boundary releases the new preference queue and rejects the old pending motion callback',async()=>{
 const h=host();h.saved.set(preferencesKey,{character:'a',reduced:false,future:'keep'});h.load();await h.fire('session.start');
 const blocked=h.blockNextPreferencesRead(),old=h.command('motion off');await blocked.entered;
 h.setSession('selection-next');await h.fire('classic.SessionStart',{source:'fork'});await h.command('character b');
 const beforeStore=clone([...h.saved]),beforeRuntime=clone([...h.runtime]),beforeWrites=h.writes.length;
 blocked.release();expect((await old).text).toContain('changed during reload');
 expect([...h.saved]).toEqual(beforeStore);expect([...h.runtime]).toEqual(beforeRuntime);expect(h.writes.length).toBe(beforeWrites);
 expect(h.companion().character).toBe('b');expect(h.companion().reduced).toBe(false);expect(h.saved.get(preferencesKey)).toEqual({character:'b',reduced:false,future:'keep'});
});
