const {PNG}=require('pngjs'),fs=require('fs');
for(let a=0;a<5;a++){ const A=PNG.sync.read(fs.readFileSync(`/tmp/t/before/t_${a}.png`)),B=PNG.sync.read(fs.readFileSync(`/tmp/t/after/t_${a}.png`)); const W=A.width,H=A.height;
  let n=0,x0=1e9,x1=-1,y0=1e9,y1=-1; const diff=new PNG({width:W,height:H});
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){ const i=(y*W+x)*4; const e=Math.abs(A.data[i]-B.data[i])+Math.abs(A.data[i+1]-B.data[i+1])+Math.abs(A.data[i+2]-B.data[i+2]);
    if(e>3){n++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y); diff.data[i]=255;diff.data[i+1]=60;diff.data[i+2]=60;diff.data[i+3]=255;} else { const g=(A.data[i]+A.data[i+1]+A.data[i+2])/3*.5; diff.data[i]=g;diff.data[i+1]=g;diff.data[i+2]=g;diff.data[i+3]=255; } }
  console.log('composition',a,': pixels changed',n,'('+(100*n/(W*H)).toFixed(2)+'% of frame); changed region x',n?x0+'-'+x1:'-','y',n?y0+'-'+y1:'-','of',W+'x'+H);
  fs.writeFileSync(`/tmp/t/after/diff_${a}.png`,PNG.sync.write(diff)); }
