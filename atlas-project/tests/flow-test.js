const fs=require('fs'),THREE=require('three');
const FAIL=process.env.FAIL_LS==='1', FULL=process.env.FULL_LS==='1';
const mk=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>0:(k==='length'?0:mk()),apply:()=>mk(),set:()=>true});
const els={}; const created=[];
let rafCb=null; const handlers={}; let now=0; let timers=[];
global.window=global; global.THREE=THREE; global.innerWidth=1280; global.innerHeight=720; global.devicePixelRatio=2;
global.matchMedia=(q)=>({matches:false}); global.requestAnimationFrame=(cb)=>{rafCb=cb;};
global.setTimeout=(f,d)=>{timers.push({t:now+d,f});return 1;}; global.clearTimeout=()=>{};
global.addEventListener=(n,f)=>{handlers[n]=f;};
const store={}; 
if(FAIL) Object.defineProperty(global,'localStorage',{get(){throw new Error('SecurityError')}});
else global.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{ if(FULL&&k!=='_t'&&v.length>2000) throw new Error('QuotaExceeded'); store[k]=String(v);},removeItem:k=>{delete store[k];}};
const el=()=>{ const o=mk(); return new Proxy(o,{get:(t,k)=>k==='toDataURL'?()=> 'data:image/jpeg;base64,'+'A'.repeat(3000):(k==='getContext'?()=>mk():o[k])}); };
global.document={getElementById:(id)=>{ if(!els[id]) els[id]=new Proxy({value:'',textContent:'',hidden:false,classList:new Set(),dataset:{},style:{setProperty(){}},children:[],
  min:0,max:1,step:.01, setAttribute(){}, addEventListener(){}, appendChild(){}, offsetWidth:1}, {get:(t,k)=>{ if(k==='classList') return {add:c=>t.cl=(t.cl||new Set()).add(c),remove:c=>(t.cl=(t.cl||new Set())).delete(c),toggle:(c,on)=>{t.cl=t.cl||new Set(); on?t.cl.add(c):t.cl.delete(c)},contains:c=>!!(t.cl&&t.cl.has(c))}; if(k in t) return t[k]; return mk(); }, set:(t,k,v)=>{t[k]=v;return true}}); return els[id]; },
  createElement:()=>el(), body:mk()};
THREE.WebGLRenderer=class{constructor(){this.shadowMap={};}setPixelRatio(){}setSize(){}render(){}};
const run=(f)=>{(0,eval)(fs.readFileSync('/mnt/user-data/outputs/atlas-project/'+f,'utf8'));};
run('js/worlds.js'); run('js/worlds3d.js'); run('js/script.js');
const A=window.__atlas;
const frames=(n)=>{for(let i=0;i<n;i++){now+=16;const due=timers.filter(x=>x.t<=now);timers=timers.filter(x=>x.t>now);due.forEach(x=>x.f());rafCb(now);}};
const log=(l)=>console.log(l.padEnd(24),JSON.stringify(A.debug()).replace(/"cam":\[[^\]]*\],/,'').slice(0,230));
const assert=(c,m)=>{ if(!c){console.log('FAIL:',m);process.exitCode=1;} };
A.goAtlas(); frames(200); log('atlas');
for(let i=0;i<3;i++){ A.enter(i); frames(330); log('world '+i); assert(A.debug().state==='world','in world '+i);
  A.togglePanel('adjust'); assert(A.debug().panels.join()==='adjust','adjust open'); A.togglePanel('notes'); assert(A.debug().panels.join()==='notes','notes replaces adjust'); A.togglePanel('notes'); assert(A.debug().panels.length===0,'notes closes');
  for(const [k,v] of [['fog',2],['fog',.3],['scale',1.4],['scale',.7],['particles',0],['particles',1],['mood',-1],['mood',1],['mood',0]]){ A.setSetting(k,v); frames(3); }
  assert(A.debug().set.mood===0,'settings stored');
  A.keep(); frames(3); log('kept '+i);
  A.regen(); frames(200); log('variation '+i); assert(A.debug().state==='world','back in world after variation');
  A.keep(); frames(3);
  A.leave(); frames(200); assert(A.debug().state==='atlas','left to atlas'); }
A.openCollection(); frames(5); log('collection'); assert(A.debug().state==='collection','collection open from atlas');
A.openSaved(0); frames(330); log('opened saved'); assert(A.debug().state==='world'&&A.debug().world,'saved world opened');
A.openCollection(); assert(A.debug().state==='collection','collection from world'); A.closeCollection(); assert(A.debug().state==='world','closes back to world');
A.openCollection(); A.openSaved(3); frames(330); assert(A.debug().state==='world','open second saved from world');
A.leave(); frames(200); A.backToIntro(); frames(100); log('intro again');
global.innerWidth=390; global.innerHeight=800; handlers.resize(); A.goAtlas(); frames(200); A.enter(1); frames(330); A.keep(); frames(3); A.togglePanel('adjust'); frames(5); log('mobile world');
// escape key path
handlers.keydown&&handlers.keydown({key:'Escape'}); log('after esc 1'); handlers.keydown&&handlers.keydown({key:'Escape'}); frames(200); log('after esc 2');
const c=A.debug().cam; assert(c.every(Number.isFinite),'finite camera');
console.log(FAIL?'MODE storage-unavailable':FULL?'MODE storage-full':'MODE normal','done, kept:',A.debug().kept,'storage:',A.debug().storage);
