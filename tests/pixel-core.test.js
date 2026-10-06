import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {inflateSync} from 'node:zlib';
import {CAT_WIDTH,CAT_ROWS,CAT_FRAMES,WALK_INTERVAL_MS,createCompanion,pose,advance} from '../src/companion-core.js';
import {CAT_PIXEL_DATA,pixelRaster} from '../src/native-raster.js';

const DEFAULT=0x01000000,SPACE=0x20,UPPER=0x2580,LOWER=0x2584;

// Independent oracle: decode the approved PNG bytes, not the generated matrix.
// These references are 8-bit RGBA, non-interlaced PNGs. Handle every PNG filter
// so this check does not depend on the reference encoder's current settings.
function pngGrid(character){
 const png=readFileSync(resolve(import.meta.dir,'../assets/characters/native-four-rows/character-'+character+'.png'));
 expect([...png.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
 let header,position=8;const chunks=[];
 while(position<png.length){
  const length=png.readUInt32BE(position),type=png.toString('ascii',position+4,position+8),data=png.subarray(position+8,position+8+length);
  if(type==='IHDR')header=data;if(type==='IDAT')chunks.push(data);
  position+=length+12;if(type==='IEND')break;
 }
 expect(header).toBeDefined();
 const width=header.readUInt32BE(0),height=header.readUInt32BE(4);
 expect([width,height,header[8],header[9],header[10],header[11],header[12]]).toEqual([8,8,8,6,0,0,0]);
 const raw=inflateSync(Buffer.concat(chunks)),stride=width*4;
 expect(raw.length).toBe(height*(stride+1));
 const pixels=Buffer.alloc(height*stride),paeth=(a,b,c)=>{
  const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);
  return pa<=pb&&pa<=pc?a:pb<=pc?b:c;
 };
 for(let y=0;y<height;y++){
  const filter=raw[y*(stride+1)];expect(filter>=0&&filter<=4).toBe(true);
  for(let x=0;x<stride;x++){
   const left=x>=4?pixels[y*stride+x-4]:0,up=y?pixels[(y-1)*stride+x]:0,diagonal=y&&x>=4?pixels[(y-1)*stride+x-4]:0;
   const prediction=[0,left,up,Math.floor((left+up)/2),paeth(left,up,diagonal)][filter];
   pixels[y*stride+x]=(raw[y*(stride+1)+1+x]+prediction)&255;
  }
 }
 return Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>{
  const i=(y*width+x)*4,alpha=pixels[i+3];expect(alpha===0||alpha===255).toBe(true);
  return alpha===0?null:(pixels[i]<<16)|(pixels[i+1]<<8)|pixels[i+2];
 }));
}

function cells(raster){
 expect(raster.rows).toBe(4);const bytes=Buffer.from(raster.cells,'base64');
 expect(bytes.length).toBe(raster.columns*4*12);
 return Array.from({length:4},(_,row)=>Array.from({length:raster.columns},(_,column)=>{
  const i=(row*raster.columns+column)*12;
  return {glyph:bytes.readUInt32LE(i),foreground:bytes.readUInt32LE(i+4),background:bytes.readUInt32LE(i+8)};
 }));
}

function decodedGrid(raster){
 const result=Array.from({length:8},()=>Array(raster.columns).fill(null));
 for(const [row,line] of cells(raster).entries())for(const [column,cell] of line.entries()){
  expect([SPACE,UPPER,LOWER].includes(cell.glyph)).toBe(true);
  expect(cell.foreground===DEFAULT||cell.foreground<=0xffffff).toBe(true);
  expect(cell.background===DEFAULT||cell.background<=0xffffff).toBe(true);
  if(cell.glyph===SPACE){expect([cell.foreground,cell.background]).toEqual([DEFAULT,DEFAULT]);continue;}
  expect(cell.foreground).not.toBe(DEFAULT);
  if(cell.glyph===LOWER){expect(cell.background).toBe(DEFAULT);result[row*2+1][column]=cell.foreground;}
  else{result[row*2][column]=cell.foreground;if(cell.background!==DEFAULT)result[row*2+1][column]=cell.background;}
 }
 return result;
}

const cat=(overrides={})=>Object.assign(createCompanion(),overrides);
const placed=(grid,width,x=0,mirror=false)=>grid.map(line=>{
 const output=Array(width).fill(null),source=mirror?[...line].reverse():line;
 for(let i=0;i<8;i++)output[x+i]=source[i];return output;
});

test('approved dimensions, four-frame cycle and 240 ms cadence are explicit',()=>{
 expect([CAT_WIDTH,CAT_ROWS,CAT_FRAMES,WALK_INTERVAL_MS]).toEqual([8,4,4,240]);
 const initial=createCompanion();expect(initial).toMatchObject({frame:0,turnHold:0,rows:4,character:'a',active:false,reduced:false,visible:true});
 expect(initial.waiting).toEqual(new Set());expect(initial.tools).toEqual(new Map());expect(pose(initial)).toBe('idle');
});

for(const character of ['a','b']){
 test(character.toUpperCase()+' idle raster and frame zero match the approved 8x8 PNG exactly',()=>{
  const oracle=pngGrid(character);expect(CAT_PIXEL_DATA[character].hold).toEqual(oracle);
  expect(CAT_PIXEL_DATA[character].walk[0]).toEqual(oracle);
  for(let frame=0;frame<4;frame++)expect(decodedGrid(pixelRaster(cat({character,frame}),8))).toEqual(oracle);
  expect(decodedGrid(pixelRaster(cat({character,active:true,frame:0}),8))).toEqual(oracle);
 });

 test(character.toUpperCase()+' transparent half-blocks preserve the PNG silhouette and terminal background',()=>{
  const oracle=pngGrid(character),encoded=cells(pixelRaster(cat({character}),8)),seen=new Set();
  for(let row=0;row<4;row++)for(let column=0;column<8;column++){
   const upper=oracle[row*2][column],lower=oracle[row*2+1][column],actual=encoded[row][column];
   seen.add((upper===null?'0':'1')+(lower===null?'0':'1'));
   if(upper===null&&lower===null)expect(actual).toEqual({glyph:SPACE,foreground:DEFAULT,background:DEFAULT});
   else if(upper===null)expect(actual).toEqual({glyph:LOWER,foreground:lower,background:DEFAULT});
   else expect(actual).toEqual({glyph:UPPER,foreground:upper,background:lower===null?DEFAULT:lower});
  }
  expect([...seen].sort()).toEqual(['00','01','10','11']);
 });

 test(character.toUpperCase()+' has four distinct walking frames and a fixed upper body',()=>{
  const oracle=pngGrid(character),frames=[];
  expect(CAT_PIXEL_DATA[character].walk.length).toBe(4);
  for(let frame=0;frame<4;frame++){
   const grid=decodedGrid(pixelRaster(cat({character,active:true,frame}),8));
   expect(grid.slice(0,4)).toEqual(oracle.slice(0,4));frames.push(JSON.stringify(grid));
  }
  expect(new Set(frames).size).toBe(4);
 });

 test(character.toUpperCase()+' approval and reduced motion retain every exact walking frame',()=>{
  for(let frame=0;frame<4;frame++)for(const stop of [{waiting:new Set(['Bash'])},{reduced:true}]){
   const state=cat({character,active:true,frame,x:3,direction:-1,columns:20,...stop});
   const before=structuredClone(state),raster=pixelRaster(state,20);
   expect(advance(state)).toBe(false);expect(state).toEqual(before);expect(pixelRaster(state,20)).toEqual(raster);
   expect(decodedGrid(raster)).toEqual(placed(CAT_PIXEL_DATA[character].walk[frame],20,3,true));
   expect(pose(state)).toBe(stop.waiting?'approval':'walking');
  }
 });
}

test('inactive completion/error/abort poses use the same static PNG, with no advancement',()=>{
 const oracle=pngGrid('a');
 for(const reason of ['idle','answer','aborted','error','refusal'])for(let frame=0;frame<4;frame++){
  const state=cat({reason,frame});expect(pose(state)).toBe(reason);expect(advance(state)).toBe(false);
  expect(decodedGrid(pixelRaster(state,8))).toEqual(oracle);
 }
});

test('insufficient row/column budget and hidden characters never advance',()=>{
 for(const overrides of [{rows:0},{rows:1},{rows:2},{rows:3},{columns:0},{columns:7},{columns:7.9},{visible:false},{active:false}]){
  const state=cat({active:true,frame:3,x:2,turnHold:1,...overrides}),before=structuredClone(state);
  expect(advance(state)).toBe(false);expect(state).toEqual(before);
 }
 for(const width of [-1,0,1,7,7.9])expect(pixelRaster(cat({active:true}),width)).toBeNull();
});

test('native raster clamps placement, mirrors pixels and leaves input state unchanged',()=>{
 const oracle=pngGrid('b');
 for(const [width,x,placedX] of [[8,0,0],[8,999,0],[16,999,8],[16,-9,0],[12.9,2.9,2]])for(const direction of [1,-1]){
  const state=cat({character:'b',x,direction}),before=structuredClone(state),raster=pixelRaster(state,width),columns=Math.floor(width);
  expect(raster.columns).toBe(columns);expect(decodedGrid(raster)).toEqual(placed(oracle,columns,placedX,direction===-1));
  expect(state).toEqual(before);
 }
});

test('walking cycles all four frames before wrapping, without a boundary turn',()=>{
 const state=cat({active:true,x:4,columns:40});
 for(const [index,frame] of [1,2,3,0,1,2,3,0].entries()){
  expect(advance(state)).toBe(true);expect(state.frame).toBe(frame);expect(state.x).toBe(5+index);expect(state.turnHold).toBe(0);
 }
});

test('each boundary turn holds position and frame for exactly one 240 ms tick',()=>{
 const state=cat({active:true,columns:10,x:1});
 const expected=[
  {x:2,direction:-1,frame:1,turnHold:1},
  {x:2,direction:-1,frame:1,turnHold:0},
  {x:1,direction:-1,frame:2,turnHold:0},
  {x:0,direction:1,frame:3,turnHold:1},
  {x:0,direction:1,frame:3,turnHold:0},
  {x:1,direction:1,frame:0,turnHold:0},
 ];
 for(const step of expected){expect(advance(state)).toBe(true);expect(state).toMatchObject(step);}
});

test('narrow and wide lanes remain bounded across repeated turns',()=>{
 for(const width of [8,9,16,80]){
  const state=cat({active:true,columns:width,x:999,direction:-1});
  for(let i=0;i<180;i++){
   expect(advance(state)).toBe(true);expect(state.x>=0&&state.x<=width-8).toBe(true);
   expect(Number.isInteger(state.x)).toBe(true);expect([0,1,2,3].includes(state.frame)).toBe(true);expect([0,1].includes(state.turnHold)).toBe(true);
  }
 }
 const state=cat({active:true,columns:8});
 for(const frame of [1,2,3,0]){expect(advance(state)).toBe(true);expect(state).toMatchObject({x:0,direction:1,frame,turnHold:0});}
});
