import {expect,mock,test} from 'claude-code/testing';

// These are synthetic host events. No real model, tool, permission dialog, or
// user storage is used. The test's Engine $ accepts full call-site event inputs.
const BASE={plugin:'focus-cat-companion',surface:'terminal',component:'AbovePrompt',viewport:{columns:80,rows:30,isFullscreen:false},props:{hasSurvey:false,isWorking:true,maxRows:4,bodyColumns:40,scroll:{offset:0,bodyRows:4},view:{}}} as const;
function setup(on){
 const store=new Map(),runtime=new Map(),clock=mock.clock(on),controls={tool:null,permission:null};
 on('state.get',($,e)=>({value:runtime.get(e.key)||{value:undefined,version:0}}));
 on('state.set',($,e)=>{const previous=runtime.get(e.key)||{version:0};if(e.ifVersion!==undefined&&e.ifVersion!==previous.version)return{value:{isSet:false,version:previous.version}};const version=previous.version+1;runtime.set(e.key,{value:e.value,version});return{value:{isSet:true,version}};});
 on('store.get',($,e)=>({value:store.get(e.key)}));on('store.set',($,e)=>{store.set(e.key,e.value);return{value:undefined};});
 on('session.id',()=>({value:'isolated-approval-lifecycle'}));on('command.list',()=>({value:[]}));on('command.register',()=>({value:{command:'focus-cat'}}));
 on('session.start',()=>({cwd:'/isolated'}));on('turn.start',($,e)=>({turnId:e.turnId}));on('turn.abort',()=>({value:undefined}));
 on('tool.call',($,e)=>controls.tool($,e));on('tool.check',()=>({decision:'ask'}));on('classic.PermissionRequest',($,e)=>controls.permission?controls.permission(e):({}));
 for(const event of ['classic.PostToolUse','classic.PostToolUseFailure','classic.PermissionDenied'])on(event,()=>({}));
 on('ui.render',()=>({type:'engine',ref:0}));return{clock,store,runtime,controls,cat:()=>runtime.get('companionRuntime').value};
}
const gate=()=>{let release;const promise=new Promise(resolve=>release=resolve);return{promise,release};};
async function start($){await $.session.start({surface:'terminal',isInteractive:true,cwd:'/isolated'});await $.turn.start({turnId:'approval-turn',text:'synthetic only'});return $.ui.mount(BASE);}
for(const behavior of ['allow','deny'])test('explicit '+behavior+' resumes walking while the approved tool still runs',async($,on)=>{
 const h=setup(on),ui=await start($),entered=gate(),result=gate();
 h.controls.permission=()=>({decision:{behavior}});
 h.controls.tool=async(_,e)=>{await $.tool.check({tool:e.tool,tool_use_id:e.tool_use_id,input:{command:e.command}});const permission=await $.classic.PermissionRequest({tool_name:'Bash',tool_input:{command:e.command}});expect(permission.decision.behavior).toBe(behavior);entered.release();return result.promise;};
 const pending=$.tool.call({tool:'Bash',command:'synthetic decision',tool_use_id:'decision-call'});await entered.promise;
 expect(h.cat().waiting).toEqual([]);const before=h.cat().x;await h.clock.advance(480);expect(h.cat().x).not.toBe(before);
 result.release({result:{kept:true},text:'kept tool result'});expect((await pending).text).toBe('kept tool result');await ui.unmount();
});
for(const first of ['prompted','unprompted'])test('same-name parallel approval follows its matching call when '+first+' completes first',async($,on)=>{
 const h=setup(on),ui=await start($),enteredA=gate(),enteredB=gate(),resultA=gate(),resultB=gate();
 h.controls.tool=async(_,e)=>{await $.tool.check({tool:e.tool,tool_use_id:e.tool_use_id,input:{command:e.command}});if(e.command==='synthetic short'){await $.classic.PermissionRequest({tool_name:'Bash',tool_input:{command:e.command}});enteredB.release();return resultB.promise;}enteredA.release();return resultA.promise;};
 const a=$.tool.call({tool:'Bash',command:'synthetic long',tool_use_id:'unprompted'});await enteredA.promise;
 const b=$.tool.call({tool:'Bash',command:'synthetic short',tool_use_id:'prompted'});await enteredB.promise;expect(h.cat().approvals[0].ids).toEqual(['prompted']);
 await $.classic.PostToolUse({tool_name:'Bash',tool_use_id:first,tool_input:{},tool_response:{}});
 const chosen=first==='prompted'?resultB:resultA;chosen.release({result:{kept:first},text:'kept result'});await(first==='prompted'?b:a);
 const before=h.cat().x;await h.clock.advance(480);
 if(first==='prompted'){expect(h.cat().waiting).toEqual([]);expect(h.cat().x).not.toBe(before);}else{expect(h.cat().waiting).toEqual(['Bash']);expect(h.cat().x).toBe(before);}
 (first==='prompted'?resultA:resultB).release({result:{kept:'last'},text:'kept last result'});await(first==='prompted'?a:b);expect(h.cat().waiting).toEqual([]);await ui.unmount();
});
test('permission input after a tool rewrite is matched canonically and is never stored',async($,on)=>{
 const h=setup(on),ui=await start($),enteredA=gate(),enteredB=gate(),resultA=gate(),resultB=gate();
 h.controls.tool=async(_,e)=>{const input=e.tool_use_id==='a'?{command:'private-synthetic-original'}:{command:'private-synthetic-rewritten',nested:{b:2,a:1}};await $.tool.check({tool:e.tool,tool_use_id:e.tool_use_id,input});if(e.tool_use_id==='b'){await $.classic.PermissionRequest({tool_name:'Bash',tool_input:{nested:{a:1,b:2},command:'private-synthetic-rewritten'}});enteredB.release();return resultB.promise;}enteredA.release();return resultA.promise;};
 const a=$.tool.call({tool:'Bash',command:'private-synthetic-original',tool_use_id:'a'});await enteredA.promise;
 const b=$.tool.call({tool:'Bash',command:'private-synthetic-original',tool_use_id:'b'});await enteredB.promise;
 expect(h.cat().approvals[0].ids).toEqual(['b']);expect(JSON.stringify([...h.runtime])).not.toContain('private-synthetic-');expect(JSON.stringify([...h.store])).not.toContain('private-synthetic-');
 await $.classic.PermissionDenied({tool_name:'Bash',tool_use_id:'b',tool_input:{},reason:'synthetic denial'});expect(h.cat().waiting).toEqual([]);
 resultB.release({deny:'kept denial'});expect((await b).deny).toBe('kept denial');resultA.release({result:{kept:true},text:'kept long result'});await a;await ui.unmount();
});
test('an explicit decision leaves another overlapping same-name request waiting',async($,on)=>{
 const h=setup(on),ui=await start($),enteredA=gate(),enteredB=gate(),resultA=gate(),resultB=gate(),requestEntered=gate(),decision=gate();let count=0;
 h.controls.permission=()=>++count===1?(requestEntered.release(),decision.promise):({});
 h.controls.tool=async(_,e)=>{await $.tool.check({tool:e.tool,tool_use_id:e.tool_use_id,input:{command:e.command}});if(e.tool_use_id==='a'){enteredA.release();return resultA.promise;}enteredB.release();return resultB.promise;};
 const a=$.tool.call({tool:'Bash',command:'synthetic identical',tool_use_id:'a'});await enteredA.promise;const b=$.tool.call({tool:'Bash',command:'synthetic identical',tool_use_id:'b'});await enteredB.promise;
 const request=$.classic.PermissionRequest({tool_name:'Bash',tool_input:{command:'synthetic identical'}});await requestEntered.promise;
 await $.classic.PermissionRequest({tool_name:'Bash',tool_input:{command:'synthetic identical'}});expect(h.cat().approvals.length).toBe(2);
 decision.release({decision:{behavior:'allow'}});await request;expect(h.cat().approvals.length).toBe(1);const before=h.cat().x;await h.clock.advance(480);expect(h.cat().x).toBe(before);
 resultA.release({result:{kept:true}});await a;expect(h.cat().waiting).toEqual(['Bash']);resultB.release({result:{kept:true}});await b;expect(h.cat().waiting).toEqual([]);await ui.unmount();
});
