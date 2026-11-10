const {PNG}=require('pngjs'),fs=require('fs');
for(let a=0;a<5;a++){ const A=PNG.sync.read(fs.readFileSync(`/tmp/t/before/t_${a}.png`)),B=PNG.sync.read(fs.readFileSync(`/tmp/t/after/t_${a}.png`)),M=PNG.sync.read(fs.readFileSync(`/tmp/t/mask/m_${a}.png`)); const W=A.width,H=A.height;
  const on=(x,y)=>x>=0&&y>=0&&x<W&&y<H&&M.data[(y*W+x)*4]>40; const near=(x,y)=>{ for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++) if(on(x+dx,y+dy)) return true; return false; };
  let changed=0,outside=0,maskPx=0; for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const i=(y*W+x)*4; if(M.data[i]>40)maskPx++; const e=Math.abs(A.data[i]-B.data[i])+Math.abs(A.data[i+1]-B.data[i+1])+Math.abs(A.data[i+2]-B.data[i+2]); if(e>3){changed++; if(!near(x,y)) outside++;} }
  console.log('composition',a,': changed pixels',changed,'| removed structure covers',maskPx,'px | changed pixels OUTSIDE the removed structure (2 px tolerance):',outside); }
