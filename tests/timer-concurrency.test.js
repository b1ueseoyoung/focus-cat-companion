import {test,expect} from 'bun:test';
import {resolve} from 'node:path';
import {AsyncLocalStorage} from 'node:async_hooks';
let loadId=0;
const gate=()=>{let enter,release;return {entered:new Promise(r=>enter=r),released:new Promise(r=>release=r),enter:()=>enter(),release:()=>release()};};
function host(){
 const saved=new Map([['timer:synthetic',{version:1,phase:'focus',remaining:60000,completed:0,status:'paused',motion:0,visible:true}]]),runtime=new Map(),clocks=new Map(),reads=new AsyncLocalStorage();
 let hooks=new Map(),now=0,id=0,nextWrite=null,nextRead=null,conflicts=0;
 const $={command:{list:async()=>[],register:async()=>{}},session:{id:async()=> 'synthetic'},
  store:{get:async k=>structuredClone(saved.get(k)),set:async(k,v)=>saved.set(k,structuredClone(v))},
  state:{get:async r=>{const cache=reads.getStore();if(cache?.has(r.key))return cache.get(r.key);const value=structuredClone(runtime.get(r.key)||{version:0});cache?.set(r.key,value);if(r.key==='timerRuntime'&&nextRead){const f=nextRead;nextRead=null;await f();}return value;},set:async(r,v,o={})=>{
   if(r.key==='timerRuntime'&&nextWrite){const g=nextWrite;nextWrite=null;g.enter();await g.released;}
   let old=runtime.get(r.key)||{version:0};
   if(r.key==='timerRuntime'&&conflicts>0){conflicts--;old={...old,version:old.version+1};runtime.set(r.key,old);return {isSet:false,version:old.version};}
   if(o.ifVersion!==undefined&&o.ifVersion!==old.version)return {isSet:false,version:old.version};
   runtime.set(r.key,{value:structuredClone(v),version:old.version+1});return {isSet:true,version:old.version+1};
  }},
  clock:{now:async()=>now,every:(ms,fn)=>{const key=++id;clocks.set(key,{ms,fn});return {cancel:()=>clocks.delete(key)};},after:()=>({cancel(){}})},ui:{invalidate(){}}};
 const fire=(name,e={})=>reads.run(new Map(),()=>hooks.get(name)($,e,async()=>({})));
 async function load(){clocks.clear();hooks=new Map();const m=await import(resolve(process.env.REVIEW_REPO||resolve(import.meta.dir,'..'),'hooks/register.js')+'?timer-test='+ ++loadId);m.register((name,...args)=>hooks.set(name,args.at(-1)));await fire('session.start');}
 return {load,fire,command:args=>fire('command.run',{args}),runtime,saved,clocks,setNow:n=>now=n,blockWrite(){return nextWrite=gate();},conflict:n=>conflicts=n,onRead:fn=>nextRead=fn,tick(){const c=[...clocks.values()].find(c=>c.ms===1000);return reads.run(new Map(),()=>c.fn());}};
}
for(const action of ['pause','reset','hide'])test(`a pending tick cannot overwrite ${action} or its reload state`,async()=>{
 const h=host();await h.load();await h.command('start');h.setNow(1000);
 const blocked=h.blockWrite(),tick=h.tick();await blocked.entered;
 // A read already issued by a competing dispatch may return its old snapshot
 // after the first write lands. A serialized implementation never issues it.
 h.onRead(async()=>{blocked.release();await tick;});
 const command=h.command(action);
 setImmediate(()=>blocked.release());await tick;
 const response=await command;expect(response.text).not.toContain('run the command again');
 const state=structuredClone(h.runtime.get('timerRuntime').value);
 expect(state.status).toBe(action==='reset'?'idle':'paused');expect(h.clocks.size).toBe(0);
 if(action==='reset')expect(state.remaining).toBe(1500000);
 if(action==='hide')expect(state.visible).toBe(false);
 await h.load();expect(h.clocks.size).toBe(0);
 expect((await h.command('status')).text).toContain(action==='reset'?'idle':'paused');
 expect(h.saved.get('timer:synthetic').remaining).toBe(state.remaining);
});
test('CAS conflict uses the returned version, despite dispatch read snapshots',async()=>{
 const h=host();await h.load();await h.command('start');h.conflict(1);
 expect((await h.command('pause')).text).toContain('paused');
 expect(h.runtime.get('timerRuntime').value.status).toBe('paused');
});
test('persistent CAS rejection is reported and does not poison later commands',async()=>{
 const h=host();await h.load();await h.command('start');h.conflict(4);
 expect((await h.command('pause')).text).toContain('run the command again');
 expect(h.runtime.get('timerRuntime').value.status).toBe('running');
 expect((await h.command('pause')).text).toContain('paused');
 expect(h.runtime.get('timerRuntime').value.status).toBe('paused');
});
