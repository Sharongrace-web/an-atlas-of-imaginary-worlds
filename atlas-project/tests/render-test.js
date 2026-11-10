const THREE=require('three'); const {PNG}=require('pngjs'); const fs=require('fs');
global.window=global; global.THREE=THREE; global.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){},fillStyle:''}),width:0,height:0})};
(0,eval)(fs.readFileSync('/mnt/user-data/outputs/atlas-project/js/worlds3d.js','utf8'));
const W=+process.env.W||640,H=+process.env.H||400; const idx=+process.env.WORLD, seed=+process.env.SEED, Q=+(process.env.Q||1);
const errs=[]; const ce=console.error; console.error=(...a)=>{errs.push(a.join(' ').slice(0,300));}; console.warn=()=>{};
const glc=require('gl')(W,H,{preserveDrawingBuffer:true,antialias:false});
const canvas={width:W,height:H,style:{},addEventListener(){},removeEventListener(){},getContext:()=>glc,clientWidth:W,clientHeight:H};
glc.canvas=canvas; const renderer=new THREE.WebGLRenderer({canvas,context:glc,antialias:false}); renderer.setSize(W,H,false);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(); const tex=new THREE.Texture(); const env={timeU:{value:0},spriteTex:tex,px:{value:1},Q};
const w=WORLD3D.build(idx,seed,env); scene.add(w.group); scene.fog=new THREE.FogExp2(w.fog.color,w.fog.density);
const sky=new THREE.Color(w.sky[1]); scene.background=sky;
const skyDome=(()=>{ const g=new THREE.SphereGeometry(50,24,16), P=g.attributes.position, col=new Float32Array(P.count*3), top=new THREE.Color(w.sky[0]), bot=new THREE.Color(w.sky[1]), gl=new THREE.Color(w.sky[2]), c=new THREE.Color();
  for(let i=0;i<P.count;i++){ const y=P.getY(i)/50*.5+.5, s=Math.min(1,Math.max(0,(y-.15)/.8)), sm=s*s*(3-2*s); c.copy(bot).lerp(top,sm); c.r+=gl.r*Math.exp(-Math.pow((y-.5)*3.4,2))*.32; c.g+=gl.g*Math.exp(-Math.pow((y-.5)*3.4,2))*.32; c.b+=gl.b*Math.exp(-Math.pow((y-.5)*3.4,2))*.32; col.set([c.r,c.g,c.b],i*3); }
  g.setAttribute('color',new THREE.BufferAttribute(col,3)); const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false,depthWrite:false})); m.renderOrder=-1; m.frustumCulled=false; scene.add(m); return m; })();
const camera=new THREE.PerspectiveCamera(50,W/H,.1,100);
const yaw=process.env.YAW!==undefined?+process.env.YAW:(w.cam.yaw0!==undefined?w.cam.yaw0:.6), dist=+(process.env.DIST||w.cam.dist), pitch=+(process.env.PITCH||w.cam.pitch0), c=process.env.CENTER?new THREE.Vector3(...process.env.CENTER.split(',').map(Number)):w.cam.center;
const T0=+(process.env.T0||0); for(let k=0;k<60;k++){ env.timeU.value=T0+k*.1; w.update(T0+k*.1,.016); }
camera.position.set(c.x+Math.sin(yaw)*Math.cos(pitch)*dist,c.y+Math.sin(pitch)*dist,c.z+Math.cos(yaw)*Math.cos(pitch)*dist); camera.lookAt(c);
if(process.env.TINT){ w.setScale(1.4); const tn=new THREE.Color(1,1,1).lerp(new THREE.Color('#ffc79a'),.55);
  w.group.traverse(o=>{ if(o.isLight){o.color.multiply(tn);} const m=o.material; if(m&&m.color&&!m.isShaderMaterial){ m.color.multiply(tn);} if(o.isPoints&&m&&m.uniforms&&m.uniforms.uBox) o.geometry.setDrawRange(0,Math.floor(o.geometry.attributes.position.count*.4)); });
  scene.fog.density*=2; for(let k=0;k<5;k++) w.update(7+k*.1,.016); }
if(process.env.DENS!==undefined){ const dn=+process.env.DENS; w.group.traverse(o=>{ if(o.isPoints&&o.material.uniforms&&o.material.uniforms.uBox) o.geometry.setDrawRange(0,Math.floor(o.geometry.attributes.position.count*dn)); }); }
skyDome.position.copy(camera.position);
renderer.render(scene,camera);
const px=new Uint8Array(W*H*4); glc.readPixels(0,0,W,H,glc.RGBA,glc.UNSIGNED_BYTE,px);
const png=new PNG({width:W,height:H}); let bg=0,sum=0; const b0=[sky.r*255,sky.g*255,sky.b*255];
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const s=((H-1-y)*W+x)*4,d=(y*W+x)*4; for(let k=0;k<4;k++)png.data[d+k]=px[s+k]; if(Math.abs(px[s]-b0[0])+Math.abs(px[s+1]-b0[1])+Math.abs(px[s+2]-b0[2])<6)bg++;}
if(process.env.CMP){ const f='/tmp/t/'+process.env.CMP+'.bin'; if(fs.existsSync(f)){ const b=fs.readFileSync(f); let d=0; for(let i=0;i<px.length;i+=4){ if(Math.abs(px[i]-b[i])+Math.abs(px[i+1]-b[i+1])+Math.abs(px[i+2]-b[i+2])>12) d++; } console.log('pixels changed by particles vs density 0:',d,'('+(100*d/(W*H)).toFixed(2)+'% of frame)'); } else fs.writeFileSync(f,Buffer.from(px)); }
fs.writeFileSync(process.env.OUT||'/tmp/t/out.png',PNG.sync.write(png));
console.log('world',idx,'seed',seed,'background-coloured pixels:',(100*bg/(W*H)).toFixed(1)+'%','GL errors/warnings:',errs.length, errs.slice(0,3));
const info=renderer.info; console.log('draw calls',info.render.calls,'triangles',info.render.triangles);
