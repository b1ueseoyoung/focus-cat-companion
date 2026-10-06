import {test,expect} from 'bun:test';
import {createHash} from 'node:crypto';
import {CAT_WIDTH,CAT_ROWS,CAT_FRAMES,WALK_INTERVAL_MS,DANCE_FRAMES,DANCE_INTERVAL_MS,createCompanion,pose,advance,startDance,advanceDance,stopDance} from '../src/companion-core.js';
import {CAT_PIXEL_DATA,pixelRaster} from '../src/native-raster.js';

const DEFAULT=0x01000000,SPACE=0x20,UPPER=0x2580,LOWER=0x2584;
const OFFSETS=[0,-1,0,1,0,-1,0,0];
// Captured before the dance change. The previous PNG-oracle suite independently
// verified these hold matrices against the approved A/B PNGs.
const BASELINE={
 a:{hold:'f2316cf82e4d451fa882094ffe9ae516a343c41865de6fb401d3d6a40ff5cf48',walk:'55ee29d4c1aaa2ba83ca96a09464a2dea2c3da9ce0a3b1fc816538942ecd4c98'},
 b:{hold:'3154edcebb198a63e9cebf6aa324b466cebe44401a512e18b7f234dd56802bc8',walk:'2f806794607fcbc262ba56206ae413fd4e95f434f4d7f1bc568f411d9ab49425'},
};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const cat=(overrides={})=>Object.assign(createCompanion(),overrides);
const placed=(grid,width,x,mirror=false)=>grid.map(line=>{
 const result=Array(width).fill(null),source=mirror?[...line].reverse():line;
 for(let i=0;i<8;i++)result[x+i]=source[i];return result;
});

// Decode the public 12-byte-cell ABI independently of the raster producer.
function decodedGrid(raster){
 expect(raster.rows).toBe(4);const bytes=Buffer.from(raster.cells,'base64');
 expect(bytes.length).toBe(raster.columns*4*12);
 const result=Array.from({length:8},()=>Array(raster.columns).fill(null));
 for(let row=0;row<4;row++)for(let column=0;column<raster.columns;column++){
  const offset=(row*raster.columns+column)*12,glyph=bytes.readUInt32LE(offset),fg=bytes.readUInt32LE(offset+4),bg=bytes.readUInt32LE(offset+8);
  expect([SPACE,UPPER,LOWER].includes(glyph)).toBe(true);
  expect(fg===DEFAULT||fg<=0xffffff).toBe(true);expect(bg===DEFAULT||bg<=0xffffff).toBe(true);
  if(glyph===SPACE){expect([fg,bg]).toEqual([DEFAULT,DEFAULT]);continue;}
  expect(fg).not.toBe(DEFAULT);
  if(glyph===LOWER){expect(bg).toBe(DEFAULT);result[row*2+1][column]=fg;}
  else{result[row*2][column]=fg;if(bg!==DEFAULT)result[row*2+1][column]=bg;}
 }
 return result;
}

test('dance defaults and timing leave the old walk contract intact',()=>{
 expect([DANCE_FRAMES,DANCE_INTERVAL_MS,DANCE_FRAMES*DANCE_INTERVAL_MS]).toEqual([8,120,960]);
 expect([CAT_WIDTH,CAT_ROWS,CAT_FRAMES,WALK_INTERVAL_MS]).toEqual([8,4,4,240]);
 expect(createCompanion()).toMatchObject({danceActive:false,danceHeld:false,danceFrame:0,completionEligible:false,lastCompletedTurnId:null});
});

test('eight 120 ms steps end the single dance and do not restart it',()=>{
 const state=cat({reason:'answer',x:4,frame:3,turnHold:1,completionEligible:true,lastCompletedTurnId:'completed-turn'});
 expect(startDance(state)).toBe(true);expect(pose(state)).toBe('celebrating');
 expect(state).toMatchObject({danceActive:true,danceHeld:false,danceFrame:0});
 for(let step=1;step<=7;step++){
  expect(advanceDance(state)).toBe(true);expect(state).toMatchObject({danceActive:true,danceHeld:false,danceFrame:step});
 }
 expect(advanceDance(state)).toBe(true);expect(state).toMatchObject({danceActive:false,danceHeld:false,danceFrame:0});
 expect(pose(state)).toBe('answer');const finished=structuredClone(state);
 for(let step=0;step<8;step++)expect(advanceDance(state)).toBe(false);
 expect(state).toEqual(finished);expect(state).toMatchObject({x:4,frame:3,turnHold:1,completionEligible:true,lastCompletedTurnId:'completed-turn'});
});

test('reply/approval/motion/visibility/geometry guards reject dance starts without mutation',()=>{
 for(const guard of [{active:true},{waiting:new Set(['Bash'])},{reduced:true},{visible:false},{rows:0},{rows:1},{rows:2},{rows:3},{columns:0},{columns:7},{columns:7.9}]){
  const state=cat({danceFrame:5,x:2,...guard}),before=structuredClone(state);
  expect(startDance(state)).toBe(false);expect(state).toEqual(before);
 }
 for(const [columns,rows] of [[8,4],[16,8]]){
  const state=cat({columns,rows});expect(startDance(state)).toBe(true);expect(state.danceFrame).toBe(0);
 }
});

test('ineligible dance advances do not move the frame or mutate the existing pose',()=>{
 for(const guard of [{danceActive:false},{active:true},{waiting:new Set(['Bash'])},{reduced:true},{visible:false},{rows:0},{rows:1},{rows:2},{rows:3},{columns:0},{columns:7}]){
  const state=cat({danceActive:true,danceFrame:4,x:3,...guard}),before=structuredClone(state);
  expect(advanceDance(state)).toBe(false);expect(state).toEqual(before);
 }
});

test('freeze retains each dance frame; release resets it without resuming',()=>{
 for(const character of ['a','b'])for(let frame=0;frame<8;frame++){
  const state=cat({character,reason:'answer',danceActive:true,danceFrame:frame,x:4,columns:20}),raster=pixelRaster(state,20);
  stopDance(state,true);expect(state).toMatchObject({danceActive:false,danceHeld:true,danceFrame:frame});
  expect(pixelRaster(state,20)).toEqual(raster);const frozen=structuredClone(state);
  expect(advanceDance(state)).toBe(false);expect(state).toEqual(frozen);
  stopDance(state);expect(state).toMatchObject({danceActive:false,danceHeld:false,danceFrame:0,x:4});
  expect(decodedGrid(pixelRaster(state,20))).toEqual(placed(CAT_PIXEL_DATA[character].hold,20,4));
  expect(advanceDance(state)).toBe(false);
 }
});

test('dance activity and walking are independent; dance leaves stored walk position intact',()=>{
 const state=cat({x:4,frame:2,turnHold:1,direction:-1});expect(startDance(state)).toBe(true);
 const before=structuredClone(state);expect(advance(state)).toBe(false);expect(state).toEqual(before);
 for(let frame=0;frame<8;frame++){
  pixelRaster(state,20);expect(state).toMatchObject({x:4,frame:2,turnHold:1,direction:-1});expect(advanceDance(state)).toBe(true);
 }
 expect(state).toMatchObject({danceActive:false,danceHeld:false,danceFrame:0,x:4,frame:2,turnHold:1,direction:-1});
});

for(const character of ['a','b']){
 test(character.toUpperCase()+' preserves all approved pre-dance hold and walking pixels',()=>{
  for(const kind of ['hold','walk'])expect(hash(CAT_PIXEL_DATA[character][kind])).toBe(BASELINE[character][kind]);
  for(let frame=0;frame<4;frame++){
   expect(decodedGrid(pixelRaster(cat({character,danceFrame:7,frame}),8))).toEqual(CAT_PIXEL_DATA[character].hold);
   expect(decodedGrid(pixelRaster(cat({character,danceFrame:7,active:true,frame}),8))).toEqual(CAT_PIXEL_DATA[character].walk[frame]);
  }
 });

 const distinctPoses=new Set(CAT_PIXEL_DATA[character].dance.map(frame=>JSON.stringify(frame))).size;
 test(character.toUpperCase()+' uses eight dance slots, '+distinctPoses+' distinct poses and returns to the base pose',()=>{
  const frames=CAT_PIXEL_DATA[character].dance;expect(frames.length).toBe(8);
  expect(distinctPoses).toBeGreaterThan(1);
  expect(frames[0]).toEqual(CAT_PIXEL_DATA[character].hold);expect(frames[7]).toEqual(frames[0]);
  const rendered=frames.map((_,danceFrame)=>pixelRaster(cat({character,danceActive:true,danceFrame,x:4}),20).cells);
  expect(new Set(rendered).size).toBeGreaterThan(1);expect(rendered[7]).toBe(rendered[0]);
 });

 test(character.toUpperCase()+' keeps the face fixed, with local one-pixel lower-body changes and the original palette',()=>{
  const baseline=CAT_PIXEL_DATA[character].hold,palette=new Set(baseline.flat().filter(value=>value!==null));
  for(const frame of CAT_PIXEL_DATA[character].dance){
   expect(frame.length).toBe(8);expect(frame.slice(0,4)).toEqual(baseline.slice(0,4));
   for(let row=0;row<8;row++){
    expect(frame[row].length).toBe(8);
    for(let column=0;column<8;column++){
     const color=frame[row][column];expect(color===null||palette.has(color)).toBe(true);
     if(row<4||color===null||color===baseline[row][column])continue;
     const nearby=[];
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)nearby.push(baseline[row+dy]?.[column+dx]);
     expect(nearby.includes(color)).toBe(true);
    }
   }
  }
 });

 test(character.toUpperCase()+' dance cells preserve alpha and default terminal background at every frame',()=>{
  for(let danceFrame=0;danceFrame<8;danceFrame++){
   const raster=pixelRaster(cat({character,danceActive:true,danceFrame}),8);
   expect(decodedGrid(raster)).toEqual(CAT_PIXEL_DATA[character].dance[danceFrame]);
  }
 });

 test(character.toUpperCase()+' applies the specified offsets with boundary clamp, mirror and no stored-x mutation',()=>{
  for(const [width,x] of [[8,0],[9,0],[9,1],[20,0],[20,4],[20,12],[20,999],[20,-9]])for(const direction of [1,-1])for(let danceFrame=0;danceFrame<8;danceFrame++){
   const state=cat({character,danceActive:true,danceFrame,x,direction}),before=structuredClone(state),placedX=Math.max(0,Math.min(width-8,Math.floor(x)+OFFSETS[danceFrame]));
   const raster=pixelRaster(state,width);expect(raster.columns).toBe(width);
   expect(decodedGrid(raster)).toEqual(placed(CAT_PIXEL_DATA[character].dance[danceFrame],width,placedX,direction<0));
   expect(state).toEqual(before);
  }
 });
}
