const THREE=require('three'); global.window=global; global.THREE=THREE; const fs=require('fs');
const load=(f)=>{ delete global.WORLD3D; (0,eval)(fs.readFileSync(f,'utf8')); return global.WORLD3D; };
const NEW=load('/mnt/user-data/outputs/atlas-project/js/worlds3d.js'); const NEWB=NEW.build, NEWA=NEW.archetype; const OLD=load('/tmp/t/worlds3d_before.js');
const env=(Q)=>({timeU:{value:0},spriteTex:new THREE.Texture(),px:{value:1},Q});
const sigNonMain=(g)=>{ let s=0,n=0,mirrors=0; g.traverse(o=>{ if(o.isGroup&&o.scale.y<0){ mirrors++; if(Math.abs(o.position.x)<1e-6&&Math.abs(o.position.z)<1e-6) return; } 
   if(o.geometry&&o.geometry.attributes.position){ let skip=false,p=o.parent; while(p){ if(p.isGroup&&p.scale.y<0&&Math.abs(p.position.x)<1e-6&&Math.abs(p.position.z)<1e-6){skip=true;break;} p=p.parent;} if(skip) return; const a=o.geometry.attributes.position.array; for(let i=0;i<a.length;i+=13) s+=a[i]*(1+(i%7)); n+=a.length/3; } }); return Math.round(s*1e3)/1e3+'/'+n+'/m'+mirrors; };
let seeds=0,same=0,maxAbove=-1e9,worst=null,compSeen={},mainTrisBefore=0,mainTrisAfter=0;
for(let k=0;k<80;k++){ const seed=k===0?1013:1+k*7919%99991; seeds++;
  const o=OLD.build(0,seed,env(1)), n=NEWB(0,seed,env(1)); for(const w of [o,n]) for(let f=0;f<5;f++) w.update(f*.3,.016);
  if(sigNonMain(o.group)===sigNonMain(n.group)) same++; else console.log('DIFF outside main mirror, seed',seed);
  compSeen[n.label]=(compSeen[n.label]||0)+1;
  // highest point of the central island's mirror, relative to the sea surface
  n.group.updateMatrixWorld(true); let seaY=null; n.group.traverse(x=>{ if(x.isMesh&&x.geometry.type==='PlaneGeometry'&&x.geometry.parameters.width===90) seaY=x.position.y; });
  n.group.traverse(x=>{ if(x.isGroup&&x.scale.y<0&&Math.abs(x.position.x)<1e-6&&Math.abs(x.position.z)<1e-6){ const b=new THREE.Box3().setFromObject(x); const above=b.max.y-seaY; if(above>maxAbove){maxAbove=above;worst=seed;} mainTrisAfter+=x.children[0].geometry.attributes.position.count/3; } });
  o.group.traverse(x=>{ if(x.isGroup&&x.scale.y<0&&Math.abs(x.position.x)<1e-6&&Math.abs(x.position.z)<1e-6) mainTrisBefore+=x.children[0].geometry.attributes.position.count/3; });
}
console.log('seeds checked',seeds,'| everything except the central island mirror identical to before:',same+'/'+seeds);
console.log('compositions covered:',JSON.stringify(compSeen));
console.log('highest point of the central island mirror above the sea surface, over all seeds:',maxAbove.toFixed(2),'units (seed '+worst+'); bobbing tolerance 0.3');
console.log('central mirror triangles before/after (sum over seeds):',mainTrisBefore,'/',mainTrisAfter);
// mobile tier has no mirrors at all
let mob=0; for(let k=0;k<10;k++){ const w=NEWB(0,1+k*37,env(.6)); w.group.traverse(x=>{ if(x.isGroup&&x.scale.y<0) mob++; }); } console.log('mirror groups on the mobile tier (expected 0):',mob);
