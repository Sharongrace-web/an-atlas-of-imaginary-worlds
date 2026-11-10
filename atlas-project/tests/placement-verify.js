// Independent intersection check on the real meshes (rotations, tilt and all): a vertex of formation A lies inside formation B when a vertical ray through it
// hits B's top and underside on either side of the vertex.
const THREE=require('three'); global.window=global; global.THREE=THREE; const fs=require('fs');
const file=process.argv[2], perComp=+process.argv[3]||20, extra=process.argv[4]?+process.argv[4]:null;
(0,eval)(fs.readFileSync(file,'utf8'));
const env=(Q)=>({timeU:{value:0},spriteTex:new THREE.Texture(),px:{value:1},Q});
const NAMES=WORLD3D.ARCH_NAMES[2], ray=new THREE.Raycaster(), down=new THREE.Vector3(0,-1,0), v=new THREE.Vector3();
function meshes(w){ const out=[]; w.group.children.forEach(g=>{ if(!g.isGroup) return; const m=g.children.find(c=>c.isMesh&&c.geometry&&c.geometry.attributes.position.count>800); if(m) out.push(m); }); return out; }
function intersectingPairs(w){ w.group.updateMatrixWorld(true); const M=meshes(w); M.forEach(m=>{ m.geometry.computeBoundingBox(); m.userData.box=new THREE.Box3().copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld); }); let bad=0,pairs=[];
  for(let a=0;a<M.length;a++) for(let b=0;b<M.length;b++){ if(a===b) continue; const A=M[a],B=M[b]; if(!A.userData.box.intersectsBox(B.userData.box)) continue;
    const P=A.geometry.attributes.position; let inside=0; const bb=B.userData.box;
    for(let i=0;i<P.count;i+=17){ v.fromBufferAttribute(P,i).applyMatrix4(A.matrixWorld); if(v.x<bb.min.x||v.x>bb.max.x||v.z<bb.min.z||v.z>bb.max.z||v.y<bb.min.y||v.y>bb.max.y) continue;
      ray.set(new THREE.Vector3(v.x,bb.max.y+5,v.z),down); const h=ray.intersectObject(B,false); if(h.length>=2){ const ys=h.map(x=>x.point.y); if(v.y>Math.min(...ys)&&v.y<Math.max(...ys)) inside++; } }
    if(inside>0&&a<b){ bad++; pairs.push([a,b,inside]); } else if(inside>0) { /* counted once */ } }
  return bad; }
const seeds=[[],[],[],[],[]]; for(let s=2;s<4000;s++){ const a=WORLD3D.archetype(2,s); if(seeds[a].length<perComp&&s!==3041&&s!==278376) seeds[a].push(s); } seeds[0].unshift(3041); if(extra) seeds[1].unshift(extra);
let all=0,allSeeds=0; const rows=[];
for(let a=0;a<5;a++) for(const Q of [1,.6]){ let withP=0,pairs=0,worst=0; for(const s of seeds[a]){ const w=WORLD3D.build(2,s,env(Q)); const n=intersectingPairs(w); pairs+=n; if(n)withP++; worst=Math.max(worst,n); }
  rows.push([NAMES[a],Q===1?'desktop':'mobile',seeds[a].length,withP,pairs,worst]); all+=pairs; allSeeds+=seeds[a].length; }
console.log('composition | tier | seeds | seeds with intersecting formations | intersecting pairs | worst seed'); rows.forEach(r=>console.log(r.join(' | '))); console.log('TOTAL intersecting pairs',all,'over',allSeeds*1,'builds');
if(extra){ const w=WORLD3D.build(2,extra,env(1)); console.log('screenshot seed',extra,w.label,'intersecting pairs:',intersectingPairs(w)); }
