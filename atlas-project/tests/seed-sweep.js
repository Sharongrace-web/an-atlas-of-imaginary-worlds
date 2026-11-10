const THREE=require('three'); global.window=global; global.THREE=THREE;
(0,eval)(require('fs').readFileSync('/mnt/user-data/outputs/atlas-project/js/worlds3d.js','utf8'));
const env=(Q)=>({timeU:{value:0},spriteTex:new THREE.Texture(),px:{value:1},Q});
let fails=0, tested=0;
for (const Q of [1,.6]) for (const seed of [2027,1,2,3,5,7,11,13,99,1013,3041,65537,123456,987654,500000,31337,271828,161803,42,4242]) {
  try { const w=WORLD3D.build(1,seed,env(Q)); for(let k=0;k<10;k++) w.update(k*.3,.016);
    let inst=0,bad=0; w.group.traverse(o=>{ if(o.isInstancedMesh){ inst+=o.count; for(let j=0;j<o.count*16;j++) if(!Number.isFinite(o.instanceMatrix.array[j])) bad++; } });
    tested++; if(bad||!inst){fails++;console.log('PROBLEM seed',seed,'Q',Q,'instances',inst,'bad',bad);}
  } catch(e){ fails++; console.log('EXCEPTION seed',seed,'Q',Q,e.message.split('\n')[0]); }
}
console.log('tested',tested,'problems',fails);
