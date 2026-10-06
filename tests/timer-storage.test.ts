import {expect,mock,test} from 'claude-code/testing';

function setup(on){
 const store=new Map(),runtime=new Map(),clock=mock.clock(on);let conflicts=0;
 on('state.get',($,e)=>({value:runtime.get(e.key)||{value:undefined,version:0}}));
 on('state.set',($,e)=>{
  const old=runtime.get(e.key)||{version:0};
  if(e.key==='timerRuntime'&&conflicts>0){conflicts--;const version=old.version+1;runtime.set(e.key,{...old,version});return {value:{isSet:false,version}};}
  if(e.ifVersion!==undefined&&e.ifVersion!==old.version)return {value:{isSet:false,version:old.version}};
  const version=old.version+1;runtime.set(e.key,{value:e.value,version});return {value:{isSet:true,version}};
 });
 on('store.get',($,e)=>({value:store.get(e.key)}));on('store.set',($,e)=>{store.set(e.key,e.value);return {value:undefined};});
 on('session.id',()=>({value:'synthetic-timer-storage'}));on('session.start',()=>({cwd:'/synthetic'}));
 on('command.list',()=>({value:[]}));on('command.register',()=>({value:{command:'focus-cat'}}));
 return {clock,runtime,conflict:n=>conflicts=n};
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
