import {expect,mock,test} from 'claude-code/testing';

// Generated entry + official mocked SDK. These events neither submit a model
// prompt nor operate a real tool, user session, terminal, or data store.
const SESSION='isolated-completion-dance';
const BASE={plugin:'focus-cat-companion',surface:'terminal',component:'AbovePrompt',viewport:{columns:80,rows:30,isFullscreen:false},props:{hasSurvey:false,isWorking:true,maxRows:4,bodyColumns:40,scroll:{offset:0,bodyRows:4},view:{}}} as const;
function setup(on){
 const store=new Map(),runtime=new Map(),writes=[],stateWrites=[],controls={tool:null},clock=mock.clock(on);
 on('state.get',($,e)=>({value:runtime.get(e.key)||{value:undefined,version:0}}));
 on('state.set',($,e)=>{const old=runtime.get(e.key)||{version:0};if(e.ifVersion!==undefined&&e.ifVersion!==old.version)return{value:{isSet:false,version:old.version}};const version=old.version+1;runtime.set(e.key,{value:e.value,version});stateWrites.push(e.key);return{value:{isSet:true,version}};});
 on('store.get',($,e)=>({value:store.get(e.key)}));on('store.set',($,e)=>{store.set(e.key,e.value);writes.push(e.key);return{value:undefined};});
 on('session.id',()=>({value:SESSION}));on('command.list',()=>({value:[]}));on('command.register',()=>({value:{command:'focus-cat'}}));on('session.start',()=>({cwd:'/isolated'}));
 on('turn.start',($,e)=>({turnId:e.turnId}));on('turn.complete',($,e)=>({text:e.answer}));
 on('turn.step',async function*($,e){yield{kind:'text',index:0,text:'kept mocked stream'};return{turnId:e.turnId,index:e.index,answer:'kept mocked stream',toolUses:[],stopReason:'end_turn',usage:null};});
 on('tool.call',($,e)=>controls.tool?controls.tool($,e):({result:{original:true},text:'kept mocked result'}));
 for(const name of ['classic.PermissionRequest','classic.PermissionDenied','classic.PostToolUse','classic.PostToolUseFailure'])on(name,()=>({}));
 on('ui.render',()=>({type:'engine',ref:0}));
 return{store,runtime,writes,stateWrites,controls,clock,cat:()=>runtime.get('companionRuntime')?.value};
}
const start=$=>$.session.start({surface:'terminal',isInteractive:true,cwd:'/isolated'});
const command=($,args)=>$.command.run({command:'focus-cat',args});
const complete=($,turnId,extra={})=>$.turn.complete({turnId,answer:'kept completion',durationMs:1,isAborted:false,reason:'answer',...extra});
async function stream($,turnId){const iterator=$.turn.step({turnId,index:0,model:'mock only',messageCount:0});expect((await iterator.next()).value.text).toBe('kept mocked stream');const result=await iterator.next();expect(result.done).toBe(true);expect(result.value.answer).toBe('kept mocked stream');}
function raster(root){if(!root||typeof root!=='object')return null;if(root.type==='Raster')return root.props;for(const child of root.children||root.props?.children||[]){const found=raster(child);if(found)return found;}return null;}

for(const character of ['a','b'])test(character.toUpperCase()+' normal completion dances once for 960 ms despite early false/late true UI; timer stays independent',async($,on)=>{
 const h=setup(on);await start($);const ui=await $.ui.mount(BASE);await command($,'character '+character);await command($,'restart');
 const id='normal-'+character;await $.turn.start({turnId:id,text:'mock only'});await h.clock.advance(480);
 await ui.redraw({...BASE.props,isWorking:false});expect(h.cat().completionEligible).toBe(true);
 expect((await complete($,id)).text).toBe('kept completion');expect(h.cat().active).toBe(false);expect(h.cat().danceActive).toBe(true);expect(h.cat().danceFrame).toBe(0);expect(h.cat().completionEligible).toBe(false);expect(h.cat().lastCompletedTurnId).toBe(id);
 await ui.redraw({...BASE.props,isWorking:true});expect(h.cat().active).toBe(false);expect(h.cat().danceActive).toBe(true);
 await h.clock.advance(840);expect(h.cat().danceActive).toBe(true);expect(h.cat().danceFrame).toBe(7);
 await h.clock.advance(120);expect(h.cat().danceActive).toBe(false);expect(h.cat().danceHeld).toBe(false);expect(h.cat().danceFrame).toBe(0);
 expect(h.runtime.get('timerRuntime').value.status).toBe('running');expect(h.store.get('timer:'+SESSION).remaining).toBe(1499000);expect(h.store.get('timer:'+SESSION).completed).toBe(0);
 await complete($,id);await ui.redraw({...BASE.props,isWorking:true});expect(h.cat().active).toBe(false);expect(h.cat().danceActive).toBe(false);
 const before=h.stateWrites.filter(key=>key==='companionRuntime').length;await h.clock.advance(2000);
 // Only the independent timer's two 1-second callbacks may fence state now.
 expect(h.stateWrites.filter(key=>key==='companionRuntime').length-before).toBeLessThanOrEqual(6);
 expect(h.cat().danceActive).toBe(false);expect(h.store.get('timer:'+SESSION).remaining).toBe(1497000);
 await $.turn.start({turnId:id+'-next',text:'mock only'});expect(h.cat().active).toBe(true);expect(h.cat().completionEligible).toBe(true);expect(h.cat().danceActive).toBe(false);await ui.unmount();
});

test('unstarted, stale and subagent completions cannot dance; stepped main turn and duplicate completion keep one playback',async($,on)=>{
 const h=setup(on);await start($);const ui=await $.ui.mount(BASE);
 await complete($,'unstarted');expect(h.cat().danceActive).toBe(false);
 await $.turn.start({turnId:'eligible-main',text:'mock only'});const marker=h.cat().lastCompletedTurnId;
 await complete($,'stale-main');await complete($,'child',{agentId:'child'});
 expect(h.cat().active).toBe(true);expect(h.cat().completionEligible).toBe(true);expect(h.cat().danceActive).toBe(false);expect(h.cat().lastCompletedTurnId).toBe(marker);
 await stream($,'stepped-main');expect(h.cat().turnId).toBe('stepped-main');expect(h.cat().completionEligible).toBe(true);
 await complete($,'stepped-main');expect(h.cat().danceActive).toBe(true);await h.clock.advance(240);const frame=h.cat().danceFrame;
 expect(frame).toBe(2);await complete($,'stepped-main');expect(h.cat().danceFrame).toBe(frame);expect(h.cat().danceActive).toBe(true);
 await h.clock.advance(720);expect(h.cat().danceActive).toBe(false);expect(h.cat().danceFrame).toBe(0);await ui.unmount();
});

test('aborted, error, refusal and aborted-answer completions stop without dancing or lagging-UI resurrection',async($,on)=>{
 const h=setup(on);await start($);const ui=await $.ui.mount(BASE);
 for(const [reason,isAborted] of [['aborted',true],['error',false],['refusal',false],['answer',true]]){
  const id='failure-'+reason+'-'+isAborted;await $.turn.start({turnId:id,text:'mock only'});
  await complete($,id,{reason,isAborted,...(reason==='refusal'?{refusal:{category:null,explanation:null}}:{})});
  expect(h.cat().active).toBe(false);expect(h.cat().danceActive).toBe(false);expect(h.cat().completionEligible).toBe(false);
  await ui.redraw({...BASE.props,isWorking:true});expect(h.cat().active).toBe(false);await h.clock.advance(1000);expect(h.cat().danceActive).toBe(false);
 }
 expect(h.writes.filter(key=>key.startsWith('timer:')).length).toBe(0);await ui.unmount();
});

test('normal-looking completion while a tool approval is pending does not dance',async($,on)=>{
 const h=setup(on);await start($);const ui=await $.ui.mount(BASE);await $.turn.start({turnId:'approval-main',text:'mock only'});
 let entered,release;const reached=new Promise(resolve=>entered=resolve);
 h.controls.tool=async()=>{await $.classic.PermissionRequest({tool_name:'Bash',tool_input:{command:'mock only'}});entered();return await new Promise(resolve=>release=resolve);};
 const pending=$.tool.call({tool:'Bash',command:'mock only',tool_use_id:'approval-tool'});await reached;expect(h.cat().waiting).toContain('Bash');
 await ui.redraw({...BASE.props,isWorking:false});await h.clock.advance(1);expect(h.cat().waiting).toContain('Bash');expect(h.cat().tools.length).toBe(1);
 await complete($,'approval-main');expect(h.cat().danceActive).toBe(false);await h.clock.advance(960);expect(h.cat().danceActive).toBe(false);
 release({result:{original:true},text:'kept mocked result'});expect((await pending).text).toBe('kept mocked result');await ui.unmount();
});

for(const block of ['reduced','hidden','survey','short','narrow'])test(block+' suppresses completion dance and interrupts it without a later replay',async($,on)=>{
 const h=setup(on);await start($);const ui=await $.ui.mount(BASE);
 const setBlocked=async value=>{
  if(block==='reduced')await command($,value?'motion off':'motion on');
  else if(block==='hidden')await command($,value?'hide':'show');
  else await ui.redraw({...BASE.props,hasSurvey:block==='survey'&&value,maxRows:block==='short'&&value?3:4,bodyColumns:block==='narrow'&&value?7:40});
  await h.clock.advance(1);
 };
 await $.turn.start({turnId:block+'-suppressed',text:'mock only'});await setBlocked(true);await complete($,block+'-suppressed');expect(h.cat().danceActive).toBe(false);
 await setBlocked(false);await h.clock.advance(1000);expect(h.cat().danceActive).toBe(false);
 await $.turn.start({turnId:block+'-interrupted',text:'mock only'});await complete($,block+'-interrupted');expect(h.cat().danceActive).toBe(true);await h.clock.advance(360);
 const frame=h.cat().danceFrame;expect(frame).toBe(3);await setBlocked(true);
 expect(h.cat().danceActive).toBe(false);
 if(block==='reduced'){expect(h.cat().danceHeld).toBe(true);expect(h.cat().danceFrame).toBe(frame);const held=raster(await ui.drawn()).cells;await h.clock.advance(1000);expect(raster(await ui.drawn()).cells).toBe(held);}
 else{expect(h.cat().danceHeld).toBe(false);expect(h.cat().danceFrame).toBe(0);}
 await setBlocked(false);expect(h.cat().danceActive).toBe(false);expect(h.cat().danceHeld).toBe(false);await h.clock.advance(1000);expect(h.cat().danceActive).toBe(false);expect(h.cat().active).toBe(false);await ui.unmount();
});

for(const interruption of ['start','step','error'])test('a new '+interruption+' event cancels an in-progress dance',async($,on)=>{
 const h=setup(on);await start($);const ui=await $.ui.mount(BASE);await $.turn.start({turnId:'old-completed',text:'mock only'});await complete($,'old-completed');await h.clock.advance(240);expect(h.cat().danceActive).toBe(true);
 if(interruption==='start')await $.turn.start({turnId:'new-start',text:'mock only'});
 else if(interruption==='step')await stream($,'new-step');
 else await complete($,'old-completed',{reason:'error'});
 expect(h.cat().danceActive).toBe(false);expect(h.cat().danceHeld).toBe(false);expect(h.cat().danceFrame).toBe(0);
 expect(h.cat().active).toBe(interruption!=='error');await ui.unmount();
});
