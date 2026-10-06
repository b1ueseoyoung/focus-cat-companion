import {expect,mock,test} from 'claude-code/testing';

function setup(on){
 const store=new Map(),runtime=new Map(),clock=mock.clock(on);let conflicts=0,loseOwner=false;
 on('state.get',($,e)=>({value:runtime.get(e.key)||{value:undefined,version:0}}));
 on('state.set',($,e)=>{
  const old=runtime.get(e.key)||{version:0};
  if(e.key==='timerRuntime'&&conflicts>0){conflicts--;const version=old.version+1;runtime.set(e.key,{...old,version});return {value:{isSet:false,version}};}
  if(e.ifVersion!==undefined&&e.ifVersion!==old.version)return {value:{isSet:false,version:old.version}};
  const version=old.version+1;runtime.set(e.key,{value:e.value,version});
  if(e.key==='timerRuntime'&&loseOwner){loseOwner=false;const held=runtime.get('companionRuntime');runtime.set('companionRuntime',{value:{...held.value,owner:'synthetic-replacement'},version:held.version+1});}
  return {value:{isSet:true,version}};
 });
 on('store.get',($,e)=>({value:store.get(e.key)}));on('store.set',($,e)=>{store.set(e.key,e.value);return {value:undefined};});
 on('session.id',()=>({value:'synthetic-timer-storage'}));on('session.start',()=>({cwd:'/synthetic'}));
 on('command.list',()=>({value:[]}));on('command.register',()=>({value:{command:'focus-cat'}}));
 return {clock,runtime,store,conflict:n=>conflicts=n,loseOwnerAfterTimerWrite:()=>loseOwner=true};
}
const command=($,args)=>$.command.run({command:'focus-cat',args});
test('pause commits despite a rejected host timer CAS',async($,on)=>{
 const h=setup(on);await $.session.start({surface:'terminal',isInteractive:true,cwd:'/synthetic'});await command($,'start');
 await h.clock.advance(1000);h.conflict(1);
 expect((await command($,'pause')).text).toContain('paused');
 expect(h.runtime.get('timerRuntime').value.status).toBe('paused');
 const remaining=h.runtime.get('timerRuntime').value.remaining;await h.clock.advance(2000);
 expect(h.runtime.get('timerRuntime').value.remaining).toBe(remaining);
});
test('repeated rejection is reported, and a later pause can succeed',async($,on)=>{
 const h=setup(on);await $.session.start({surface:'terminal',isInteractive:true,cwd:'/synthetic'});await command($,'start');h.conflict(4);
 expect((await command($,'pause')).text).toContain('run the command again');
 expect(h.runtime.get('timerRuntime').value.status).toBe('running');
 expect((await command($,'pause')).text).toContain('paused');
 expect(h.runtime.get('timerRuntime').value.status).toBe('paused');
});

test('a rejected next preserves completed focus and retry enters the break once',async($,on)=>{
 const h=setup(on);h.store.set('timer:synthetic-timer-storage',{version:1,phase:'focus',remaining:0,completed:1,status:'ready',motion:0,visible:true});
 await $.session.start({surface:'terminal',isInteractive:true,cwd:'/synthetic'});await command($,'status');
 h.conflict(4);expect((await command($,'next')).text).toContain('run the command again');
 expect((await command($,'status')).text).toContain('focus / ready');
 expect((await command($,'next')).text).toContain('short / idle');
 expect(h.runtime.get('timerRuntime').value.phase).toBe('short');expect(h.runtime.get('timerRuntime').value.remaining).toBe(300000);
 expect(h.store.get('timer:synthetic-timer-storage').phase).toBe('short');
});

test('ownership loss after timer commit reports an applied change without inviting a second next',async($,on)=>{
 const h=setup(on);h.store.set('timer:synthetic-timer-storage',{version:1,phase:'focus',remaining:0,completed:1,status:'ready',motion:0,visible:true});
 await $.session.start({surface:'terminal',isInteractive:true,cwd:'/synthetic'});await command($,'status');h.loseOwnerAfterTimerWrite();
 const response=await command($,'next');expect(response.text).toContain('check /focus-cat status');expect(response.text).not.toContain('run the command again');
 expect(h.runtime.get('timerRuntime').value.phase).toBe('short');expect(h.store.get('timer:synthetic-timer-storage').phase).toBe('focus');
});
