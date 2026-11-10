// How big, how many and how visible are the dunes' particles at the default camera?
const THREE=require('three'); global.window=global; global.THREE=THREE;
(0,eval)(require('fs').readFileSync('/mnt/user-data/outputs/atlas-project/js/worlds3d.js','utf8'));
const env={timeU:{value:0},spriteTex:new THREE.Texture(),px:{value:1},Q:1};
const w=WORLD3D.build(2,3041,env); let sys=0,pts=0,rows=[];
const cam=new THREE.PerspectiveCamera(50,1.6,.1,100), c=w.cam.center, yaw=.35,pitch=.17,d=40;
cam.position.set(c.x+Math.sin(yaw)*Math.cos(pitch)*d,c.y+Math.sin(pitch)*d,c.z+Math.cos(yaw)*Math.cos(pitch)*d); cam.lookAt(c); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
w.group.updateMatrixWorld(true);
w.group.traverse(o=>{ if(o.isPoints&&o.material.uniforms&&o.material.uniforms.uBox){ sys++; const n=o.geometry.attributes.position.count; pts+=n;
  const v=new THREE.Vector3(); o.getWorldPosition(v); const dist=v.distanceTo(cam.position); const u=o.material.uniforms.uSize.value;
  const px=u*(.5+.65)*(14/dist); rows.push([n,u,+dist.toFixed(0),+px.toFixed(2)]); } });
console.log('particle systems',sys,'total points',pts); console.log('[count, size, distance to camera, approx px size]'); console.log(JSON.stringify(rows.slice(0,8)));
