const THREE=require('three'); global.window=global; global.THREE=THREE;
require('fs'); (0,eval)(require('fs').readFileSync('/mnt/user-data/outputs/atlas-project/js/worlds3d.js','utf8'));
const env=(Q)=>({timeU:{value:0},spriteTex:new THREE.Texture(),px:{value:1},Q});
const sig=(g)=>{let s=0,n=0,v=0,dc=0;g.traverse(o=>{if(o.geometry&&o.geometry.attributes.position){const a=o.geometry.attributes.position.array;for(let i=0;i<a.length;i+=7)s+=a[i]*(1+(i%13));v+=o.geometry.attributes.position.count;dc++;}});return {s:Math.round(s*1e3)/1e3,verts:v,objects:dc};};
for(let i=0;i<3;i++){ for(const Q of [1,.6]){ const t0=Date.now(); const a=WORLD3D.build(i,1013+i,env(Q)); const ms=Date.now()-t0; const b=WORLD3D.build(i,1013+i,env(Q)), c=WORLD3D.build(i,5,env(Q));
  const sa=sig(a.group), sb=sig(b.group), sc=sig(c.group);
  console.log('world',i,'Q',Q,'same seed equal',sa.s===sb.s&&sa.verts===sb.verts,'diff seed differs',sa.s!==sc.s,'verts',sa.verts,'meshes+points',sa.objects,'build ms',ms);
  for(let k=0;k<30;k++){a.update(k*.1,.016);} a.setScale(1.3); a.setScale(.7); } }
console.log('ok');
