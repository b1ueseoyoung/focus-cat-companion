import {expect,mock,test} from 'claude-code/testing';

// Official SDK test host events only. No model request, user terminal input,
// native paint, or real tool approval is performed by this suite.
const SESSION='isolated-four-row-raster';
const BASE={plugin:'focus-cat-companion',surface:'terminal',component:'AbovePrompt',viewport:{columns:80,rows:30,isFullscreen:false},props:{hasSurvey:false,isWorking:false,maxRows:4,bodyColumns:40,scroll:{offset:0,bodyRows:4},view:{}}} as const;
function setup(on){
 const store=new Map(),runtime=new Map(),storeWrites=[],stateWrites=[],controls={tool:null,other:null},clock=mock.clock(on);
 on('state.get',($,e)=>({value:runtime.get(e.key)||{value:undefined,version:0}}));
 on('state.set',($,e)=>{const old=runtime.get(e.key)||{version:0};if(e.ifVersion!==undefined&&e.ifVersion!==old.version)return{value:{isSet:false,version:old.version}};const version=old.version+1;runtime.set(e.key,{value:e.value,version});stateWrites.push(e.key);return{value:{isSet:true,version}};});
 on('store.get',($,e)=>({value:store.get(e.key)}));
 on('store.set',($,e)=>{store.set(e.key,e.value);storeWrites.push(e.key);return{value:undefined};});
 on('session.id',()=>({value:SESSION}));on('command.list',()=>({value:[]}));on('command.register',()=>({value:{command:'focus-cat'}}));
 on('session.start',()=>({cwd:'/isolated'}));on('turn.start',($,e)=>({turnId:e.turnId}));on('turn.complete',($,e)=>({text:e.answer}));
 on('tool.call',($,e)=>controls.tool?controls.tool($,e):({result:{original:true},text:'original mocked tool result'}));
 on('classic.PermissionRequest',()=>({}));on('classic.PermissionDenied',()=>({}));
 on('ui.render',()=>controls.other||({type:'engine',ref:0}));
 return{store,runtime,storeWrites,stateWrites,controls,clock};
}
const start=$=>$.session.start({surface:'terminal',isInteractive:true,cwd:'/isolated'});
const command=($,args)=>$.command.run({command:'focus-cat',args});
function nodes(root,type){
 if(!root||typeof root!=='object')return[];
 const children=root.children||root.props?.children||[];
 return[...(root.type===type?[root]:[]),...children.flatMap(child=>nodes(child,type))];
}
function rasterProps(root){return nodes(root,'Raster')[0]?.props;}
function decode(cells){
 const bytes=Uint8Array.from(atob(cells),character=>character.charCodeAt(0)),view=new DataView(bytes.buffer),result=[];
 for(let i=0;i<bytes.length;i+=12)result.push({glyph:view.getUint32(i,true),foreground:view.getUint32(i+4,true),background:view.getUint32(i+8,true)});
 return result;
}

test('official mocked mount uses complete four-row rasters and timer/hidden fallbacks without ASCII',async($,on)=>{
 const{clock,storeWrites,stateWrites}=setup(on);await start($);const ui=await $.ui.mount(BASE);
 for(const width of [0,1,7,8,14,15,40,80,512,513,1024])for(const rows of [0,1,2,3,4]){
  await ui.redraw({...BASE.props,bodyColumns:width,maxRows:rows});const tree=await ui.drawn(),rasters=nodes(tree,'Raster'),texts=nodes(tree,'Text');
  if(width===0||rows===0){expect(rasters.length).toBe(0);expect(texts.length).toBe(0);continue;}
  const boundedWidth=Math.min(512,width);expect(tree.props.width).toBe(boundedWidth);
  if(width>=8&&rows===4){
   expect(tree.props.height).toBe(4);expect(rasters.length).toBe(1);expect(rasters[0].props.rows).toBe(4);
   expect(rasters[0].props.columns).toBe(width>=15?boundedWidth-7:boundedWidth);
   expect(atob(rasters[0].props.cells).length).toBe(rasters[0].props.columns*4*12);
   expect(texts.length).toBe(width>=15?1:0);
  }else{expect(tree.props.height).toBe(1);expect(rasters.length).toBe(0);expect(texts.length).toBe(1);}
  expect(JSON.stringify(texts)).not.toMatch(/\(-\.-\)|\(o\.o\)|\\\/\\_/);
 }
 const beforeStore=storeWrites.length,beforeState=stateWrites.length;await clock.advance(10000);
 expect(storeWrites.length).toBe(beforeStore);expect(stateWrites.length).toBe(beforeState);await ui.unmount();
});

test('mounted Raster uses native upper/lower half blocks and transparent terminal defaults',async($,on)=>{
 setup(on);await start($);const ui=await $.ui.mount({...BASE,props:{...BASE.props,bodyColumns:8}});
 const raster=rasterProps(await ui.drawn());expect(raster.columns).toBe(8);expect(raster.rows).toBe(4);
 const cells=decode(raster.cells),DEFAULT=0x01000000;
 expect(cells.length).toBe(32);expect(cells.every(cell=>[0x20,0x2580,0x2584].includes(cell.glyph))).toBe(true);
 expect(cells.some(cell=>cell.glyph===0x2584&&cell.foreground!==DEFAULT&&cell.background===DEFAULT)).toBe(true);
 expect(cells.some(cell=>cell.glyph===0x2580&&cell.foreground!==DEFAULT&&cell.background!==DEFAULT)).toBe(true);
 expect(cells.some(cell=>cell.glyph===0x20&&cell.foreground===DEFAULT&&cell.background===DEFAULT)).toBe(true);
 await ui.unmount();
});

test('mock approval freezes the same frame and raster while the independent timer keeps running',async($,on)=>{
 const{clock,runtime,store,controls}=setup(on);await start($);const ui=await $.ui.mount({...BASE,props:{...BASE.props,isWorking:true}});
 await $.turn.start({turnId:'approval-turn',text:'mock only'});await command($,'restart');await clock.advance(720);
 let entered,release;const reached=new Promise(resolve=>entered=resolve);
 controls.tool=async()=>{await $.classic.PermissionRequest({tool_name:'Bash',tool_input:{command:'mock only'}});entered();return await new Promise(resolve=>release=resolve);};
 const pending=$.tool.call({tool:'Bash',command:'mock only',tool_use_id:'approval-tool'});await reached;await ui.redraw({...BASE.props,isWorking:true});
 const held={...runtime.get('companionRuntime').value},raster=rasterProps(await ui.drawn()).cells;
 expect(held.waiting).toContain('Bash');await clock.advance(3000);await ui.redraw({...BASE.props,isWorking:true});
 const after=runtime.get('companionRuntime').value;
 expect(after.x).toBe(held.x);expect(after.frame).toBe(held.frame);expect(after.direction).toBe(held.direction);
 expect(rasterProps(await ui.drawn()).cells).toBe(raster);expect(store.get('timer:'+SESSION).remaining).toBe(1497000);
 release({result:{original:true},text:'kept mocked result'});expect((await pending).text).toBe('kept mocked result');
 await clock.advance(480);expect(runtime.get('companionRuntime').value.waiting.length).toBe(0);
 expect(runtime.get('companionRuntime').value.x).not.toBe(held.x);await ui.unmount();
});

test('generated entry switches A/B locally and motion off freezes pixels without timer writes',async($,on)=>{
 const{clock,store,runtime,storeWrites}=setup(on);store.set('companion:preferences',{character:'a',reduced:false,future:{keep:'unknown'}});await start($);
 const ui=await $.ui.mount({...BASE,props:{...BASE.props,isWorking:true}});await $.turn.start({turnId:'selection-turn',text:'mock only'});await clock.advance(480);
 const a=rasterProps(await ui.drawn()).cells;expect((await command($,'character b')).text).toBe('Cat character B.');await ui.redraw({...BASE.props,isWorking:true});
 const b=rasterProps(await ui.drawn()).cells;expect(b).not.toBe(a);expect(runtime.get('companionRuntime').value.character).toBe('b');
 await command($,'motion off');await ui.redraw({...BASE.props,isWorking:true});const held=rasterProps(await ui.drawn()).cells;
 const state={...runtime.get('companionRuntime').value};await clock.advance(3000);await ui.redraw({...BASE.props,isWorking:true});
 expect(rasterProps(await ui.drawn()).cells).toBe(held);expect(runtime.get('companionRuntime').value.frame).toBe(state.frame);expect(runtime.get('companionRuntime').value.x).toBe(state.x);
 expect(store.get('companion:preferences')).toEqual({character:'b',reduced:true,future:{keep:'unknown'}});
 expect(storeWrites.filter(key=>key.startsWith('timer:')).length).toBe(0);await ui.unmount();
});

test('completion uses static rest and narrow fallback stops animation while timer continues',async($,on)=>{
 const{clock,runtime,store,storeWrites,stateWrites}=setup(on);await start($);const ui=await $.ui.mount({...BASE,props:{...BASE.props,isWorking:true}});
 await $.turn.start({turnId:'fallback-turn',text:'mock only'});await command($,'restart');await clock.advance(480);
 await ui.redraw({...BASE.props,isWorking:true,maxRows:3});const held={...runtime.get('companionRuntime').value};
 expect(nodes(await ui.drawn(),'Raster').length).toBe(0);await clock.advance(2000);
 expect(runtime.get('companionRuntime').value.x).toBe(held.x);expect(runtime.get('companionRuntime').value.frame).toBe(held.frame);expect(store.get('timer:'+SESSION).remaining).toBe(1498000);
 await ui.redraw({...BASE.props,isWorking:true});await clock.advance(240);expect(runtime.get('companionRuntime').value.x).not.toBe(held.x);
 await command($,'pause');await $.turn.complete({turnId:'fallback-turn',answer:'kept',durationMs:1,isAborted:false,reason:'answer'});await ui.redraw(BASE.props);await clock.advance(960);
 const rested=rasterProps(await ui.drawn()).cells,storeCount=storeWrites.length,stateCount=stateWrites.length;await clock.advance(10000);
 expect(rasterProps(await ui.drawn()).cells).toBe(rested);expect(storeWrites.length).toBe(storeCount);expect(stateWrites.length).toBe(stateCount);await ui.unmount();
});

test('walking has bounded transient updates and no persistent store writes; static rest has no clocks',async($,on)=>{
 const{clock,stateWrites,storeWrites}=setup(on);await start($);const ui=await $.ui.mount({...BASE,props:{...BASE.props,isWorking:true}});
 await $.turn.start({turnId:'budget-turn',text:'mock only'});await clock.advance(1);
 const before=stateWrites.filter(key=>key==='companionRuntime').length;await clock.advance(2400);
 const writes=stateWrites.filter(key=>key==='companionRuntime').length-before;
 // Ten 240 ms steps permit at most one ownership fence plus one changed-state
 // write each. This is a host-call budget, not a native CPU measurement.
 expect(writes).toBeGreaterThan(0);expect(writes).toBeLessThanOrEqual(20);expect(storeWrites.length).toBe(0);
 await $.turn.complete({turnId:'budget-turn',answer:'kept',durationMs:1,isAborted:false,reason:'answer'});await ui.redraw(BASE.props);await clock.advance(960);
 const rested=stateWrites.length;await clock.advance(10000);expect(stateWrites.length).toBe(rested);expect(storeWrites.length).toBe(0);await ui.unmount();
});
