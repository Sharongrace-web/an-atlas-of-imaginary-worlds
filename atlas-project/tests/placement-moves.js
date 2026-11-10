const THREE=require('three'); global.window=global; global.THREE=THREE; const fs=require('fs');
const load=(f)=>{ delete global.WORLD3D; (0,eval)(fs.readFileSync(f,'utf8')); return global.WORLD3D; };
const OLD=load('/tmp/t/worlds3d_before2.js'), OLDB=OLD.build, OLDA=OLD.archetype; const NEW=load('/mnt/user-data/outputs/atlas-project/js/worlds3d.js');
const env=(Q)=>({timeU:{value:0},spriteTex:new THREE.Texture(),px:{value:1},Q});
// C (redone): earlier Tidal correction, measured after the world's first animation updates have positioned the mirrors
let maxAbove=-1e9,worst=null; for(let k=0;k<60;k++){ const seed=k===0?1013:1+k*7919%99991, n=NEW.build(0,seed,env(1)); for(let f=0;f<5;f++) n.update(f*.3,.016); n.group.updateMatrixWorld(true); let seaY=null; n.group.traverse(x=>{ if(x.isMesh&&x.geometry.type==='PlaneGeometry'&&x.geometry.parameters.width===90) seaY=x.position.y; });
  n.group.traverse(x=>{ if(x.isGroup&&x.scale.y<0&&Math.abs(x.position.x)<1e-6&&Math.abs(x.position.z)<1e-6){ const a=new THREE.Box3().setFromObject(x).max.y-seaY; if(a>maxAbove){maxAbove=a;worst=seed;} } }); }
console.log('Tidal Archive mountain correction: highest point of the central island mirror above the sea, 60 seeds, after animation updates:',maxAbove.toFixed(2),'units (seed',worst+'); the island bobs by 0.25');
// per composition: how many formations moved
const form=(w)=>w.group.children.filter(g=>g.isGroup&&g.children.some(c=>c.isMesh&&c.geometry.attributes.position.count>800));
const names=NEW.ARCH_NAMES[2], rows=[]; const sel=[[],[],[],[],[]]; for(let s=2;s<4000;s++){ const a=OLDA(2,s); if(sel[a].length<20&&s!==3041) sel[a].push(s); } sel[0].unshift(3041);
for(let a=0;a<5;a++){ let seedsMoved=0,moved=0,tot=0; for(const s of sel[a]){ const o=OLDB(2,s,env(1)), n=NEW.build(2,s,env(1)); const fo=form(o),fn=form(n); let any=false; fo.forEach((g,i)=>{ tot++; if(Math.hypot(g.position.x-fn[i].position.x,g.position.y-fn[i].position.y,g.position.z-fn[i].position.z)>1e-9){moved++;any=true;} }); if(any) seedsMoved++; }
  rows.push([names[a],sel[a].length,seedsMoved,moved,tot]); }
console.log('composition | seeds checked | seeds where any formation moved | formations moved | formations total'); rows.forEach(r=>console.log(r.join(' | ')));
const seedsJson=JSON.parse(fs.readFileSync('/tmp/t/seeds.json','utf8'))[2]; const dflt=seedsJson.map(s=>{ const o=OLDB(2,s,env(1)), n=NEW.build(2,s,env(1)); const fo=form(o),fn=form(n); let m=0; fo.forEach((g,i)=>{ if(Math.hypot(g.position.x-fn[i].position.x,g.position.y-fn[i].position.y,g.position.z-fn[i].position.z)>1e-9) m++; }); return s+':'+m; });
console.log('formations moved in the five seeds shown in the earlier contact sheet (seed:moved):',dflt.join('  '));
