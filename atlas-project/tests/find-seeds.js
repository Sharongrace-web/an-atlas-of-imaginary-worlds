const THREE=require('three'); global.window=global; global.THREE=THREE;
(0,eval)(require('fs').readFileSync('/mnt/user-data/outputs/atlas-project/js/worlds3d.js','utf8'));
const out=[]; for(let i=0;i<3;i++){ const found={}; for(let s=2;s<400&&Object.keys(found).length<4;s++){ const a=WORLD3D.archetype(i,s); if(a>0&&!found[a]) found[a]=s; } found[0]=[1013,2027,3041][i]; out.push([0,1,2,3,4].map(a=>found[a])); }
console.log(JSON.stringify(out));
