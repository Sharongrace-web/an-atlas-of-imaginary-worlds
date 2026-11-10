const {PNG}=require('pngjs'),fs=require('fs');
for(let w=0;w<3;w++){ const im=[0,1,2,3,4].map(a=>PNG.sync.read(fs.readFileSync(`/tmp/t/cs_${w}_${a}.png`))); let tot=0,n=0,min=1e9,mn=''; 
 for(let a=0;a<5;a++)for(let b=a+1;b<5;b++){ let d=0,cnt=0; const A=im[a].data,B=im[b].data; for(let i=0;i<A.length;i+=4){ const e=Math.abs(A[i]-B[i])+Math.abs(A[i+1]-B[i+1])+Math.abs(A[i+2]-B[i+2]); if(e>40)cnt++; d+=e; }
   const pct=100*cnt/(A.length/4); tot+=pct;n++; if(pct<min){min=pct;mn=a+'-'+b;} }
 console.log('world',w,'pairs',n,'mean % of pixels clearly different between compositions:',(tot/n).toFixed(1),'| least different pair',mn,min.toFixed(1)+'%'); }
