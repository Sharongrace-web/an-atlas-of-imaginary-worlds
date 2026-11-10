const THREE=require('three'); global.window=global; global.THREE=THREE;
(0,eval)(require('fs').readFileSync('/mnt/user-data/outputs/atlas-project/js/worlds3d.js','utf8'));
const env=(Q)=>({timeU:{value:0},spriteTex:new THREE.Texture(),px:{value:1},Q});
let bad=0,n=0,minRatio=9,maxRatio=0,maxH=0,minW=9,counts=new Set();
for(const Q of [1,.6]) for(let seed=1;seed<=60;seed++){ const w=WORLD3D.build(2,seed*37+3041,env(Q)); const s=w.stats.stones; counts.add(s.length);
  s.forEach(d=>{ n++; const ratio=d.h/d.w; minRatio=Math.min(minRatio,ratio); maxRatio=Math.max(maxRatio,ratio); maxH=Math.max(maxH,d.h); minW=Math.min(minW,d.w); if(ratio>2.4||d.h>4||d.w<.6) bad++; });
  let boxes=0; w.group.traverse(o=>{ if(o.geometry&&o.geometry.type==='BoxGeometry') boxes++; });
  if(boxes) { bad++; console.log('unexpected BoxGeometry in dunes world seed',seed); } }
console.log('stones checked',n,'across 120 builds (60 seeds x 2 tiers); stones per world',[...counts].join('/'),'height/width ratio range',minRatio.toFixed(2),'-',maxRatio.toFixed(2),'max height',maxH.toFixed(2),'min width',minW.toFixed(2),'violations',bad);
