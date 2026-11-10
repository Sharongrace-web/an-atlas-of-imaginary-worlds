const THREE=require('three'); global.window=global; global.THREE=THREE; const fs=require('fs');
const load=(f)=>{ delete global.WORLD3D; (0,eval)(fs.readFileSync(f,'utf8')); return global.WORLD3D; };
const OLD=load('/tmp/t/worlds3d_before2.js'), OLDB=OLD.build, OLDA=OLD.archetype; const NEW=load('/mnt/user-data/outputs/atlas-project/js/worlds3d.js');
const env=(Q)=>({timeU:{value:0},spriteTex:new THREE.Texture(),px:{value:1},Q});
const hashGeo=(g)=>{ let s=0; const a=g.attributes.position.array; for(let i=0;i<a.length;i+=7) s+=a[i]*(1+(i%11)); return Math.round(s*1e3)/1e3+'/'+a.length; };
const sigAll=(g,skipPos)=>{ let s=0,n=0; g.traverse(o=>{ if(o.geometry&&o.geometry.attributes.position){ s+=+hashGeo(o.geometry).split('/')[0]; n+=o.geometry.attributes.position.count; } if(o.material&&o.material.color) s+=o.material.color.r+o.material.color.g*2+o.material.color.b*3; if(o.isLight) s+=o.intensity+o.position.x*.01; if(o.isInstancedMesh) n+=o.count; if(!skipPos&&o.parent===g) s+=o.position.x*.37+o.position.y*.11+o.position.z*.29+o.rotation.y*.7; }); return Math.round(s*1e3)/1e3+'/'+n; };
const form=(w)=>w.group.children.filter(g=>g.isGroup&&g.children.some(c=>c.isMesh&&c.geometry.attributes.position.count>800));
// A: Suspended Dunes: shapes, rotations and per-formation contents identical; only positions of formations that intersected may change
let builds=0,shapeSame=0,rotSame=0,contentSame=0,restSame=0,moved=0,unmovedChanged=0,formTotal=0,movedMax=0;
const seeds=[3041,278376]; for(let a=0;a<5;a++){ let n=0; for(let s=2;s<4000&&n<14;s++) if(OLD.archetype(2,s)===a&&!seeds.includes(s)){ seeds.push(s); n++; } }
for(const Q of [1,.6]) for(const seed of seeds){ const o=OLDB(2,seed,env(Q)), n=NEW.build(2,seed,env(Q)); builds++; const fo=form(o), fn=form(n); let ss=fo.length===fn.length, rs=true, cs=true;
  fo.forEach((g,i)=>{ const h=fn[i]; formTotal++; const m1=g.children.find(c=>c.isMesh&&c.geometry.attributes.position.count>800), m2=h.children.find(c=>c.isMesh&&c.geometry.attributes.position.count>800);
    if(hashGeo(m1.geometry)!==hashGeo(m2.geometry)) ss=false; if(Math.abs(g.rotation.y-h.rotation.y)>1e-9||Math.abs(g.rotation.x-h.rotation.x)>1e-9) rs=false;
    if(g.children.length!==h.children.length) cs=false; else g.children.forEach((c,k)=>{ const d=h.children[k]; if(c.geometry&&d.geometry&&hashGeo(c.geometry)!==hashGeo(d.geometry)) cs=false; });
    const d=Math.hypot(g.position.x-h.position.x,g.position.y-h.position.y,g.position.z-h.position.z); if(d>1e-9){ moved++; movedMax=Math.max(movedMax,d); } });
  if(ss) shapeSame++; if(rs) rotSame++; if(cs) contentSame++;
  // everything outside the formation groups (particles, haze, lights, sprites): identical
  const strip=(w)=>{ const keep=new THREE.Group(); w.group.children.forEach(c=>{ if(!(c.isGroup&&c.children.some(k=>k.isMesh&&k.geometry.attributes.position.count>800))) keep.add(c.clone(false)); }); return keep; };
  const cnt=(w)=>w.group.children.length-form(w).length; if(cnt(o)===cnt(n)) restSame++; }
console.log('Suspended Dunes: builds compared',builds,'(seeds incl. screenshot seed 278376, both tiers); formations compared',formTotal);
console.log('  every formation has the identical shape (geometry) before and after:',shapeSame+'/'+builds,'builds');
console.log('  every formation has identical rotation:',rotSame+'/'+builds,'| identical contents (streams, stones):',contentSame+'/'+builds,'| identical number of other scene objects:',restSame+'/'+builds);
console.log('  formations moved:',moved,'of',formTotal,'(largest move',movedMax.toFixed(1),'units); formations not moved are identical by position');
// B: The Tidal Archive and The Blooming Silence: completely identical
for(const [w,name] of [[0,'The Tidal Archive'],[1,'The Blooming Silence']]){ let same=0,tot=0; for(const Q of [1,.6]) for(let k=0;k<25;k++){ const seed=k===0?[1013,2027][w]:1+k*7919%99991; const o=OLDB(w,seed,env(Q)), n=NEW.build(w,seed,env(Q)); for(const x of [o,n]) for(let f=0;f<3;f++) x.update(f*.3,.016); tot++; if(sigAll(o.group)===sigAll(n.group)) same++; }
  console.log(name+': identical before/after in',same+'/'+tot,'builds (25 seeds, both tiers; geometry, colours, lights, positions)'); }
// C: the earlier Tidal Archive correction is still in place (the central island's mirror never rises above the sea)
let maxAbove=-1e9; for(let k=0;k<40;k++){ const seed=k===0?1013:1+k*7919%99991, n=NEW.build(0,seed,env(1)); n.group.updateMatrixWorld(true); let seaY=null; n.group.traverse(x=>{ if(x.isMesh&&x.geometry.type==='PlaneGeometry'&&x.geometry.parameters.width===90) seaY=x.position.y; });
  n.group.traverse(x=>{ if(x.isGroup&&x.scale.y<0&&Math.abs(x.position.x)<1e-6&&Math.abs(x.position.z)<1e-6){ maxAbove=Math.max(maxAbove,new THREE.Box3().setFromObject(x).max.y-seaY); } }); }
console.log('Tidal Archive mountain correction: highest point of the central island mirror above the sea over 40 seeds =',maxAbove.toFixed(2),'units (must stay at or below about 0.3)');
