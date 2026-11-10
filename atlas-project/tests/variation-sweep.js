const THREE=require('three'); global.window=global; global.THREE=THREE;
(0,eval)(require('fs').readFileSync('/mnt/user-data/outputs/atlas-project/js/worlds3d.js','utf8'));
const env=(Q)=>({timeU:{value:0},spriteTex:new THREE.Texture(),px:{value:1},Q});
let tested=0,problems=0,archSeen=[{},{},{}],det=0,detBad=0,maxMs=[0,0,0];
const sig=(g)=>{let s=0,v=0;g.traverse(o=>{if(o.geometry&&o.geometry.attributes.position){const a=o.geometry.attributes.position.array;for(let i=0;i<a.length;i+=11)s+=a[i]*(1+(i%7));v+=o.geometry.attributes.position.count;}});return Math.round(s*1e3)/1e3+'/'+v;};
for(let i=0;i<3;i++) for(const Q of [1,.6]) for(let k=0;k<50;k++){ const seed=1+k*7919%99991;
  try{ const t0=Date.now(); const w=WORLD3D.build(i,seed,env(Q)); maxMs[i]=Math.max(maxMs[i],Date.now()-t0); if(k<6){ det++; const w2=WORLD3D.build(i,seed,env(Q)); if(sig(w.group)!==sig(w2.group)) detBad++; } for(let f=0;f<6;f++)w.update(f*.4,.016);
    archSeen[i][w.label]=(archSeen[i][w.label]||0)+1; let bad=0; w.group.traverse(o=>{ if(o.geometry&&o.geometry.attributes.position){const a=o.geometry.attributes.position.array; for(let j=0;j<a.length;j+=3) if(!Number.isFinite(a[j])||!Number.isFinite(a[j+1])){bad++;break;}} if(o.isInstancedMesh) for(let j=0;j<o.count*16;j++) if(!Number.isFinite(o.instanceMatrix.array[j])){bad++;break;} });
    if(WORLD3D.archetype(i,seed)!==WORLD3D.ARCH_NAMES[i].indexOf(w.label)) bad++;
    
    tested++; if(bad){problems++;console.log('PROBLEM world',i,'seed',seed,'Q',Q);} }catch(e){problems++;console.log('EXCEPTION world',i,'seed',seed,'Q',Q,e.message.split('\n')[0]);} }
console.log('builds',tested,'problems',problems,'| same-seed rebuild identical:',det-detBad+'/'+det);
console.log('compositions seen (counts):',JSON.stringify(archSeen)); console.log('slowest build ms per world',maxMs.join(', '));
// Generate Variation always lands on a different composition
let same=0; for(let i=0;i<3;i++) for(let k=0;k<200;k++){ const cur=WORLD3D.archetype(i,1+k*131); let ns=1; for(let j=0;j<60;j++){ ns=1+Math.floor(Math.random()*999999); if(WORLD3D.archetype(i,ns)!==cur)break; } if(WORLD3D.archetype(i,ns)===cur) same++; }
console.log('variation picks the same composition in',same,'of 600 trials');
