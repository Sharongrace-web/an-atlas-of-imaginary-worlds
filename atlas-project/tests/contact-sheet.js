const {PNG}=require('pngjs'); const fs=require('fs');
const world=+process.argv[2], n=5, cw=640, ch=400, cols=3, rows=2, W=cw*cols, H=ch*rows, out=new PNG({width:W,height:H});
for(let i=0;i<out.data.length;i+=4){out.data[i]=18;out.data[i+1]=16;out.data[i+2]=30;out.data[i+3]=255;}
for(let a=0;a<n;a++){ const img=PNG.sync.read(fs.readFileSync(`/tmp/t/cs_${world}_${a}.png`)); const ox=(a%cols)*cw, oy=Math.floor(a/cols)*ch;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){ const s=(y*cw+x)*4,d=((oy+y)*W+ox+x)*4; for(let k=0;k<4;k++) out.data[d+k]=img.data[s+k]; }
  for(let x=0;x<cw;x++){ for(const y of [0,ch-1]){ const d=((oy+y)*W+ox+x)*4; out.data[d]=240;out.data[d+1]=230;out.data[d+2]=215; } } }
fs.writeFileSync(`/tmp/t/sheet_${world}.png`,PNG.sync.write(out)); console.log('sheet',world);
