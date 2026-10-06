"""Embed authored 8x8 PNG pixels into the standalone local Raster renderer."""
from pathlib import Path
from PIL import Image
import json
r=Path(__file__).resolve().parents[1]
assets=r/'assets/characters/native-four-rows'
data={}
def pixels(path):
    im=Image.open(path).convert('RGBA')
    assert im.size==(8,8)
    result=[]
    for y in range(8):
        row=[]
        for x in range(8):
            red,green,blue,alpha=im.getpixel((x,y))
            assert alpha in (0,255)
            row.append(None if not alpha else (red<<16)|(green<<8)|blue)
        result.append(row)
    return result
for code in 'ab':
    data[code]={'hold':pixels(assets/('character-'+code+'.png')),'walk':[pixels(assets/('character-'+code+'-walk-'+str(i).zfill(2)+'.png')) for i in range(4)],'dance':[pixels(assets/('character-'+code+'-dance-'+str(i).zfill(2)+'.png')) for i in range(8)]}
code='// Generated from approved A sample and directly repaired B pixels.\nexport const CAT_PIXEL_DATA='+json.dumps(data,separators=(',',':'))+';\n'+'''
export function pixelRaster(cat,columns){
 columns=Math.max(0,Math.floor(columns));if(columns<8)return null;
 const data=CAT_PIXEL_DATA[cat.character==='b'?'b':'a'];
 const dance=cat.danceActive||cat.danceHeld,danceFrame=Math.max(0,Math.floor(cat.danceFrame||0))%8;
 const grid=dance?data.dance[danceFrame]:cat.active?data.walk[Math.max(0,Math.floor(cat.frame||0))%4]:data.hold;
 const offset=dance?[0,-1,0,1,0,-1,0,0][danceFrame]:0;
 const x=Math.max(0,Math.min(columns-8,Math.floor(cat.x||0)+offset)),mirror=cat.direction<0;
 const bytes=new Uint8Array(columns*4*12),view=new DataView(bytes.buffer),DEFAULT=0x01000000;
 for(let row=0;row<4;row++)for(let col=0;col<columns;col++){
  const offset=col-x,source=mirror?7-offset:offset;
  const upper=offset>=0&&offset<8?grid[row*2][source]:null;
  const lower=offset>=0&&offset<8?grid[row*2+1][source]:null;
  let glyph=0x20,foreground=DEFAULT,background=DEFAULT;
  if(upper===null&&lower!==null){glyph=0x2584;foreground=lower;}
  else if(upper!==null){glyph=0x2580;foreground=upper;if(lower!==null)background=lower;}
  const index=(row*columns+col)*12;
  view.setUint32(index,glyph,true);view.setUint32(index+4,foreground,true);view.setUint32(index+8,background,true);
 }
 const cells=typeof bytes.toBase64==='function'?bytes.toBase64():btoa(String.fromCharCode(...bytes));
 return {columns,rows:4,cells};
}
'''
with (r/'src/native-raster.js').open('w', encoding='utf-8', newline='\n') as output:
    output.write(code)
print('Generated source from original 8x8 pixels')
