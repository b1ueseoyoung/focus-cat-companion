import {test,expect} from 'bun:test';
import {readFileSync} from 'node:fs';
import {CAT_PIXEL_DATA,pixelRaster} from '../src/native-raster.js';
import {createCompanion} from '../src/companion-core.js';

// Exercise the fallback in an isolated constructor; do not patch a global
// prototype shared by other tests. This verifies bytes, not terminal rendering.
test('legacy btoa raster encoding preserves A/B bytes at the 512-column host limit',()=>{
 class LegacyBytes extends Uint8Array {}
 Object.defineProperty(LegacyBytes.prototype,'toBase64',{value:undefined});
 let calls=0;
 const source=readFileSync(new URL('../src/native-raster.js',import.meta.url),'utf8').replace(/^export (?=const |function )/gm,'');
 const fallback=new Function('Uint8Array','btoa',source+'\nreturn pixelRaster;')(LegacyBytes,bytes=>{calls++;return btoa(bytes);});
 for(const character of Object.keys(CAT_PIXEL_DATA))for(const pose of [{},...Array.from({length:4},(_,frame)=>({active:true,frame})),...Array.from({length:8},(_,danceFrame)=>({danceActive:true,danceFrame}))]){
  const cat={...createCompanion(),character,x:504,direction:-1,...pose};
  const actual=fallback(cat,512);expect(actual).toEqual(pixelRaster(cat,512));
  expect(Buffer.from(actual.cells,'base64').length).toBe(512*4*12);
 }
 expect(calls).toBe(26);
});
