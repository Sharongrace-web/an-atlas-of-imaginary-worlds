/* script.js — Phase 0 (shared renderer + visual system) and Phase 1 (intro + atlas).
   Sections: 1 Setup · 2 Sky · 3 Particles · 4 Intro structure · 5 Orbs · 6 Layout
             7 Interaction · 8 State changes · 9 Animation loop */
(() => {
'use strict';
const WORLDS = window.WORLDS;
const $ = (id) => document.getElementById(id);
const body = document.body, canvas = $('stage');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const col = (h) => new THREE.Color(h);
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt)); // smooth "ease toward target"
const ease = (x) => x * x * (3 - 2 * x);

/* ---------- 1. SETUP: the shared renderer ---------- */
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { body.dataset.state = 'nogl'; return; }
let dpr = Math.min(window.devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 1.75);   // cap resolution to stay light
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // only lights that ask for shadows (the dunes' sun, on desktop) use them
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
const timeU = { value: 0 };          // one shared clock for every shader
const pxUniforms = [];               // lets us lower resolution if the device struggles
const pxShared = { value: dpr }; pxUniforms.push(pxShared);   // used by the world particle shaders

/* ---------- 2. SKY: a gradient dome whose colours we can change ---------- */
const skyU = { uTop: { value: col('#0c0d2b') }, uBot: { value: col('#3b3573') }, uGlow: { value: col('#d8a7b8') } };
const skyT = { top: col('#0c0d2b'), bot: col('#3b3573'), glow: col('#d8a7b8') };
const SKIES = {
  intro: ['#0c0d2b', '#3b3573', '#d8a7b8'],
  atlas: ['#0d0f2c', '#2a3b72', '#a9e3e8']
};
const setSky = (t, b, g) => { skyT.top.set(t); skyT.bot.set(b); skyT.glow.set(g); };
const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 16), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false,
  vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `varying vec3 vP; uniform vec3 uTop,uBot,uGlow;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){
      float y=normalize(vP).y*.5+.5;
      vec3 c=mix(uBot,uTop,smoothstep(.15,.95,y));
      c+=uGlow*exp(-pow((y-.5)*3.4,2.))*.32;          /* soft horizon glow */
      c+=(h(gl_FragCoord.xy)-.5)/128.;                /* dither: removes colour banding */
      gl_FragColor=vec4(c,1.); }`
}));
sky.frustumCulled = false; sky.renderOrder = -1; scene.add(sky);

// A soft round sprite drawn in code (no image files)
const spriteTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

/* ---------- 3. PARTICLES: drifting motes, animated entirely on the GPU ---------- */
const partU = { uTime: timeU, uPx: { value: dpr }, uFade: { value: 1 } };
pxUniforms.push(partU.uPx);
const particles = (() => {
  const n = reduced ? 260 : 620, pos = new Float32Array(n * 3), cl = new Float32Array(n * 3), sd = new Float32Array(n);
  const pal = [col('#F4EDE0'), col('#B9A7E0'), col('#A9E3E8'), col('#D8A7B8')];
  for (let i = 0; i < n; i++) {
    pos.set([(Math.random() - .5) * 30, (Math.random() - .5) * 16, -10 + Math.random() * 18], i * 3);
    const c = pal[(Math.random() * 4) | 0]; cl.set([c.r, c.g, c.b], i * 3); sd[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(cl, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
  const m = new THREE.ShaderMaterial({ uniforms: partU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aColor; attribute float aSeed; uniform float uTime,uPx; varying vec3 vC; varying float vA;
      void main(){
        vec3 p=position;
        p.y=mod(p.y+uTime*(.08+aSeed*.12)+8.,16.)-8.;     /* slow upward drift, wraps around */
        p.x+=sin(uTime*.15+aSeed*30.)*.5; p.z+=cos(uTime*.12+aSeed*20.)*.4;
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        gl_PointSize=(1.5+aSeed*3.5)*uPx*(9./-mv.z);
        vC=aColor; vA=.2+.45*(.5+.5*sin(uTime*(.4+aSeed)+aSeed*40.)); }`,
    fragmentShader: `varying vec3 vC; varying float vA; uniform float uFade;
      void main(){ float a=smoothstep(.5,0.,length(gl_PointCoord-.5)); gl_FragColor=vec4(vC,a*a*vA*uFade); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts;
})();

/* ---------- 4. INTRO STRUCTURE: a glowing point-cloud knot inside two wire cages ---------- */
const knotU = { uTime: timeU, uPx: { value: dpr }, uFade: { value: 1 } };
pxUniforms.push(knotU.uPx);
const knotMat = new THREE.ShaderMaterial({ uniforms: knotU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `uniform float uTime,uPx; varying vec3 vC; varying float vS;
    void main(){
      vec3 p=position+normal*sin(uTime*.7+position.y*3.+position.x*2.)*.05;   /* gentle breathing */
      vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
      gl_PointSize=2.6*uPx*(8./-mv.z);
      float k=.5+.5*sin(position.x*1.7+position.z*1.3+uTime*.25);
      vC=mix(vec3(.72,.65,.88),vec3(.66,.89,.91),k);                           /* lavender to cyan */
      vC=mix(vC,vec3(.85,.65,.72),smoothstep(.55,1.,.5+.5*sin(position.y*2.1-uTime*.2))); /* pink blush */
      vS=.5+.5*sin(position.x*9.+uTime*.9); }`,
  fragmentShader: `uniform float uFade; varying vec3 vC; varying float vS;
    void main(){ float a=smoothstep(.5,0.,length(gl_PointCoord-.5)); gl_FragColor=vec4(vC,a*a*(.35+.5*vS)*uFade); }` });
const intro = new THREE.Group();
const knot = new THREE.Points(new THREE.TorusKnotGeometry(1.05, .3, 240, 18, 2, 3), knotMat);
const lineMat = (c) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: .1, depthWrite: false });
const cage = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.95, 1)), lineMat(0xF4EDE0));
const cage2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.35, 0)), lineMat(0xB9A7E0));
const introGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex, color: 0xB9A7E0, transparent: true, opacity: .3, depthWrite: false, blending: THREE.AdditiveBlending }));
introGlow.scale.setScalar(8);
intro.add(introGlow, knot, cage, cage2); scene.add(intro);

/* ---------- 5. ORBS: one luminous sphere per world ---------- */
const orbVS = `varying vec3 vN,vV,vP; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=-mv.xyz; vP=position; gl_Position=projectionMatrix*mv; }`;
const orbFS = `varying vec3 vN,vV,vP; uniform vec3 uColor,uGlow; uniform float uTime,uHover,uOpacity;
  void main(){
    float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2);             /* bright rim, like a lens of light */
    float bands=.5+.5*sin(vP.y*4.+uTime*.4+sin(vP.x*3.+uTime*.3)*1.5);     /* slow drifting colour bands */
    vec3 c=mix(uColor,uGlow,bands*.45); c=mix(c,vec3(.96,.93,.88),f*.55+uHover*.15);
    gl_FragColor=vec4(c*(.8+f*.6),(.55+f*.45+uHover*.15)*uOpacity); }`;
const orbs = WORLDS.map((w, i) => {
  const g = new THREE.Group();
  const uni = { uTime: timeU, uColor: { value: col(w.core) }, uGlow: { value: col(w.glow) }, uHover: { value: 0 }, uOpacity: { value: 0 } };
  const core = new THREE.Mesh(new THREE.SphereGeometry(.8, 48, 32), new THREE.ShaderMaterial({ uniforms: uni, vertexShader: orbVS, fragmentShader: orbFS, transparent: true, depthWrite: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex, color: col(w.glow), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(4.4);
  const n = 110, rp = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) { const a = Math.random() * 6.283, r = 1.2 + Math.random() * .55; rp.set([Math.cos(a) * r, (Math.random() - .5) * .12, Math.sin(a) * r], k * 3); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
  const ring = new THREE.Points(rg, new THREE.PointsMaterial({ map: spriteTex, color: col(w.glow), size: .09, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  ring.rotation.set(.9 + i * .25, 0, .3 * i);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); // invisible, bigger click target
  hit.userData.i = i;
  g.add(halo, core, ring, hit); g.scale.setScalar(.001); g.visible = false; scene.add(g);
  return { g, core, halo, ring, uni, hit, base: new THREE.Vector3(), appear: 0, target: 0, hover: 0, flare: 0, flareT: 0 };
});

/* ---------- 6. LAYOUT: adapts to landscape and portrait screens ---------- */
let state = 'intro', sel = -1, focus = -1;
const L = { z: 9, knot: new THREE.Vector3(), knotS: 1 };
const camPos = new THREE.Vector3(0, 0, 7), look = new THREE.Vector3(), camT = new THREE.Vector3(0, 0, 7), lookT = new THREE.Vector3();
function setCameraTargets() {
  if (state === 'intro') { camT.set(0, 0, 7); lookT.set(0, 0, 0); }
  else if (state === 'atlas') { camT.set(0, 0, L.z); lookT.set(0, 0, 0); }
  else if (sel >= 0) { const b = orbs[sel].base; camT.set(b.x, b.y + .1, b.z + 2.7); lookT.copy(b); }
}
function layout() {
  const w = innerWidth, h = innerHeight, a = w / h;
  renderer.setSize(w, h, false); camera.aspect = a; camera.updateProjectionMatrix();
  let P;
  if (a < .85) {   // portrait: stack the worlds vertically, leave room for the bottom sheet
    L.z = 10.5; P = [[-.9, 3.1, 0], [.9, .8, -.6], [-.5, -1.5, .2]]; L.knot.set(0, 1.7, 0); L.knotS = .72;
  } else {
    const s = Math.min(4.4, Math.max(2.2, a * 2.5));
    L.z = Math.max(8.5, (s + 1.5) / (.466 * a)); P = [[-s, .35, 0], [0, -.5, -.9], [s, .55, .3]];
    L.knot.set(Math.min(2.7, a * 1.45), 0, 0); L.knotS = a < 1.3 ? .85 : 1;
  }
  orbs.forEach((o, i) => o.base.set(P[i][0], P[i][1], P[i][2]));
  setCameraTargets();
}

/* ---------- 7. INTERACTION ---------- */
const labelBox = $('labels');
const labels = WORLDS.map((w, i) => {
  const b = document.createElement('button'); b.className = 'label'; b.type = 'button';
  b.innerHTML = '<span class="n">' + w.numeral + '</span><span class="t">' + w.name + '</span>';
  b.setAttribute('aria-label', 'Plate ' + w.numeral + ': ' + w.name);
  b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') requestFocus(i); });
  b.addEventListener('focus', () => requestFocus(i));
  b.addEventListener('click', () => activate(i));
  labelBox.appendChild(b); return b;
});
const rec = { root: $('record'), id: $('rec-id'), status: $('rec-status'), name: $('rec-name'), coords: $('rec-coords'), poem: $('rec-poem'), method: $('rec-method') };
let focusTimer = 0, lastType = 'mouse', px = 0, py = 0;
function applyFocus(i) {
  clearTimeout(focusTimer);
  if (i === focus) return; focus = i;
  if (i < 0) { rec.root.classList.remove('on'); return; }
  const w = WORLDS[i];
  rec.id.textContent = w.id + ', Plate ' + w.numeral; rec.status.textContent = w.status; rec.name.textContent = w.name;
  rec.coords.textContent = w.coords; rec.poem.textContent = w.description; rec.method.textContent = w.method;
  rec.root.style.setProperty('--accent', w.glow); rec.root.classList.add('on');
}
function requestFocus(i) {   // small delay when leaving, so the pointer can travel to the panel
  if (i >= 0) applyFocus(i); else if (focus >= 0) { clearTimeout(focusTimer); focusTimer = setTimeout(() => applyFocus(-1), 450); }
}
function activate(i) { if (lastType === 'mouse' || focus === i) enter(i); else applyFocus(i); } // touch: first tap reads, second enters
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function pick() {
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(orbs.filter((o) => o.appear > .5).map((o) => o.hit), false);
  return hits.length ? hits[0].object.userData.i : -1;
}
const setPtr = (e) => { lastType = e.pointerType || lastType; px = e.clientX / innerWidth * 2 - 1; py = -(e.clientY / innerHeight * 2 - 1); ptr.set(px, py); };
window.addEventListener('pointermove', (e) => {
  setPtr(e);
  if (state === 'atlas' && e.pointerType === 'mouse' && e.target === canvas) { const i = pick(); canvas.style.cursor = i >= 0 ? 'pointer' : 'default'; requestFocus(i); }
});
window.addEventListener('pointerdown', setPtr);
canvas.addEventListener('click', () => { if (state !== 'atlas') return; const i = pick(); if (i >= 0) activate(i); else if (lastType !== 'mouse') applyFocus(-1); });
rec.root.addEventListener('pointerenter', () => clearTimeout(focusTimer));
rec.root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') requestFocus(-1); });
$('explore').addEventListener('click', goAtlas);
$('toIntro').addEventListener('click', backToIntro);
$('enter').addEventListener('click', () => { if (focus >= 0) enter(focus); });
$('leave').addEventListener('click', leave);

/* ---------- 8. STATE CHANGES (intro, atlas, entering, world) ---------- */
function setState(s) { state = s; body.dataset.state = s; if (s !== 'world') closePanels(); }
function goAtlas() {
  setState('atlas'); setSky(...SKIES.atlas); setCameraTargets();
  orbs.forEach((o, i) => setTimeout(() => { if (state === 'atlas') o.target = 1; }, 700 + i * 280));
}
function backToIntro() {
  applyFocus(-1); setState('intro'); setSky(...SKIES.intro); orbs.forEach((o) => { o.target = 0; }); setCameraTargets();
}
/* The world camera: an orbit around the world's centre. It drifts slowly on its own and follows drag, wheel and pinch. */
const veil = $('veil'), hud = { name: $('hud-name'), seed: $('hud-seed') };
const SEEDS = [1013, 2027, 3041];   // starting seed of each world; "New variation" picks a fresh one
const Q = (matchMedia('(pointer: coarse)').matches || innerWidth < 700) ? .6 : 1;   // lighter scenes on phones and tablets
const wc = { yaw: 0, pitch: .3, dist: 20, yawT: 0, pitchT: .3, distT: 20, rate: .7, cfg: null, drag: false };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let world = null, tid = 0;
const later = (fn, ms) => { const my = tid; setTimeout(() => { if (my === tid) fn(); }, ms); };   // timers are cancelled if another change starts
const setSkyNow = (t, b, g) => { setSky(t, b, g); skyU.uTop.value.copy(skyT.top); skyU.uBot.value.copy(skyT.bot); skyU.uGlow.value.copy(skyT.glow); };
function startWorld(i) {
  const seed = SEEDS[i];
  world = WORLD3D.build(i, seed, { timeU, spriteTex, px: pxShared, Q });
  scene.add(world.group); scene.fog = new THREE.FogExp2(world.fog.color, world.fog.density);
  const c = world.cam;
  wc.cfg = c; wc.yaw = wc.yawT = c.yaw0 !== undefined ? c.yaw0 : (seed % 628) / 100;   // each world opens on its composed view wc.pitch = wc.pitchT = c.pitch0; wc.dist = c.max * 1.5; wc.distT = c.dist; wc.rate = .7;
  particles.visible = false; intro.visible = false; orbs.forEach((o) => { o.appear = 0; o.target = 0; o.g.visible = false; });
  hud.name.textContent = WORLDS[i].name; hud.seed.textContent = 'Seed ' + seed + (world.label ? ', ' + world.label : '');
  applySettings(true); syncSliders(); closePanels();
}
function stopWorld() {
  if (!world) return;
  scene.remove(world.group);
  world.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose) o.material.dispose(); if (o.isInstancedMesh && o.dispose) o.dispose(); });
  scene.fog = null; world = null; particles.visible = true;
}
function updateWorldCamera(dt) {
  const c = wc.cfg;
  if (!wc.drag) wc.yawT += c.drift * dt * (reduced ? .3 : 1);   // slow cinematic drift whenever the visitor is not dragging
  wc.yaw = damp(wc.yaw, wc.yawT, 3, dt); wc.pitch = damp(wc.pitch, wc.pitchT, 3, dt); wc.dist = damp(wc.dist, wc.distT, wc.rate, dt);
  const d = wc.dist * (1 + .025 * Math.sin(tt * .11)), cp = Math.cos(wc.pitch);
  camera.position.set(c.center.x + Math.sin(wc.yaw) * cp * d, c.center.y + Math.sin(wc.pitch) * d + Math.sin(tt * .13) * .4, c.center.z + Math.cos(wc.yaw) * cp * d);
  camera.lookAt(c.center);
}
const drags = new Map(); let pinch = 0;
const pdist = () => { const v = [...drags.values()]; return Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y); };
canvas.addEventListener('pointerdown', (e) => { if (state !== 'world') return; drags.set(e.pointerId, { x: e.clientX, y: e.clientY }); wc.drag = true; try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ } if (drags.size === 2) pinch = pdist(); });
canvas.addEventListener('pointermove', (e) => {
  const d = drags.get(e.pointerId); if (state !== 'world' || !d) return;
  if (drags.size === 1) { wc.yawT -= (e.clientX - d.x) * .005; wc.pitchT = clamp(wc.pitchT + (e.clientY - d.y) * .004, wc.cfg.pitch[0], wc.cfg.pitch[1]); }
  d.x = e.clientX; d.y = e.clientY;
  if (drags.size === 2) { const p = pdist(); if (pinch) { wc.distT = clamp(wc.distT * pinch / p, wc.cfg.min, wc.cfg.max); wc.rate = 2.4; } pinch = p; }
});
const endDrag = (e) => { drags.delete(e.pointerId); pinch = 0; wc.drag = drags.size > 0; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => { if (state !== 'world') return; e.preventDefault(); wc.distT = clamp(wc.distT * Math.exp(e.deltaY * .0012), wc.cfg.min, wc.cfg.max); wc.rate = 2.4; }, { passive: false });

/* Entering a world: dolly into the orb, fade to a veil tinted with the world's colours, build the world behind it,
   show a title card, then fade the veil away while the camera flies in. */
function enter(i) {
  if (state !== 'atlas') return;
  const w = WORLDS[i]; sel = i; tid++; applyFocus(-1); setState('entering');
  $('arr-id').textContent = w.id + ', Plate ' + w.numeral; $('arr-name').textContent = w.name; $('arr-coords').textContent = w.coords; $('arr-poem').textContent = w.description;
  veil.style.setProperty('--a1', w.a1); veil.style.setProperty('--a2', w.a2); $('arrival').style.setProperty('--accent', w.glow);
  orbs.forEach((o, k) => { o.target = k === i ? 1 : 0; o.flareT = k === i ? 1 : 0; });
  setCameraTargets();
  later(() => veil.classList.add('on'), 1000);
  later(() => { startWorld(i); setState('arrival'); }, 2000);
  later(() => { veil.classList.remove('on'); setState('world'); }, 4600);
}
function leave() {
  if (state !== 'world') return;
  tid++; setState('leaving'); veil.classList.add('on');
  later(() => {
    stopWorld(); sel = -1; setState('atlas'); setSkyNow(...SKIES.atlas);
    orbs.forEach((o) => { o.appear = 0; o.target = 1; o.flare = 0; o.flareT = 0; });
    setCameraTargets(); camPos.copy(camT); look.copy(lookT); veil.classList.remove('on');
  }, 1100);
}
function regen() {   // a new variation: same world, a fresh seed
  if (state !== 'world') return;
  const i = sel; tid++; setState('regen'); veil.classList.add('on');
  later(() => {
    const cur = WORLD3D.archetype(i, SEEDS[i]); let ns = 1;   // a new variation always lands on a different composition
    for (let k = 0; k < 60; k++) { ns = 1 + Math.floor(Math.random() * 999999); if (WORLD3D.archetype(i, ns) !== cur) break; }
    SEEDS[i] = ns; stopWorld(); startWorld(i); veil.classList.remove('on'); setState('world'); }, 1100);
}
$('regen').addEventListener('click', regen);

/* ---------- 8b. SETTINGS, PANELS, FIELD NOTES, STORAGE, COLLECTION ---------- */
const DEF = { fog: 1, scale: 1, particles: 1, mood: 0 };
const LIM = { fog: [.3, 2.2], scale: [.7, 1.4], particles: [0, 1], mood: [-1, 1] };
const SET = [0, 1, 2].map(() => Object.assign({}, DEF));   // each world remembers its own settings during a visit
const COOL = col('#9fc4ff'), WARM = col('#ffc79a');
let pending = null;
// Live settings. Fog, mood and particle density change instantly; structure scale is handled by each world.
function applySettings(instant) {
  if (!world) return;
  const S = SET[sel], tn = new THREE.Color(1, 1, 1).lerp(S.mood < 0 ? COOL : WARM, Math.abs(S.mood) * .55);
  world.group.traverse((o) => {
    if (o.isLight) { o.userData.b = o.userData.b || o.color.clone(); o.color.copy(o.userData.b).multiply(tn); }
    const m = o.material;
    if (m && m.color && !m.isShaderMaterial) { m.userData.b = m.userData.b || m.color.clone(); m.color.copy(m.userData.b).multiply(tn); }   // tint = base colour x mood colour
    if (o.isPoints && m && m.uniforms && m.uniforms.uBox) o.geometry.setDrawRange(0, Math.floor(o.geometry.attributes.position.count * S.particles));
  });
  scene.fog.density = world.fog.density * S.fog; scene.fog.color.set(world.fog.color).multiply(tn);
  setSky(col(world.sky[0]).multiply(tn), col(world.sky[1]).multiply(tn), col(world.sky[2]).multiply(tn));
  if (instant) { skyU.uTop.value.copy(skyT.top); skyU.uBot.value.copy(skyT.bot); skyU.uGlow.value.copy(skyT.glow); }
  world.setScale(S.scale);
}
const sl = {}, ov = {};
const fmt = { fog: (v) => Math.round(v * 100) + '%', scale: (v) => Math.round(v * 100) + '%', particles: (v) => Math.round(v * 100) + '%', mood: (v) => (v < -.05 ? 'Cooler ' + Math.round(-v * 100) + '%' : v > .05 ? 'Warmer ' + Math.round(v * 100) + '%' : 'Neutral') };
Object.keys(DEF).forEach((k) => {
  sl[k] = $('s-' + k); ov[k] = $('o-' + k); sl[k].min = LIM[k][0]; sl[k].max = LIM[k][1]; sl[k].step = .01;
  sl[k].addEventListener('input', () => { if (!world) return; SET[sel][k] = +sl[k].value; ov[k].textContent = fmt[k](SET[sel][k]); applySettings(); });
});
function syncSliders() { const S = SET[sel]; Object.keys(DEF).forEach((k) => { sl[k].value = S[k]; ov[k].textContent = fmt[k](S[k]); }); }
$('reset').addEventListener('click', () => { if (!world) return; SET[sel] = Object.assign({}, DEF); syncSliders(); applySettings(); toast('Settings reset'); });
const cleanSet = (s) => { const o = {}; Object.keys(DEF).forEach((k) => { const v = s && +s[k]; o[k] = Number.isFinite(v) ? clamp(v, LIM[k][0], LIM[k][1]) : DEF[k]; }); return o; };

let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2800); }

// Panels: Adjust and Field notes (one open at a time)
const panels = { adjust: [$('p-adjust'), $('b-adjust')], notes: [$('p-notes'), $('b-notes')] };
function openPanel(k) {
  if (state !== 'world') return;
  Object.keys(panels).forEach((n) => { const on = n === k && !panels[n][0].classList.contains('open'); panels[n][0].classList.toggle('open', on); panels[n][1].setAttribute('aria-expanded', String(on)); });
  if (k === 'notes') fillNotes();
}
function closePanels() { Object.keys(panels).forEach((n) => { panels[n][0].classList.remove('open'); panels[n][1].setAttribute('aria-expanded', 'false'); }); }
function fillNotes() {
  const w = WORLDS[sel], ol = $('n-obs'); ol.innerHTML = '';
  $('n-id').textContent = w.id + ', Plate ' + w.numeral; $('n-status').textContent = w.status; $('n-name').textContent = w.name; $('n-coords').textContent = w.coords; $('n-poem').textContent = w.description;
  w.observations.forEach((o) => { const li = document.createElement('li'); li.textContent = o; ol.appendChild(li); });
  $('n-method').textContent = w.method + '. Seed ' + SEEDS[sel] + '.';
  const n = store.load().filter((x) => x.w === sel).length; $('n-kept').textContent = 'Variations kept: ' + n;
}
$('b-adjust').addEventListener('click', () => openPanel('adjust'));
$('b-notes').addEventListener('click', () => openPanel('notes'));

// Storage: localStorage when available; otherwise kept in memory for this visit, and the visitor is told
const KEY = 'atlas-imaginary-worlds/v1', CAP = 24;
const valid = (it) => it && Number.isInteger(it.w) && it.w >= 0 && it.w < WORLDS.length && Number.isInteger(it.seed) && it.s && typeof it.s === 'object' && typeof it.id === 'string';
const store = (() => {
  let ok = false, mem = [];
  try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); ok = true; } catch (e) { ok = false; }
  return {
    ok,
    load() { if (!ok) return mem; try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter(valid) : []; } catch (e) { return []; } },
    save(list) { if (!ok) { mem = list; return 'session'; } try { localStorage.setItem(KEY, JSON.stringify(list)); return 'saved'; } catch (e) { return 'fail'; } }
  };
})();
function updateCount() { const n = store.load().length, t = 'Collection' + (n ? ' (' + n + ')' : ''); $('b-col-a').textContent = t; $('b-col-w').textContent = t; }
// Keep: the thumbnail is taken from the very next rendered frame (WebGL canvases are blank outside the draw call)
function keep() {
  if (state !== 'world') return;
  const list = store.load();
  if (list.length >= CAP) { toast('Your collection is full. Remove a world to keep another.'); return; }
  const f = $('flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
  const i = sel, rec = { id: Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), w: i, seed: SEEDS[i], s: Object.assign({}, SET[i]), t: Date.now(), thumb: '' };
  pending = () => {
    try {
      const c2 = document.createElement('canvas'); c2.width = 320; c2.height = Math.max(1, Math.round(320 * canvas.height / canvas.width));
      c2.getContext('2d').drawImage(canvas, 0, 0, c2.width, c2.height);
      const u = c2.toDataURL('image/jpeg', .72); if (typeof u === 'string' && u.indexOf('data:image/jpeg;base64,') === 0) rec.thumb = u;
    } catch (e) { rec.thumb = ''; }
    list.unshift(rec); let res = store.save(list);
    if (res === 'fail') { rec.thumb = ''; res = store.save(list); }   // retry without the picture if storage is nearly full
    if (res === 'fail') { list.shift(); toast('Could not keep this world: browser storage is full.'); }
    else toast(res === 'session' ? 'Kept for this visit only: browser storage is unavailable.' : 'Kept in your Collection');
    updateCount();
  };
}
// Collection screen
let colFrom = 'atlas';
function openCollection() { if (state !== 'atlas' && state !== 'world') return; colFrom = state; tid++; setState('collection'); renderCollection(); }
function closeCollection() { if (state === 'collection') setState(colFrom); }
function renderCollection() {
  const list = store.load(), grid = $('grid'); grid.innerHTML = '';
  $('col-empty').hidden = list.length > 0; $('col-note').hidden = store.ok;
  $('col-sub').textContent = list.length ? list.length + ' kept world' + (list.length > 1 ? 's' : '') : '';
  list.forEach((it) => {
    const w = WORLDS[it.w], card = document.createElement('div'); card.className = 'card';
    const open = document.createElement('button'); open.type = 'button'; open.className = 'open'; open.setAttribute('aria-label', 'Open ' + w.name + ', seed ' + it.seed);
    let img;
    if (typeof it.thumb === 'string' && it.thumb.indexOf('data:image/jpeg;base64,') === 0) { img = document.createElement('img'); img.src = it.thumb; img.alt = ''; }
    else { img = document.createElement('div'); img.className = 'ph'; img.style.setProperty('--c1', w.a1); img.style.setProperty('--c2', w.a2); }
    const nm = document.createElement('p'); nm.className = 'nm'; nm.textContent = w.name;
    const sd = document.createElement('p'); sd.className = 'sd'; sd.textContent = 'Seed ' + it.seed + ', ' + new Date(it.t).toLocaleDateString();
    open.appendChild(img); open.appendChild(nm); open.appendChild(sd); open.addEventListener('click', () => openSaved(it));
    const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'link small rm'; rm.textContent = 'Remove'; rm.setAttribute('aria-label', 'Remove ' + w.name + ', seed ' + it.seed);
    rm.addEventListener('click', () => { store.save(store.load().filter((x) => x.id !== it.id)); renderCollection(); updateCount(); toast('Removed from your Collection'); });
    card.appendChild(open); card.appendChild(rm); grid.appendChild(card);
  });
}
function openSaved(it) {   // reopen a kept world: same veil, title card and fly-in as entering from the Atlas
  if (state !== 'collection' || !it) return;
  const i = it.w, w = WORLDS[i]; tid++; setState('entering');
  $('arr-id').textContent = w.id + ', Plate ' + w.numeral; $('arr-name').textContent = w.name; $('arr-coords').textContent = w.coords; $('arr-poem').textContent = w.description;
  veil.style.setProperty('--a1', w.a1); veil.style.setProperty('--a2', w.a2); $('arrival').style.setProperty('--accent', w.glow); veil.classList.add('on');
  later(() => { stopWorld(); sel = i; SEEDS[i] = it.seed; SET[i] = cleanSet(it.s); startWorld(i); setState('arrival'); }, 1000);
  later(() => { veil.classList.remove('on'); setState('world'); }, 3600);
}
$('keep').addEventListener('click', keep);
$('b-col-a').addEventListener('click', openCollection); $('b-col-w').addEventListener('click', openCollection); $('col-close').addEventListener('click', closeCollection);
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (state === 'collection') closeCollection();
  else if (state === 'world') { if (Object.keys(panels).some((n) => panels[n][0].classList.contains('open'))) closePanels(); else leave(); }
  else if (state === 'atlas') applyFocus(-1);
});
updateCount();

/* ---------- 9. ANIMATION LOOP ---------- */
const sp = { x: 0, y: 0 }, tmp = new THREE.Vector3();
let last = performance.now(), tt = 0, acc = 0, nFrames = 0, vIntro = 1;
function updateLabels() {
  const w = innerWidth, h = innerHeight;
  labels.forEach((b, i) => {
    const o = orbs[i], vis = state === 'atlas' && o.appear > .7;
    b.classList.toggle('show', vis); b.classList.toggle('hot', focus === i);
    if (!vis) return;
    tmp.copy(o.g.position).project(camera);
    const r = .8 * o.g.scale.x * h / (2 * .4663 * camera.position.distanceTo(o.g.position));
    b.style.transform = 'translate(' + (tmp.x * .5 + .5) * w + 'px,' + ((-tmp.y * .5 + .5) * h + r + 10) + 'px) translateX(-50%)';
  });
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, .1); last = now;
  tt += dt * (reduced ? .35 : 1); timeU.value = tt;
  acc += dt; if (++nFrames === 90) {   // adaptive quality: lower resolution if frames are slow
    if (acc / 90 > .027 && dpr > 1) { dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); pxUniforms.forEach((u) => { u.value = dpr; }); }
    acc = nFrames = 0;
  }
  // camera glides to its target, with a tiny pointer parallax on top
  if (world) { updateWorldCamera(dt); world.update(tt, dt); }
  else {
    const k = 1 - Math.exp(-1.4 * dt); camPos.lerp(camT, k); look.lerp(lookT, k);
    sp.x = damp(sp.x, reduced ? 0 : px, 2, dt); sp.y = damp(sp.y, reduced ? 0 : py, 2, dt);
    camera.position.set(camPos.x + sp.x * .35, camPos.y + sp.y * .2, camPos.z); camera.lookAt(look);
  }
  sky.position.copy(camera.position);
  const ks = 1 - Math.exp(-1.2 * dt);
  skyU.uTop.value.lerp(skyT.top, ks); skyU.uBot.value.lerp(skyT.bot, ks); skyU.uGlow.value.lerp(skyT.glow, ks);
  partU.uFade.value = damp(partU.uFade.value, state === 'intro' ? 1 : .7, 1.5, dt);
  // intro structure fades and shrinks away when we leave the introduction
  vIntro = damp(vIntro, state === 'intro' ? 1 : 0, 1.6, dt);
  const iv = ease(Math.min(1, Math.max(0, vIntro)));
  intro.visible = iv > .004;
  if (intro.visible) {
    intro.position.set(L.knot.x, L.knot.y, L.knot.z - (1 - iv) * 3); intro.scale.setScalar(L.knotS * (.55 + .45 * iv));
    knotU.uFade.value = iv; cage.material.opacity = .13 * iv; cage2.material.opacity = .2 * iv; introGlow.material.opacity = .3 * iv;
    knot.rotation.set(tt * .07, tt * .13, 0); cage.rotation.set(-tt * .05, -tt * .09, tt * .03); cage2.rotation.set(tt * .08, tt * .05, 0);
  }
  // orbs
  orbs.forEach((o, i) => {
    o.appear = damp(o.appear, o.target, 1.7, dt); o.hover = damp(o.hover, focus === i ? 1 : 0, 5, dt); o.flare = damp(o.flare, o.flareT, 1.6, dt);
    const a = ease(Math.min(1, Math.max(0, o.appear)));
    o.g.visible = a > .003; if (!o.g.visible) return;
    const dim = focus >= 0 && focus !== i ? .55 : 1;
    o.g.position.set(o.base.x, o.base.y + Math.sin(tt * .45 + i * 2.1) * .13, o.base.z);
    o.g.scale.setScalar((.25 + .75 * a) * (1 + .16 * o.hover + .5 * o.flare));
    o.uni.uOpacity.value = a * dim; o.uni.uHover.value = o.hover;
    o.halo.material.opacity = a * dim * (.32 + .3 * o.hover + .35 * o.flare);
    o.ring.material.opacity = a * dim * .7; o.ring.rotation.y = tt * .12 * (1 + i * .2); o.core.rotation.y = tt * .05;
  });
  updateLabels();
  renderer.render(scene, camera);
  if (pending) { const f = pending; pending = null; f(); }   // capture the finished frame (see keep)
}

/* ---------- Start-up ---------- */
// Title reveal: split into words and letters so each letter can fade in with a delay
(() => {
  const t = $('title'); let i = 0;
  [['An', 'Atlas', 'of'], ['Imaginary', 'Worlds']].forEach((words) => {
    const line = document.createElement('span'); line.className = 'line'; line.setAttribute('aria-hidden', 'true');
    words.forEach((word) => {
      const w = document.createElement('span'); w.className = 'w';
      [...word].forEach((c) => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; s.style.setProperty('--i', i++); w.appendChild(s); });
      line.appendChild(w);
    });
    t.appendChild(line);
  });
})();
window.addEventListener('resize', layout);
layout();
requestAnimationFrame(frame);
setTimeout(() => body.classList.add('ready'), 250);

// Small hook so the project can be tested from the console or a script
window.__atlas = { goAtlas, backToIntro, enter, leave, regen, keep, openCollection, closeCollection, openSaved: (n) => openSaved(store.load()[n]), setSetting: (k, v) => { SET[sel][k] = v; applySettings(); }, togglePanel: openPanel,
  debug: () => ({ state, world: !!world, seed: sel >= 0 ? SEEDS[sel] : null, set: sel >= 0 ? SET[sel] : null, kept: store.load().length, storage: store.ok, panels: Object.keys(panels).filter((k) => panels[k][0].classList.contains('open')), cam: camera.position.toArray(), orbs: orbs.map((o) => +o.appear.toFixed(2)) }) };
})();
