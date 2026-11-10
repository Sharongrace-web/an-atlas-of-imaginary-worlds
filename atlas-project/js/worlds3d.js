/* worlds3d.js: the three procedural environments.
   WORLD3D.build(index, seed, env) returns { group, update(t, dt), cam, fog, sky }.
   Every random choice comes from a seeded generator, so the same seed always rebuilds the same world. */
window.WORLD3D = (() => {
const T = window.THREE;

/* ---------- seeded randomness and noise ---------- */
const mulberry = (s) => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hash = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const vnoise = (x, y, s) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
const fbm = (x, y, s, o = 4) => { let v = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { v += a * vnoise(x * f, y * f, s + i * 17); f *= 2; a *= .5; } return v / (1 - Math.pow(.5, o)); };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const C = (h) => new T.Color(h);

/* ---------- small building tools ---------- */
const _p = new T.Vector3(), _q = new T.Quaternion(), _e = new T.Euler(), _s = new T.Vector3();
const M = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new T.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
// Acc collects many shapes (each placed with a matrix and coloured by a function) into ONE mesh: far fewer draw calls.
class Acc {
  constructor() { this.p = []; this.n = []; this.c = []; }
  add(geo, mat, fn) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(mat);
    const P = g.attributes.position.array, N = g.attributes.normal.array, c = new T.Color();
    for (let i = 0; i < P.length; i += 3) {
      fn(c, P[i], P[i + 1], P[i + 2], N[i], N[i + 1], N[i + 2]);
      this.p.push(P[i], P[i + 1], P[i + 2]); this.n.push(N[i], N[i + 1], N[i + 2]); this.c.push(c.r, c.g, c.b);
    }
    g.dispose();
  }
  mesh(mat) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(this.n, 3)); g.setAttribute('color', new T.Float32BufferAttribute(this.c, 3));
    return new T.Mesh(g, mat);
  }
}
const lambert = (extra) => new T.MeshLambertMaterial(Object.assign({ vertexColors: true }, extra));
const glow = (env, color, scale, opacity, x, y, z) => {
  const s = new T.Sprite(new T.SpriteMaterial({ map: env.spriteTex, color, transparent: true, opacity, depthWrite: false, blending: T.AdditiveBlending, fog: false }));
  s.scale.setScalar(scale); s.position.set(x, y, z); return s;
};
// Haze: large soft sprites that drift slowly and give depth
function haze(env, r, cols, n, spread, ySpread, sc, op, y0 = 0) {
  const list = [];
  for (let i = 0; i < n; i++) { const s = glow(env, cols[i % cols.length], sc * (.7 + r() * .6), op, (r() - .5) * spread, y0 + (r() - .5) * ySpread, (r() - .5) * spread); s.userData.v = (r() - .5) * .5; list.push(s); }
  return list;
}
// Motes: grains, dust and pollen drawn as points, with all motion computed on the GPU.
// Options (o): anchor (wrap around the camera so the view is always full of particles), normal (normal blending, for light
// backgrounds), soft (a glowing, blurred disc), min / max (pixel size limits), k (distance scaling: size shrinks with distance
// relative to k; 0 keeps a constant pixel size).
function motes(env, n, box, vel, cols, size, r, alpha, o) {
  o = o || {};
  const pos = new Float32Array(n * 3), cl = new Float32Array(n * 3), sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos.set([(r() - .5) * box[0], (r() - .5) * box[1], (r() - .5) * box[2]], i * 3); const c = cols[(r() * cols.length) | 0]; cl.set([c.r, c.g, c.b], i * 3); sd[i] = r(); }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('aColor', new T.BufferAttribute(cl, 3)); g.setAttribute('aSeed', new T.BufferAttribute(sd, 1));
  const m = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: o.normal ? T.NormalBlending : T.AdditiveBlending,
    uniforms: { uTime: env.timeU, uPx: env.px, uSize: { value: size }, uAlpha: { value: alpha }, uMin: { value: o.min || 0 }, uMax: { value: o.max || 64 }, uK: { value: o.k || 0 }, uAnchor: { value: o.anchor ? 1 : 0 }, uSoft: { value: o.soft ? 1 : 0 },
      uBox: { value: new T.Vector3(box[0], box[1], box[2]) }, uVel: { value: new T.Vector3(vel[0], vel[1], vel[2]) } },
    vertexShader: `attribute vec3 aColor; attribute float aSeed; uniform float uTime,uPx,uSize,uMin,uMax,uK,uAnchor; uniform vec3 uBox,uVel; varying vec3 vC; varying float vA;
      void main(){
        vec3 q=position+uBox*.5+uVel*uTime*(.6+aSeed*.8);
        vec3 p;
        if(uAnchor>.5){ p=mod(q-cameraPosition,uBox)-uBox*.5+cameraPosition; }   /* the volume follows the camera */
        else { p=mod(q,uBox)-uBox*.5; }
        p.x+=sin(uTime*.2+aSeed*30.)*.35+sin(uTime*.07+aSeed*11.)*uVel.x*.7;      /* gusts and turbulence */
        p.y+=sin(uTime*.23+aSeed*17.)*.25; p.z+=cos(uTime*.17+aSeed*20.)*.35+sin(uTime*.07+aSeed*11.)*uVel.z*.7;
        vec4 mv=(uAnchor>.5?viewMatrix:modelViewMatrix)*vec4(p,1.); gl_Position=projectionMatrix*mv;
        float att=uK>0.?clamp(uK/-mv.z,.55,2.4):1.;
        gl_PointSize=clamp(uSize*(.65+aSeed*.7)*uPx*att,uMin*uPx,uMax*uPx);
        vec3 rel=(uAnchor>.5?p-cameraPosition:p)/uBox; vec3 qa=abs(rel); float e=1.-smoothstep(.36,.5,max(max(qa.x,qa.y),qa.z));
        e*=smoothstep(1.,5.,-mv.z);                                               /* fade out right in front of the lens */
        vC=aColor; vA=(.68+.32*sin(uTime*(.5+aSeed)+aSeed*40.))*e; }`,
    fragmentShader: `uniform float uAlpha,uSoft; varying vec3 vC; varying float vA;
      void main(){
        float d=length(gl_PointCoord-.5);
        float a=mix(1.-smoothstep(.3,.5,d),pow(1.-smoothstep(0.,.5,d),2.),uSoft);   /* crisp disc, or a soft glow */
        vec3 col=mix(vC*.84,vC,1.-smoothstep(.2,.42,d)*(1.-uSoft));                 /* a slightly darker rim keeps grains readable on bright ground */
        gl_FragColor=vec4(col,a*vA*uAlpha); }` });
  const pts = new T.Points(g, m); pts.frustumCulled = false; return pts;
}
const lights = (g, sky, ground, hi, sun, si, pos) => {
  g.add(new T.HemisphereLight(sky, ground, hi));
  const d = new T.DirectionalLight(sun, si); d.position.set(pos[0], pos[1], pos[2]); g.add(d);
};

/* ---------- Seed-driven composition archetypes ----------
   Each world has five compositions. The seed picks one (independently of the main random stream, so it can be asked for
   without building the world), then every other choice (sizes, counts, positions, shapes) comes from the seed as well.
   The default seeds always give the first composition. */
const DEFAULT_SEEDS = [1013, 2027, 3041];
const ARCH_NAMES = [['Great arch', 'Nave', 'Rotunda', 'Tunnel of arches', 'Spires'], ['Hero bloom', 'Garden ring', 'Cascade', 'Hanging bells', 'Twin giants'], ['Dune sea', 'Procession', 'Star dune', 'Crescents', 'Scatter']];
const archetype = (i, seed) => seed === DEFAULT_SEEDS[i] ? 0 : Math.floor(mulberry(((seed * 2654435761) ^ (i * 40503 + 7)) >>> 0)() * 5);

/* =====================================================================
   WORLD 001: THE TIDAL ARCHIVE
   Five compositions: great arch, nave, rotunda, tunnel of arches, spires. Seed also changes the sea level and wave height,
   the number and kind of satellite ruins, islets, water lenses and the side the light comes from.
   ===================================================================== */
function tidal(seed, env) {
  const ar = archetype(0, seed), r = mulberry(seed), g = new T.Group(), Q = env.Q, SEA_Y = -3.4 - r() * 2.8, WA = .75 + r() * .85, sunSide = r() < .5 ? -1 : 1;
  const stoneA = C('#a7bad3'), stoneB = C('#53699a'), moss = C('#9fd9dc'), ivory = C('#e4ecf0'), deep = C('#2b4274');
  const PAL = [C('#e8f3fa'), C('#bcd8f0'), C('#a9e3e8'), C('#f6fafc')];   // pale blue, cyan, soft white
  const bookCols = ['#7fc3cf', '#6f89c0', '#a89ad2', '#c99aab', '#e8eff2', '#8fb4d9'].map(C);
  const flat = (col, v) => (c, x, y) => { c.copy(col).offsetHSL(0, 0, Math.sin(x * 7.1 + y * 5.3) * .03 * v); };
  const stone = (c, x, y, z) => {
    c.copy(ivory).lerp(stoneA, .25 + .45 * vnoise(x * 1.9 + y * .7, z * 1.9 + 3, seed)).lerp(stoneB, clamp(.35 - y * .12, 0, .5));
    c.lerp(moss, clamp(vnoise(x * 3.1, z * 3.1 + y, seed + 8) * 1.6 - .7, 0, .6) * clamp(1 - y * .25, .2, 1) * .5);
  };
  const mat = lambert({ emissive: '#101c3a' }), mirMat = lambert({ transparent: true, opacity: .3, depthWrite: false });
  const at = (b, x, y, z, ry = 0) => b.clone().multiply(M(x, y, z, 0, ry, 0));
  const placed = (x, z, ry, y) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), ry), new T.Vector3(1, 1, 1));
  const plinth = (acc, b, w, d) => {
    acc.add(new T.BoxGeometry(w + .9 + r() * .3, .2, d + .9), at(b, 0, .1, 0, (r() - .5) * .04), stone); acc.add(new T.BoxGeometry(w + .45, .2, d + .45 + r() * .2), at(b, 0, .3, 0, (r() - .5) * .05), stone);
    return at(b, 0, .4, 0);
  };
  const archway = (acc, b0, w, h, o) => {
    o = o || {}; const th = o.th || .5, dp = o.dp || .8, n = o.n || 9, k0 = th / .5;
    const b = b0.clone().multiply(M(0, 0, 0, (r() - .5) * .05, (r() - .5) * .06, (r() - .5) * .06)), Rr = w / 2 + th / 2, side = o.side !== undefined ? o.side : (r() < .3 ? (r() < .5 ? -1 : 1) : 0);
    [-1, 1].forEach((sg) => {
      const hh = o.intact ? h : h * (sg === side ? .55 + r() * .3 : .93 + r() * .12);
      acc.add(new T.BoxGeometry(th + r() * .1, hh, dp), b.clone().multiply(M(sg * Rr, hh / 2, 0, 0, 0, (r() - .5) * .04)), stone);
      acc.add(new T.BoxGeometry(th * 1.45, .2 * k0, dp * 1.2), at(b, sg * Rr, .1, 0), stone);
      if (sg !== side) acc.add(new T.BoxGeometry(th * 1.55, .16 * k0, dp * 1.2), at(b, sg * Rr, h - .08, 0), stone);
    });
    for (let j = 0; j < n; j++) {
      const ph = Math.PI * (j + .5) / n, nearSide = (j < 3 && side === -1) || (j > n - 4 && side === 1);
      if (!o.intact && ((nearSide && r() < .75) || ((j < 2 || j > n - 3) && r() < .2))) continue;
      acc.add(new T.BoxGeometry(Math.PI * Rr / n * 1.05, th, dp), b.clone().multiply(M(-Math.cos(ph) * Rr + (r() - .5) * .06, h + Math.sin(ph) * Rr + (r() - .5) * .06, 0, 0, 0, Math.PI / 2 - ph + (r() - .5) * .05)), stone);
    }
    if (r() > .25) acc.add(new T.BoxGeometry(th * .9, th * 1.25, dp * 1.15), at(b, 0, h + Rr + .02, 0), stone);
    for (let k = 0, nr = side || r() < .4 ? 2 + ((r() * 3) | 0) : 0; k < nr; k++) acc.add(new T.BoxGeometry((.2 + r() * .35) * k0, (.18 + r() * .2) * k0, (.3 + r() * .3) * k0), b.clone().multiply(M((r() - .5) * (w + 2), .12, dp * .6 + r() * 1.2, r() * .5, r() * 3, r() * .5)), stone);
  };
  const tower = (acc, b0, w, levels, tilt) => {
    const gap = .95, H = levels * gap, bp = plinth(acc, b0, w + .4, .7), bb = bp.clone().multiply(M(0, 0, 0, 0, 0, (r() - .5) * (tilt || .06)));
    [-1, 1].forEach((sg) => acc.add(new T.BoxGeometry(.22, H, .7), at(bb, sg * (w / 2 + .11), H / 2, 0), stone));
    for (let k = 0; k <= levels; k++) {
      const y = k * gap; acc.add(new T.BoxGeometry(w + .44, .14, .7), bb.clone().multiply(M(0, y, 0, 0, 0, (r() - .5) * .03)), stone);
      if (k === levels) break;
      let x = -w / 2 + .1;
      while (x < w / 2 - .2) {
        const bw = .1 + r() * .08, bh = .38 + r() * .45, col = bookCols[(r() * bookCols.length) | 0];
        if (r() > .14) acc.add(new T.BoxGeometry(bw, bh, .45), bb.clone().multiply(M(x + bw / 2, y + .07 + bh / 2, 0, 0, 0, r() < .14 ? (r() - .5) * .8 : 0)), flat(col, .6));
        x += bw + .012 + (r() < .12 ? .3 : 0);
      }
    }
    acc.add(new T.BoxGeometry(w + .7, .2, 1), at(bb, 0, H + .1, 0), stone);
    for (let k = 0; k < 3; k++) acc.add(new T.BoxGeometry(.4, .09, .3), bp.clone().multiply(M((r() - .5) * w * 1.6, .06, .6 + r() * .6, 0, r() * 3, 0)), flat(bookCols[(r() * bookCols.length) | 0], .6));
  };
  const column = (acc, b, x, z, h, broken) => {
    acc.add(new T.CylinderGeometry(.22, .26, h, 10), b.clone().multiply(M(x, .3 + h / 2, z, (r() - .5) * .1, 0, (r() - .5) * .1)), stone);
    acc.add(new T.CylinderGeometry(.34, .36, .14, 10), at(b, x, .37, z), stone);
    if (!broken) acc.add(new T.BoxGeometry(.7, .14, .7), at(b, x, .3 + h + .07, z), stone);
    else acc.add(new T.BoxGeometry(.4, .2, .35), b.clone().multiply(M(x + (r() - .5) * .5, .3 + h + .1, z, r() * .8, r() * 3, r() * .8)), stone);
  };
  const colonnade = (acc, b, rad, n) => {
    acc.add(new T.CylinderGeometry(rad + .9, rad + 1.1, .3, 24), at(b, 0, .15, 0), stone);
    for (let k = 0; k < n; k++) { const a = k / n * 6.283, h = 1.4 + r() * 2.3; column(acc, b, Math.cos(a) * rad, Math.sin(a) * rad, h, h < 3.2 && r() < .6); }
  };
  const stairs = (acc, b, w, n) => { for (let k = 0; k < n; k++) acc.add(new T.BoxGeometry(w - k * .15, .24, .95), b.clone().multiply(M((r() - .5) * .08, -k * .26, k * .9, 0, (r() - .5) * .03, 0)), stone); };
  const books = (acc, b, n, spread) => { for (let k = 0; k < n; k++) acc.add(new T.BoxGeometry(.3 + r() * .2, .08, .22), b.clone().multiply(M((r() - .5) * spread, .05 + (k % 3) * .08, (r() - .5) * spread, 0, r() * 3, 0)), flat(bookCols[(r() * bookCols.length) | 0], .6)); };
  const gate = (acc, b, w) => { column(acc, b, -w / 2, 0, 3 + r(), false); column(acc, b, w / 2, 0, 3 + r(), r() < .4); acc.add(new T.BoxGeometry(w + .6, .3, .8), b.clone().multiply(M(0, 3.7, 0, 0, 0, (r() - .5) * .06)), stone); };

  const isl = []; let ctr = 0;
  const build = (kind, rad, x, y, z, o) => {
    o = o || {}; const id = ctr++, sd = seed + id * 7, asp = o.asp || .75 + r() * .6, grp = new T.Group(); grp.position.set(x, y, z);
    const sw = o.far ? (Q < 1 ? 14 : 22) : Q < 1 ? 36 : 56, sh = o.far ? (Q < 1 ? 8 : 12) : Q < 1 ? 20 : 32, under = o.islet ? .45 : 1;
    const geo = new T.SphereGeometry(1, sw, sh), P = geo.attributes.position, st = rad * .07;
    for (let k = 0; k < P.count; k++) {
      const px = P.getX(k), yy = P.getY(k), pz = P.getZ(k), xx = px * asp, zz = pz / asp + px * .25;
      const wx = xx + (fbm(xx * 1.3 + 2, zz * 1.3 + 2, sd, 3) - .5) * .6, wz = zz + (fbm(xx * 1.3 + 7, zz * 1.3 + 7, sd + 5, 3) - .5) * .6;
      const n1 = fbm(wx * 1.7 + 9, wz * 1.7 + 9, sd, 4), rg = 1 - Math.abs(2 * fbm(wx * 2.1 + 4, wz * 2.1 + 4, sd + 41, 3) - 1);
      const notch = Math.exp(-Math.pow((yy + .12) * 5.5, 2)) * (.1 + .26 * fbm(wx * 2 + 6, wz * 2 + 6, sd + 60, 3)), crumble = (fbm(px * 5.5 + 1, pz * 5.5 + 1, sd + 70, 2) - .5) * .09 * rad * (1 + Math.max(0, -yy));
      const rr = rad * (.78 + n1 * .5) * (1 - notch); let h = yy >= 0 ? yy * rad * .26 * (.7 + n1 * .6) : 0;
      if (yy >= 0) { h = h * .6 + Math.round(h / st) * st * .4; h -= Math.pow(1 - Math.abs(2 * fbm(wx * 3, wz * 3, sd + 90, 3) - 1), 3) * rad * .05 * yy; }
      P.setXYZ(k, px * rr * asp + crumble * px, yy >= 0 ? h : yy * rad * (.7 + rg * 1.9 + n1 * .5) * under, pz * rr / asp + crumble * pz);
    }
    geo.computeVertexNormals();
    const rock = new Acc(), top = rad * .26 * (.7 + fbm(9, 9, sd + 4, 4) * .6) - .08;
    rock.add(geo, new T.Matrix4(), (c, px, yv, pz, nx, ny) => {
      c.copy(stoneA).lerp(stoneB, clamp(-yv / (rad * 1.3), 0, 1)); c.lerp(deep, Math.max(0, Math.sin(yv * 11 + vnoise(px, pz, sd) * 5)) * .1);
      if (ny > .5 && yv > -.3) c.lerp(moss, clamp((ny - .5) * 1.4, 0, .7) * (.5 + fbm(px * 1.4, pz * 1.4, sd, 2) * .5));
      if (yv < -rad * .8) c.lerp(deep, .35);
    });
    if (!o.far) {
      for (let k = 0, nb = 2 + ((r() * 3) | 0); k < nb; k++) { const a = r() * 6.28, dd = rad * (.25 + r() * .5), col = stoneA.clone().lerp(stoneB, r() * .5); rock.add(new T.IcosahedronGeometry(.18 + r() * .3, 1), M(Math.cos(a) * dd, top - .04, Math.sin(a) * dd, r() * 3, r() * 3, 0, 1, .6 + r() * .5, 1), (c) => { c.copy(col); }); }
      for (let k = 0, nb = 3 + ((r() * 3) | 0); k < nb; k++) { const a = r() * 6.28, dd = rad * (1.05 + r() * .4), col = stoneA.clone().lerp(stoneB, .3 + r() * .5); rock.add(new T.IcosahedronGeometry(.1 + r() * .3, 1), M(Math.cos(a) * dd * asp, -r() * rad * .6, Math.sin(a) * dd / asp, r() * 3, r() * 3, 0), (c) => { c.copy(col); }); }
    }
    const arch = new Acc(), base = placed(0, 0, 0, top);
    if (kind === 'main') {
      if (ar === 0) {      // great arch framing a bookcase wall
        archway(arch, placed(0, 1.2, 0, top), 5.2, 6.4, { th: 1, dp: 1.7, n: 13, side: 0, intact: true }); tower(arch, placed(0, -2.6, 0, top), 7, 6, .05);
        archway(arch, placed(-6.2, 0, .5, top), 2.6, 3.2, { side: 1 }); archway(arch, placed(6.4, -.6, -.4, top), 2, 2.4, { side: -1, th: .4, dp: .7 }); stairs(arch, placed(0, 4.2, 0, top - .05), 4.6, 6);
      } else if (ar === 1) {   // a nave: two rows of columns leading the eye to a bookcase wall
        for (let k = 0; k < 5; k++) for (const sg of [-1, 1]) column(arch, base, sg * 2.8, 4.6 - k * 2.3, (k < 3 ? 3.7 : 2.6) + r() * 1.2, k > 2 && r() < .6);
        for (const k of [0, 1, 3]) if (r() > .2) arch.add(new T.BoxGeometry(6.2, .3, .8), base.clone().multiply(M(0, 4.6 + .1, 4.6 - k * 2.3, 0, 0, (r() - .5) * .04)), stone);
        tower(arch, placed(0, -7.3, 0, top), 6.4, 6, .04); stairs(arch, placed(0, 6.4, 0, top - .05), 5, 6);
      } else if (ar === 2) {   // a rotunda: a ring of columns around a tall central bookcase tower
        const nR = 11; for (let k = 0; k < nR; k++) { const a = k / nR * 6.283, h = 3.2 + r() * 1.2; column(arch, base, Math.cos(a) * 4.4, Math.sin(a) * 4.4, h, r() < .25); if (r() < .65) { const a2 = (k + .5) / nR * 6.283; arch.add(new T.BoxGeometry(2.6, .28, .6), base.clone().multiply(M(Math.cos(a2) * 4.3, 3.9 + .3 + r() * .3, Math.sin(a2) * 4.3, 0, -a2 + Math.PI / 2, 0)), stone); } }
        tower(arch, base, 2.4, 8, .1); stairs(arch, placed(0, 5.6, 0, top - .05), 4, 5);
      } else if (ar === 3) {   // a tunnel: nested arches shrinking away from the viewer, ending in a bookcase
        for (let k = 0; k < 4; k++) archway(arch, placed(0, 3.8 - k * 2.7, 0, top), 5.4 - k * .55, 6.2 - k * .55, { th: .9, dp: 1.4, n: 13, intact: k < 2, side: k === 3 ? 1 : 0 });
        tower(arch, placed(0, -7.4, 0, top), 4.4, 5, .05); stairs(arch, placed(0, 6.6, 0, top - .05), 4.6, 6);
      } else {                 // spires: three leaning bookcase towers of different heights
        tower(arch, placed(-2.4, -.8, .1, top), 2.8, 8, .1); tower(arch, placed(2.6, .6, -.2, top), 2.4, 6, .12); tower(arch, placed(.2, 3.4, .3, top), 2, 4, .16);
        archway(arch, placed(-5.2, 2.5, .6, top), 2.4, 3, { side: 1 }); stairs(arch, placed(0, 5.6, 0, top - .05), 3.6, 5);
      }
      books(arch, base, 7, 4);
    } else if (kind === 'tower') tower(arch, placed(0, 0, r() * 6, top), Math.min(2.4, rad * 1.1), 3 + ((r() * 4) | 0), .14);
    else if (kind === 'ring') { colonnade(arch, placed(0, 0, 0, top), Math.min(rad * .6, 1.9), 6); books(arch, base, 3, 2); }
    else if (kind === 'arch') { archway(arch, placed(0, .3, r() * 3, top), Math.min(2.2, rad), 2.6, { th: .4, dp: .7, side: 1 }); books(arch, base, 4, 2.4); }
    else if (kind === 'gate') { gate(arch, placed(0, 0, r() * 3, top), Math.min(2.6, rad * 1.2)); books(arch, base, 3, 2); }
    else if (kind === 'bare') { arch.add(new T.BoxGeometry(.9, .5, .9), at(base, 0, .25, 0), stone); books(arch, base, 8, 2.6); }
    else if (kind === 'islet') tower(arch, base, Math.min(2, rad * 1.4), 2 + ((r() * 2) | 0), .5);
    const rm = rock.mesh(mat), am = arch.mesh(mat); grp.add(rm, am);
    let mir = null;
    if (Q === 1 && !o.far && !o.islet) {
      // A reflection only shows what is above the water. The central island's long underside is below the surface, and its mirror image used to rise
      // above the sea as a ghostly mountain behind the library, so the central island's reflection is cut at the waterline.
      let rg = rm.geometry;
      if (kind === 'main') {
        const S = rg.attributes, P = S.position.array, N = S.normal.array, K = S.color.array, kp = [], kn = [], kc = [];
        for (let v = 0; v < P.length; v += 9) if (P[v + 1] + y >= SEA_Y && P[v + 4] + y >= SEA_Y && P[v + 7] + y >= SEA_Y) for (let q = 0; q < 9; q++) { kp.push(P[v + q]); kn.push(N[v + q]); kc.push(K[v + q]); }
        rg = new T.BufferGeometry(); rg.setAttribute('position', new T.Float32BufferAttribute(kp, 3)); rg.setAttribute('normal', new T.Float32BufferAttribute(kn, 3)); rg.setAttribute('color', new T.Float32BufferAttribute(kc, 3));
      }
      mir = new T.Group(); const m1 = new T.Mesh(rg, mirMat), m2 = new T.Mesh(am.geometry, mirMat); m1.renderOrder = m2.renderOrder = 1; mir.add(m1, m2); mir.scale.y = -1; g.add(mir); }
    for (let k = 0; k < (o.falls || 0); k++) {
      const th = r() * 6.28, len = y + top - SEA_Y + 1, m = motes(env, Math.round(70 * Q), [.5, len, .5], [0, -1.3, 0], PAL, 3, r, .85, { min: 2 });
      m.position.set(Math.cos(th) * rad * .75, -len / 2 + top * .5, Math.sin(th) * rad * .75); grp.add(m);
    }
    g.add(grp); isl.push({ grp, am, mir, top, y0: y, ph: r() * 6.28, sp: o.islet ? .5 : .3 + r() * .3, still: !!o.islet });
  };
  const mainRad = [6.2, 7.2, 6.8, 7, 6.4][ar], mainAsp = [undefined, .8, 1, .95, undefined][ar];
  build('main', mainRad, 0, 0, 0, { falls: 3, asp: mainAsp });
  const pool = ['tower', 'ring', 'arch', 'gate', 'bare']; for (let k = pool.length; k > 1; k--) { const j = (r() * k) | 0, t = pool[k - 1]; pool[k - 1] = pool[j]; pool[j] = t; }
  const NSAT = 3 + ((r() * 4) | 0); for (let k = 0; k < NSAT; k++) { const a = Math.PI * (-.95 + (k + .5) / NSAT * 1.2) + (r() - .5) * .4 + Math.PI / 2, d = 11 + r() * 9; build(pool[k % pool.length], 1.7 + r() * 1.9, Math.cos(a) * d, -1.5 + r() * 4.5, -Math.abs(Math.sin(a)) * d - 3, { falls: r() < .3 ? 1 : 0 }); }
  const NIS = 2 + ((r() * 4) | 0); for (let k = 0; k < NIS; k++) { const a = Math.PI * (.12 + r() * .76), d = 7 + r() * 11; build('islet', .9 + r() * .7, Math.cos(a + Math.PI / 2) * d, SEA_Y + .15, Math.sin(a) * d * .9 + 2, { islet: true }); }
  const FAR = Q < 1 ? 4 : 5 + ((r() * 4) | 0); for (let k = 0; k < FAR; k++) { const a = k / FAR * 6.28 + r() * .6, d = 40 + r() * 28; build('far', 3.5 + r() * 3.5, Math.cos(a) * d, -3 + r() * 5, Math.sin(a) * d - 10, { far: true }); }
  const sub = new Acc();
  for (let k = 0, nc = Q < 1 ? 10 : 12 + ((r() * 10) | 0); k < nc; k++) { const a = r() * 6.28, d = 16 + r() * 36, h = 1 + r() * 5; sub.add(new T.CylinderGeometry(.3 + r() * .2, .4 + r() * .2, h, 8), M(Math.cos(a) * d, SEA_Y + h / 2 - .4, Math.sin(a) * d - 8, (r() - .5) * .15, 0, (r() - .5) * .15), stone); }
  for (let k = 0, na = 1 + ((r() * 3) | 0); k < na; k++) { const a = r() * 6.28, d = 28 + r() * 14; archway(sub, placed(Math.cos(a) * d, Math.sin(a) * d - 8, r() * 6, SEA_Y - .3), 3 + r() * 2.5, 4 + r() * 2, { th: .8, dp: 1.2, n: 11 }); }
  g.add(sub.mesh(mat));
  const deb = new Acc();
  for (let k = 0, nd = Q < 1 ? 10 : 12 + ((r() * 12) | 0); k < nd; k++) { const a = r() * 6.28, dd = 4 + r() * 14, s = .12 + r() * .35, col = stoneA.clone().lerp(stoneB, r() * .6); deb.add(r() < .6 ? new T.IcosahedronGeometry(s, 0) : new T.BoxGeometry(s * 1.6, s * .9, s), M(Math.cos(a) * dd, -2 + r() * 9, Math.sin(a) * dd - 2, r() * 3, r() * 3, r() * 3), (c) => { c.copy(col); }); }
  const debris = deb.mesh(mat); g.add(debris);
  const NP = Q < 1 ? 16 : 20 + ((r() * 24) | 0), pages = new T.InstancedMesh(new T.PlaneGeometry(.55, .38), new T.MeshLambertMaterial({ color: '#efe9dc', side: T.DoubleSide, emissive: '#2a3350' }), NP);
  pages.frustumCulled = false; g.add(pages);
  const pg = Array.from({ length: NP }, (_, k) => ({ a: r() * 6.28, d: 3 + r() * 14, y: k % 3 === 0 ? SEA_Y + .5 : -1 + r() * 8, sw: k % 3 === 0, sp: (.02 + r() * .05) * (r() < .5 ? 1 : -1), ph: r() * 6.28, rx: r() * 3, ry: r() * 3, s: .7 + r() * .9 }));
  const sg = Q < 1 ? 34 : 60, sea = new T.Mesh(new T.PlaneGeometry(90, 90, sg, sg).rotateX(-Math.PI / 2), new T.MeshPhongMaterial({ vertexColors: true, emissive: '#0c1a38', specular: '#9fc9dc', shininess: 90, transparent: true, opacity: .78, depthWrite: false }));
  sea.position.y = SEA_Y; sea.renderOrder = 2; g.add(sea);
  const farSea = new T.Mesh(new T.PlaneGeometry(420, 420, 1, 1).rotateX(-Math.PI / 2), new T.MeshLambertMaterial({ color: '#3d6c9a', emissive: '#0c1a38', transparent: true, opacity: .78, depthWrite: false })); farSea.position.y = SEA_Y - .08; farSea.renderOrder = 1.5; g.add(farSea);
  const SP = sea.geometry.attributes.position, base0 = new Float32Array(SP.count), SC = new Float32Array(SP.count * 3), seaLo = C('#2f5f93'), seaHi = C('#7fb6d4'), foam = C('#e6f6f8'), sc = new T.Color();
  const WV = [[.32, .0, .55, .3], [.18, .9, .4, .2], [.5, -.7, .9, .1], [.11, .4, .25, .34]].map((w) => ({ k: w[0] * (.8 + r() * .5), cx: Math.cos(w[1] + (r() - .5) * 1.2), sz: Math.sin(w[1] + (r() - .5) * 1.2), sp: w[2], a: w[3] * WA }));
  sea.geometry.setAttribute('color', new T.BufferAttribute(SC, 3));
  for (let k = 0; k < SP.count; k++) base0[k] = fbm(SP.getX(k) * .09 + 50, SP.getZ(k) * .09 + 50, seed, 3) * 1.2 * WA;
  const wm = new T.MeshLambertMaterial({ color: '#9fe0ea', emissive: '#2a6c88', transparent: true, opacity: .42 }), lenses = [], lp = [];
  for (let k = 0, nl = 2 + ((r() * 4) | 0); k < nl; k++) { const a = Math.PI * (.1 + r() * .8) + Math.PI / 2 * 0, d = 5 + r() * 7; lp.push([Math.cos(a + Math.PI / 2) * d, 2.5 + r() * 6, Math.sin(a) * d + 2, .7 + r() * .9]); }
  lp.forEach((p) => { const m = new T.Mesh(new T.SphereGeometry(p[3], 22, 16), wm); m.position.set(p[0], p[1], p[2]); m.add(glow(env, '#a9e3e8', p[3] * 4, .28, 0, 0, 0)); m.add(motes(env, Math.round(30 * Q), [4, 4, 4], [0, .12, 0], PAL, 3, r, .7, { min: 2, soft: true })); g.add(m); lenses.push({ m, ph: r() * 6.28 }); });
  const bd = new Acc();
  for (let k = 0, nb = Q < 1 ? 20 : 40; k < nb; k++) { const c0 = lp[k % lp.length]; bd.add(new T.SphereGeometry(.05 + r() * .1, 8, 6), M(c0[0] + (r() - .5) * 6, c0[1] + (r() - .5) * 4, c0[2] + (r() - .5) * 6), (c) => { c.set('#cfeaf5'); }); }
  const beads = bd.mesh(lambert({ transparent: true, opacity: .6, emissive: '#3a7a98' })); g.add(beads);
  const mists = [haze(env, r, ['#bfe4ee', '#a9d5e8'], Q < 1 ? 10 : 18, 120, 2, 34, .13, SEA_Y + .8), haze(env, r, ['#cfe9f2', '#b9d3ee'], Q < 1 ? 5 : 8, 36, 5, 14, .06, 1.5), haze(env, r, ['#c6dcf0'], Q < 1 ? 3 : 5, 60, 4, 26, .04, 9)];
  mists.forEach((l) => l.forEach((s) => g.add(s)));
  const hallY = [3.4, 2.8, 4, 3, 4][ar], hall = glow(env, '#a9e3e8', 11, .3, 0, hallY, [-.5, -4.5, 0, -4, 0][ar]); g.add(hall);
  const shaft = glow(env, '#cfeaf2', 1, .09, 1.5 * sunSide, 7, -5); shaft.scale.set(6, 24, 1); shaft.material.rotation = .28 * sunSide; g.add(shaft);
  // Particles: bubbles and droplets rise through the whole view (camera-anchored near layer, world layer behind), soft drifting motes, and surface glints
  const air = [motes(env, Math.round(700 * Q), [40, 24, 40], [0, .55, 0], PAL, 3.8, r, .85, { anchor: true, min: 2.2 }), motes(env, Math.round(1000 * Q), [70, 30, 70], [0, .45, 0], PAL, 3.4, r, .8, { k: 30, min: 2 }),
    motes(env, Math.round(220 * Q), [60, 24, 60], [.2, .3, .1], PAL, 9, r, .3, { anchor: true, soft: true, min: 6, max: 14 }), motes(env, Math.round(500 * Q), [90, 1.4, 90], [.3, 0, .12], PAL, 3.4, r, .95, { k: 36, min: 2 })];
  air[1].position.set(0, 0, -10); air[3].position.y = SEA_Y + .4; air.forEach((m) => g.add(m));
  g.add(glow(env, '#a9e3e8', 40, .3, -26 * sunSide, 14, -44));
  lights(g, '#bfe6f0', '#25356a', .75, '#dff4f6', .75, [4 * sunSide, 9, 5]);
  const rim = new T.DirectionalLight('#8fb7e8', .3); rim.position.set(-6 * sunSide, 3, 8); g.add(rim);
  const dummy = new T.Object3D(); let f = 0;
  return { group: g, label: ARCH_NAMES[0][ar], fog: { color: '#2a4676', density: .014 + r() * .01 }, sky: ['#12204a', '#42699f', '#b4e8ee'],
    cam: { center: new T.Vector3(0, 2.6, 1), dist: [25, 24, 25, 24, 26][ar], min: 10, max: 46, pitch: [.02, .72], pitch0: .17, drift: .03, yaw0: [-.3, 0, .35, 0, -.2][ar] },
    setScale(v) { isl.forEach((o) => { o.am.scale.setScalar(v); o.am.position.y = o.top * (1 - v); if (o.mir) { o.mir.children[1].scale.setScalar(v); o.mir.children[1].position.y = o.top * (1 - v); } }); },
    update(t, dt) {
      isl.forEach((o, i) => {
        o.grp.position.y = o.y0 + Math.sin(t * o.sp + o.ph) * (o.still ? .08 : .25); if (!o.still) o.grp.rotation.y += dt * .004 * (i % 2 ? 1 : -1);
        if (o.mir) { o.mir.position.set(o.grp.position.x, 2 * SEA_Y - o.grp.position.y, o.grp.position.z); o.mir.rotation.y = o.grp.rotation.y; }
      });
      debris.rotation.y += dt * .01; beads.rotation.y += dt * .01; beads.position.y = Math.sin(t * .3) * .25;
      lenses.forEach((o) => { const s = Math.sin(t * .8 + o.ph) * .06; o.m.scale.set(1 + s, 1 - s, 1 + s); });
      mists.forEach((l) => l.forEach((s) => { s.position.x += s.userData.v * dt; if (Math.abs(s.position.x) > 62) s.position.x *= -.98; }));
      shaft.material.opacity = .08 + .035 * Math.sin(t * .2); hall.material.opacity = .27 + .06 * Math.sin(t * .35);
      pg.forEach((p, k) => {
        p.a += p.sp * dt; dummy.position.set(Math.cos(p.a) * p.d, p.sw ? SEA_Y + .55 + Math.sin(t * .8 + p.ph) * .25 : p.y + Math.sin(t * .4 + p.ph) * .5, Math.sin(p.a) * p.d);
        dummy.rotation.set(p.sw ? 1.45 + Math.sin(t * .7 + p.ph) * .15 : p.rx + Math.sin(t * .6 + p.ph) * .7, p.ry + t * .1, p.sw ? 0 : Math.sin(t * .5 + p.ph) * .5); dummy.scale.setScalar(p.s); dummy.updateMatrix(); pages.setMatrixAt(k, dummy.matrix);
      });
      pages.instanceMatrix.needsUpdate = true;
      if ((f++ & 1) === 0) {
        for (let k = 0; k < SP.count; k++) {
          const x = SP.getX(k), z = SP.getZ(k); let h = base0[k];
          for (let w = 0; w < 4; w++) { const q = WV[w], p = (x * q.cx + z * q.sz) * q.k * 2 + t * q.sp + w * 1.7; h += q.a * (Math.sin(p) + .22 * Math.cos(2 * p)); }
          SP.setY(k, h); const q = clamp((h - .1) / (2.2 * WA), 0, 1); sc.copy(seaLo).lerp(seaHi, q * q).lerp(foam, clamp((h - 1.35 * WA) * 2.2, 0, .7) * (.5 + .5 * Math.sin(x * 1.3 + z * 1.1 + t)));
          SC[k * 3] = sc.r; SC[k * 3 + 1] = sc.g; SC[k * 3 + 2] = sc.b;
        }
        SP.needsUpdate = true; sea.geometry.attributes.color.needsUpdate = true; sea.geometry.computeVertexNormals();
      }
    } };
}

/* =====================================================================
   WORLD 002: THE BLOOMING SILENCE
   Five compositions: hero bloom, garden ring, cascade, hanging bells, twin giants. The seed picks three or four species from
   six (star, bell, lotus, trumpet, poppy, thistle), jitters every petal parameter, picks a colour mood (pink, lavender or pearl),
   and varies stems and leaves.
   ===================================================================== */
function blooming(seed, env) {
  const ar = archetype(1, seed), r = mulberry(seed), g = new T.Group(), Q = env.Q, vein = C('#4d3a82');
  const POL = [C('#d8a7b8'), C('#d8a7b8'), C('#e8bfd0'), C('#b9a7e0'), C('#b9a7e0'), C('#f6f1f6')];   // dusty pink, lavender, white
  const petal = (L, W, openA, cup, curl, ruf, asym, pal, nu, nv) => {
    const pos = [], col = [], idx = [], sp = [], c = new T.Color(); let sx = 0, sy = 0;
    for (let i = 0; i <= nu; i++) { const u = i / nu, a = openA * Math.pow(u, 1.3) + curl * Math.pow(u, 4); sp.push([sx, sy, a]); sx += Math.sin(a) * L / nu; sy += Math.cos(a) * L / nu; }
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const u = i / nu, v = j / nv * 2 - 1, s = sp[i], w = W * Math.pow(Math.sin(Math.PI * Math.pow(u, .85)), .7), off = cup * v * v * w + ruf * Math.sin(u * 9 + v * 1.5) * v * v * w * .3;
      pos.push(s[0] - Math.cos(s[2]) * off, s[1] + Math.sin(s[2]) * off, v * w + asym * u * w * .5);
      c.copy(pal[0]).lerp(pal[1], clamp(u * 1.8, 0, 1)).lerp(pal[2], clamp(u * 1.8 - .8, 0, 1) * .75).lerp(vein, .08 * Math.exp(-v * v * 30) * (1 - u * .7)).lerp(pal[2], v * v * .12); col.push(c.r, c.g, c.b);
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, d = a + nv + 1; idx.push(a, d, a + 1, a + 1, d, d + 1); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  };
  const leafA = C('#7d8fb0'), leafB = C('#b7c4d6'), stemC = C('#8e9bb8');
  const LSZ = .7 + r() * .9, LN = 1 + ((r() * 3) | 0), SW = 2 + r() * 3, SLEN = 8 + r() * 8, SLEND = .6 + r() * .9;   // leaf size, leaf count, stem wander, stem length, leaf slenderness
  const leaf = (L, W) => {
    const pos = [], col = [], idx = [], nu = 8, nv = 4, c = new T.Color();
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const u = i / nu, v = j / nv * 2 - 1, w = W * Math.pow(Math.sin(Math.PI * Math.pow(u, .8)), .8); pos.push(v * w, u * L, -.35 * L * u * u + v * v * w * .35); c.copy(leafA).lerp(leafB, u * .6 + v * v * .2); col.push(c.r, c.g, c.b); }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, d = a + nv + 1; idx.push(a, d, a + 1, a + 1, d, d + 1); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  };
  const stemGeo = (curve, seg, r0, r1, rnd) => {
    const tg = new T.TubeGeometry(curve, seg, 1, 7, false), P = tg.attributes.position;
    for (let i = 0; i <= seg; i++) { const u = i / seg, c = curve.getPointAt(u), rad = r0 + (r1 - r0) * Math.pow(u, .8) + (Math.abs(Math.sin(u * 19 + rnd)) > .94 ? .025 : 0); for (let j = 0; j < 8; j++) { const k = i * 8 + j; P.setXYZ(k, c.x + (P.getX(k) - c.x) * rad, c.y + (P.getY(k) - c.y) * rad, c.z + (P.getZ(k) - c.z) * rad); } }
    tg.computeVertexNormals(); return tg;
  };
  // Six species; the seed picks three or four and jitters every parameter
  const BASE = [
    { pal: ['#7b5fb0', '#d8a7b8', '#f6e6ea'], lay: [[6, 3.8, 1, 1.7, .2, .5, .2, .3], [6, 3.2, .9, 1.2, .25, .4, .1, .25], [3, 2.3, .5, .6, .3, .2, .05, .1]] },
    { pal: ['#5f4e9a', '#b9a7e0', '#efe6fa'], lay: [[5, 3.2, 1.5, .7, .7, .2, .05, .12], [5, 3, 1.4, .5, .8, .1, .03, .1], [3, 2, 1, .3, .6, 0, .02, .06]] },
    { pal: ['#9b6a9e', '#e3b4c4', '#fbeee8'], lay: [[9, 3, .95, 1.3, .4, .3, .2, .3], [8, 2.6, .9, .95, .45, .2, .12, .22], [7, 2.1, .8, .6, .5, .1, .05, .15]] },
    { pal: ['#6a5aa8', '#cdb0e6', '#f4ecf8'], lay: [[5, 4.6, .8, .28, .5, 1.1, .04, .1], [5, 3.8, .7, .2, .55, .9, .03, .08], [3, 2.6, .5, .12, .4, .5, .02, .05]] },
    { pal: ['#a46aa4', '#e8b6c8', '#fdf0ee'], lay: [[7, 2.2, 1.5, 1.05, .55, .1, .15, .2], [6, 1.9, 1.3, .8, .6, .05, .1, .15], [4, 1.4, 1, .5, .5, 0, .05, .1]] },
    { pal: ['#6a58a6', '#c7a4e0', '#f0e6fa'], lay: [[13, 3.4, .38, 1.2, .1, .3, .25, .3], [11, 2.8, .34, .8, .1, .2, .15, .2], [7, 2, .3, .45, .1, .1, .08, .1]] }
  ];
  const order = [0, 1, 2, 3, 4, 5]; for (let k = 5; k > 0; k--) { const j = (r() * (k + 1)) | 0, t = order[k]; order[k] = order[j]; order[j] = t; }
  const used = order.slice(0, 3 + ((r() * 2) | 0)), mood = [C('#d8a7b8'), C('#b9a7e0'), C('#f2e6f2')][(r() * 3) | 0], J = (v) => v * (.78 + r() * .44);
  const SPEC = BASE.map((b, si) => !used.includes(si) ? null : { pal: b.pal.map((h) => C(h).lerp(mood, .2)), lay: b.lay.map((l) => ({ n: Math.max(3, l[0] + (r() < .5 ? 0 : r() < .5 ? -1 : 1) * (l[0] > 8 ? 2 : 1)), L: J(l[1]), W: J(l[2]), open: J(l[3]), cup: J(l[4]), curl: J(l[5]), h0: l[6], amp: l[7] })) });
  const sp = (k) => used[k % used.length], TINT = ['#ffffff', '#f3dcff', '#ffe3ec', '#e9e0ff', '#fff2f4'].map(C), Y = new T.Vector3(0, 1, 0), Z = new T.Vector3(0, 0, 1), JJ = () => (r() - .5) * 1.6;
  // The composition: [kind, species, x, y, z, scale, dirX, dirY, dirZ]
  const far = Q < 1 ? 3 : 4 + ((r() * 3) | 0), plan = [];
  if (ar === 0) plan.push(['hero', sp(0), 0, 0, 0, 1.55, 0, .85, .5], ['mid', sp(1), -7 + JJ(), -1.5 + JJ(), -3 + JJ(), 1.15, -.35, .95, .15], ['mid', sp(2), 6.5 + JJ(), 1.5 + JJ(), -4 + JJ(), 1.1, .25, 1, .25], ['mid', sp(3), 2.5 + JJ(), -3.6 + JJ(), 5.5 + JJ(), .8, .1, 1, .45], ['hang', sp(1), -3.5 + JJ(), 6 + JJ() * .5, 1.5, .75, .1, -1, .1], ['hang', sp(2), 5 + JJ(), 6.5, -2.5, .6, -.1, -1, .15]);
  else if (ar === 1) { plan.push(['hero', sp(0), 0, -.5, 0, 1.05, 0, .9, .4]); const nr = 5 + ((r() * 2) | 0); for (let k = 0; k < nr; k++) { const a = k / nr * 6.283 + .3, d = 7.5 + r() * 1.2; plan.push(['mid', sp(k + 1), Math.cos(a) * d, (k % 2 ? 1.6 : -1.2) + r(), Math.sin(a) * d * .8, .85 + r() * .5, -Math.cos(a) * .35, 1, .35 - Math.sin(a) * .2]); } plan.push(['hang', sp(1), 0, 7, -1, .7, 0, -1, 0]); }
  else if (ar === 2) { for (let k = 0; k < 7; k++) { const t = k / 6; plan.push([k === 0 ? 'hero' : 'mid', sp(k), -9 + 18 * t + Math.sin(t * 6) * 2.5, -4.5 + 8.5 * t, 6 - 13 * t, 1.5 - t * .85, .1 - t * .3, .95, .5]); } plan.push(['hang', sp(2), 3, 6, 1, .7, 0, -1, .1]); }
  else if (ar === 3) { for (let k = 0, nh = 8 + ((r() * 3) | 0); k < nh; k++) plan.push(['hang', sp(k), (r() - .5) * 18, 2 + r() * 6, (r() - .5) * 12, .55 + r() * .6, (r() - .5) * .3, -1, (r() - .5) * .3]); plan[0][0] = 'hero'; plan[0][5] = 1.1; plan.push(['mid', sp(0), -3 + JJ(), -4.5, 2, 1.4, 0, 1, .4], ['mid', sp(1), 4 + JJ(), -5, -1, 1.2, .1, 1, .3], ['mid', sp(2), 0, -3, -6, .9, 0, 1, .3]); }
  else plan.push(['hero', sp(0), -5.5, 0, 0, 1.6, .5, .95, .3], ['hero', sp(1), 5.5, .8, -1, 1.45, -.5, .95, .3], ['mid', sp(2), -1, -3.5, 5, .8, .1, 1, .4], ['mid', sp(3), 2, 4.5, 3, .6, 0, 1, .3], ['mid', sp(2), -8, 3, -6, .9, .2, 1, .2], ['mid', sp(0), 8, -2, -6, .9, -.2, 1, .2]);
  for (let k = 0; k < far; k++) { const a = r() * 6.28, d = 15 + r() * 12; plan.push(['far', sp(k), Math.cos(a) * d, -5 + r() * 11, Math.sin(a) * d - 8, .5 + r() * .45, (r() - .5) * .6, 1, (r() - .5) * .6]); }
  for (let k = 0, nb = 3 + ((r() * 3) | 0); k < nb; k++) plan.push(['bud', sp(k), (r() - .5) * 16, -3 + r() * 6, (r() - .5) * 10, .3 + r() * .22, (r() - .5) * .6, 1, (r() - .5) * .6]);
  const nB = plan.length, nu = Q < 1 ? 14 : 22, nv = Q < 1 ? 8 : 12;
  const petalMat = lambert({ side: T.DoubleSide, emissive: '#2a1840' }), stamMat = new T.MeshBasicMaterial({ vertexColors: true });
  const white = new T.Color(1, 1, 1), IM = SPEC.map(() => null), cap = SPEC.map(() => 0);
  plan.forEach((p) => { cap[p[1]]++; });
  SPEC.forEach((s, si) => { if (!s || !cap[si]) return; IM[si] = s.lay.map((l) => [0, 1].map((vi) => {
    const m = new T.InstancedMesh(petal(l.L, l.W, l.open, l.cup, l.curl, vi ? .5 : 0, vi ? -.3 : .2, s.pal, nu, nv), petalMat, cap[si] * Math.ceil(l.n * 1.3));
    m.setColorAt(0, white); m.frustumCulled = false; m.count = 0; g.add(m); return m;   // every instanced mesh has an instance colour (see the technical notes)
  })); });
  const stems = new Acc(), leaves = new Acc(), qa = new T.Quaternion(), qb = new T.Quaternion(), bl = [];
  plan.forEach((pl) => {
    const kind = pl[0], spc = pl[1], s = pl[5], p = new T.Vector3(pl[2], pl[3], pl[4]), dir = new T.Vector3(pl[6], pl[7], pl[8]).normalize();
    const q = new T.Quaternion().setFromUnitVectors(Y, dir), len = kind === 'hero' ? SLEN + 6 : SLEN * .6 + r() * 6, lat = new T.Vector3(r() - .5, 0, r() - .5).normalize(), lat2 = new T.Vector3().crossVectors(dir, lat).normalize(), a0 = p.clone().addScaledVector(dir, -.3 * s);
    const pts = [a0]; for (let k = 1; k <= 4; k++) { const t = k / 4; pts.push(a0.clone().addScaledVector(dir, -len * t).addScaledVector(lat, (r() - .5) * SW * t).addScaledVector(lat2, (r() - .5) * SW * .6 * t)); }
    const curve = new T.CatmullRomCurve3(pts), sc = stemC.clone().lerp(C('#c7b3d9'), r() * .3);
    stems.add(stemGeo(curve, Q < 1 ? 16 : 28, .035 + .02 * s, .08 + .04 * s, r() * 6), new T.Matrix4(), (c) => { c.copy(sc); });
    stems.add(new T.SphereGeometry(.2 * s, 10, 8), M(a0.x, a0.y, a0.z, 0, 0, 0, 1, .7, 1), (c) => { c.copy(sc).lerp(C('#e3d6ee'), .4); });
    for (let k = 0, nl = kind === 'bud' ? 1 : kind === 'hero' ? LN + 3 : LN + ((r() * 2) | 0); k < nl; k++) {
      const u = .15 + r() * .7, P0 = curve.getPointAt(u), Tg = curve.getTangentAt(u), sd = new T.Vector3().crossVectors(Tg, Z).normalize(), dl = sd.clone().applyAxisAngle(Tg, r() * 6.28).addScaledVector(Tg, -.4).normalize();
      qa.setFromUnitVectors(Y, dl); qb.setFromAxisAngle(dl, r() * 6.28); qa.premultiply(qb);
      const ls = (.8 + r() * .9) * (kind === 'hero' ? 1.5 : 1) * LSZ; leaves.add(leaf(1.1 * ls * Math.sqrt(s + .5), .3 * ls * Math.sqrt(s + .5) / SLEND), new T.Matrix4().compose(P0, qa, new T.Vector3(1, 1, 1)), (c) => { c.set('#8c9cbc'); });
    }
    const grp = new T.Group(); grp.position.copy(p); grp.quaternion.copy(q); grp.scale.setScalar(s);
    const stam = new Acc();
    for (let k = 0; k < 12; k++) { const h = .8 + r() * .9, e = new T.Euler((r() - .5) * 1.1, 0, (r() - .5) * 1.1), tip = new T.Vector3(0, h, 0).applyEuler(e); stam.add(new T.CylinderGeometry(.012, .02, h, 5).translate(0, h / 2, 0), M(0, 0, 0, e.x, 0, e.z), (c) => { c.set('#f4e6d4'); }); stam.add(new T.SphereGeometry(.07, 8, 6), M(tip.x, tip.y, tip.z), (c) => { c.set('#f7c7d6'); }); }
    grp.add(stam.mesh(stamMat)); g.add(grp);
    const big = kind === 'hero', gl = glow(env, '#e6a7c8', (big ? 9 : 6) * s, big ? .5 : .4, p.x + dir.x * .8 * s, p.y + dir.y * .8 * s, p.z + dir.z * .8 * s); g.add(gl);
    const lay = SPEC[spc].lay, cm = .8 + r() * .45;
    bl.push({ p, q, s, grp, gl, kind, sp: spc, bud: kind === 'bud', ph: r() * 6.28, spd: .7 + r() * .6, rot: r() * 6.28, len: .85 + r() * .4, wid: .8 + r() * .5, open: big ? .12 : -.05 + r() * .25, spiral: big || r() < .45, tint: TINT[(r() * TINT.length) | 0], cnt: lay.map((l) => Math.max(3, Math.round(l.n * cm))),
      pj: lay.map((l) => Array.from({ length: Math.ceil(l.n * 1.3) + 1 }, () => ({ s: .88 + r() * .26, h: (r() - .5) * .18 }))), lo: lay.map(() => r() * 6.28) });
  });
  g.add(stems.mesh(lambert({ emissive: '#1a1a34' })), leaves.mesh(lambert({ side: T.DoubleSide, emissive: '#1a1a34' })));
  const FN = Q < 1 ? 14 : 22, gi = IM[used[0]], fall = new T.InstancedMesh(gi[1][0].geometry, petalMat, FN), fs = Array.from({ length: FN }, () => ({ x: (r() - .5) * 28, y: -10 + r() * 22, z: (r() - .5) * 26, v: .25 + r() * .35, ph: r() * 6.28, rx: r() * 6.28, ry: r() * 6.28, rs: .3 + r() * .6 }));
  for (let k = 0; k < FN; k++) fall.setColorAt(k, white); fall.frustumCulled = false; g.add(fall);
  const hz = [haze(env, r, ['#d8a7b8', '#b9a7e0'], Q < 1 ? 8 : 14, 50, 14, 24, .09), haze(env, r, ['#b9a7e0', '#d8a7b8'], Q < 1 ? 4 : 7, 60, 3, 34, .1, -10)]; hz.forEach((l) => l.forEach((s) => g.add(s)));
  // Pollen: a camera-anchored layer so the view is always full, a world layer behind, glowing medium orbs, and a few slow streams
  const air = [motes(env, Math.round(800 * Q), [36, 22, 36], [.08, .16, .04], POL, 3.6, r, .85, { anchor: true, min: 2.2 }), motes(env, Math.round(1100 * Q), [64, 30, 64], [.06, .14, .03], POL, 3.2, r, .8, { k: 30, min: 2 }),
    motes(env, Math.round(240 * Q), [50, 26, 50], [.05, .2, .03], POL, 9, r, .35, { anchor: true, soft: true, min: 6, max: 14 })];
  air.forEach((m) => g.add(m));
  for (let k = 0; k < 3; k++) { const m = motes(env, Math.round(100 * Q), [34, 1.8, 2.2], [.7, .25, .2], POL, 3.4, r, .85, { min: 2.2 }); m.rotation.y = r() * 6.28; m.position.set((r() - .5) * 16, -4 + r() * 8, (r() - .5) * 14); g.add(m); }
  g.add(glow(env, '#d8a7b8', 60, .28, -22, 10, -34));
  lights(g, '#f3dcff', '#33204f', .72, '#ffe6ee', .5, [3, 8, 6]);
  const dummy = new T.Object3D(), qy = new T.Quaternion(), qz = new T.Quaternion(), used2 = IM.map((a) => a ? a.map(() => [0, 0]) : null);
  let KS = 1, colored = false;
  return { group: g, label: ARCH_NAMES[1][ar], fog: { color: '#2b1a45', density: .02 + r() * .008 }, sky: ['#1c1138', '#5a3c80', '#d8a7b8'],
    cam: { center: new T.Vector3(0, [.6, .5, 0, 2, .5][ar], 0), dist: [17, 21, 24, 21, 20][ar], min: 6.5, max: 34, pitch: [-.2, .65], pitch0: .1, drift: .03, yaw0: [-.25, 0, -.5, .2, 0][ar] },
    setScale(v) { KS = v; },
    update(t, dt) {
      used2.forEach((a) => { if (a) a.forEach((b) => { b[0] = b[1] = 0; }); });
      bl.forEach((b) => {
        const LAY = SPEC[b.sp].lay; b.grp.scale.setScalar(b.s * KS); b.gl.scale.setScalar((b.kind === 'hero' ? 9 : 6) * b.s * KS);
        LAY.forEach((l, li) => {
          const hinge = b.bud ? .02 : l.h0 + b.open * (l.amp > .2 ? 1 : .4) + l.amp * (.5 + .5 * Math.sin(t * .32 * b.spd + b.ph - li * .55));
          for (let k = 0; k < b.cnt[li]; k++) {
            const j = b.pj[li][k], vi = k % 2, m = IM[b.sp][li][vi], idx = used2[b.sp][li][vi]++, S = b.s * KS * j.s;
            qz.setFromAxisAngle(Z, -(hinge + j.h)); qy.setFromAxisAngle(Y, b.rot + b.lo[li] * (b.spiral ? 0 : .3) + (b.spiral ? k * 2.39996 : k / b.cnt[li] * 6.2832));
            dummy.position.copy(b.p); dummy.quaternion.copy(b.q).multiply(qy).multiply(qz); dummy.scale.set(S, S * b.len, S * b.wid); dummy.updateMatrix();
            m.setMatrixAt(idx, dummy.matrix); if (!colored) m.setColorAt(idx, b.tint);
          }
        });
        b.gl.material.opacity = (b.bud ? .15 : b.kind === 'hero' ? .42 : .3) + .2 * Math.sin(t * .32 * b.spd + b.ph);
      });
      IM.forEach((a, si) => { if (a) a.forEach((b, li) => b.forEach((m, vi) => { m.count = used2[si][li][vi]; m.instanceMatrix.needsUpdate = true; if (!colored) m.instanceColor.needsUpdate = true; })); });
      colored = true;
      fs.forEach((f, k) => {
        f.y -= f.v * dt; if (f.y < -11) f.y = 11;
        dummy.position.set(f.x + Math.sin(t * .3 + f.ph) * 1.5, f.y, f.z + Math.cos(t * .25 + f.ph) * 1.5); dummy.rotation.set(f.rx + t * f.rs, f.ry + t * f.rs * .7, 0); dummy.scale.setScalar(.28); dummy.updateMatrix(); fall.setMatrixAt(k, dummy.matrix);
      });
      fall.instanceMatrix.needsUpdate = true;
      hz.forEach((l) => l.forEach((s) => { s.position.x += s.userData.v * dt; if (Math.abs(s.position.x) > 30) s.position.x *= -.98; }));
    } };
}

/* =====================================================================
   WORLD 003: THE SUSPENDED DUNES
   Five compositions: dune sea, procession, star dune, crescents, scatter. The seed changes how the lobes of each dune are
   arranged (long ridges, radial arms, horned crescents), the crest profile, the layout of the formations, the sun direction and
   the arrangement of standing stones (cluster, henge, avenue, solitary). Particles are layered: fine grains and medium
   drifting particles that fill the view, floating dust, blowing sheets and denser streams, all moving with the wind.
   ===================================================================== */
function dunes(seed, env) {
  const ar = archetype(2, seed), r = mulberry(seed), g = new T.Group(), Q = env.Q;
  const ivory = C('#f4e6d4'), gold = C('#d9b27c'), peach = C('#f2c4a6'), rose = C('#d99a96'), dusk = C('#7e5870'), clay = C('#c98f86'), deepGold = C('#c79a58');
  const PAL = [ivory, ivory, gold, peach, deepGold];   // warm ivory, muted gold, soft peach; the deeper gold keeps grains readable on bright dune tops
  const mat = lambert({ side: T.DoubleSide, emissive: '#241820' });
  const wind = .2 + r() * 1.1, cw = Math.cos(wind), sw = Math.sin(wind), ss = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const CREST = .8 + r() * 1.4, LEE = .3 + r() * .3, RIP = 2.6 + r() * 1.6;   // windward exponent, lee width, ripple frequency
  const slabs = [], origList = [], placedList = [], stoneDims = [], NL = [Q < 1 ? 6 : 9, 8, 8, 9, Q < 1 ? 8 : 14][ar], NS = ar === 4 ? 4 : 6;
  const sandstone = new T.Color('#d2b79b'), sandstoneB = new T.Color('#a58b78'), sandstoneC = new T.Color('#e8d3bb');
  const stoneAt = (acc, hAt, x, z, h, w, k) => {   // a tapered, flattened, chipped sandstone slab, sunk a fifth into the sand
    const y = hAt(x, z) - h * .22, geo = new T.CylinderGeometry(w * .3, w * .62, h, 7, 5), P = geo.attributes.position, sd = seed + 500 + k * 13, lean = (r() - .5) * .16, chip = (r() - .5) * .5;
    for (let v = 0; v < P.count; v++) {
      const vx = P.getX(v), vy = P.getY(v), vz = P.getZ(v), n1 = vnoise(vx * 2.2 + k, vz * 2.2 + vy * 1.5, sd), n2 = vnoise(vx * 3.1 + 7, vy * 2 + vz * 3.1, sd + 3), up = vy / h + .5;
      const rough = up > .85 ? (n2 - .35) * .34 * h + (n1 - .5) * .16 * h : 0;
      P.setXYZ(v, vx * (1 + (n1 - .5) * .55) + chip * w * Math.max(0, up - .5) * 1.4, vy + rough, vz * .5 * (1 + (n2 - .5) * .5));
    }
    geo.computeVertexNormals();
    acc.add(geo, M(x, y + h / 2, z, lean * 1.4, r() * 3, (r() - .5) * .16), (c, px, py) => { c.copy(sandstone).lerp(sandstoneB, .5 + .5 * Math.sin(py * 5.5 + px * 2)).lerp(sandstoneC, clamp(py * .1, 0, .35)); });
    stoneDims.push({ w, h });
  };
  const stones = (grp, style, R, hAt) => {
    let best = null;
    for (let k = 0; k < 40; k++) { const a = r() * 6.28, d = R * (.1 + r() * .35), x = Math.cos(a) * d, z = Math.sin(a) * d, sl = Math.abs(hAt(x + .6, z) - hAt(x - .6, z)) / 1.2 + Math.abs(hAt(x, z + .6) - hAt(x, z - .6)) / 1.2, sc = -Math.abs(hAt(x, z) - .45 * R * .12) * 1.5 - sl * 4; if (!best || sc > best.s) best = { x, z, s: sc }; }
    const acc = new Acc();
    if (style === 'cluster') for (let k = 0; k < 7; k++) { const cls = k === 0 ? 0 : k < 3 ? 1 : 2, a = r() * 6.28, dist = k === 0 ? r() * .6 : 1.2 + r() * 2.2; stoneAt(acc, hAt, best.x + Math.cos(a) * dist, best.z + Math.sin(a) * dist, cls === 0 ? 2.3 + r() * .8 : cls === 1 ? 1.2 + r() * .6 : .5 + r() * .4, cls === 0 ? 1.6 + r() * .5 : cls === 1 ? 1.1 + r() * .35 : .65 + r() * .3, k); }
    else if (style === 'henge') { const n = 7 + ((r() * 3) | 0), rad = Math.min(R * .3, 4.2); for (let k = 0; k < n; k++) { const a = k / n * 6.283 + (r() - .5) * .15; stoneAt(acc, hAt, best.x + Math.cos(a) * rad, best.z + Math.sin(a) * rad, 1.5 + r() * 1.1, 1.1 + r() * .35, k); } stoneAt(acc, hAt, best.x, best.z, .7, 1.4, 99); }
    else if (style === 'avenue') for (let k = 0; k < 4; k++) for (const sg of [-1, 1]) stoneAt(acc, hAt, best.x + k * 3.4 * cw - sg * 2.3 * sw, best.z + k * 3.4 * sw + sg * 2.3 * cw, 2.6 - k * .3 + r() * .5, 1.5 - k * .1 + r() * .3, k * 2 + (sg > 0 ? 1 : 0));
    else { stoneAt(acc, hAt, best.x, best.z, 3 + r() * .8, 2.2 + r() * .5, 0); for (let k = 1; k < 4; k++) { const a = r() * 6.28, d = 2.5 + r() * 2; stoneAt(acc, hAt, best.x + Math.cos(a) * d, best.z + Math.sin(a) * d, .5 + r() * .6, .7 + r() * .3, k); } }
    for (let k = 0; k < 4; k++) { const a = r() * 6.28, dist = 1 + r() * 3, x = best.x + Math.cos(a) * dist, z = best.z + Math.sin(a) * dist, s = .25 + r() * .35; acc.add(new T.IcosahedronGeometry(s, 0), M(x, hAt(x, z) + s * .1, z, r() * 3, r() * 3, 0, 1.2, .6, .9), (c) => { c.copy(sandstone).lerp(sandstoneB, .4); }); }
    const m = acc.mesh(lambert({ emissive: '#241820' })); m.castShadow = Q === 1; m.receiveShadow = Q === 1; grp.add(m);
  };
  const STYLE = [['cluster', 'solitary'], ['avenue', 'solitary'], ['henge', 'solitary'], ['cluster', 'solitary'], ['solitary', 'solitary']][ar];
  // Placement safety. A formation's real surface is used (the top and the underside at every point of its outline), not a circle. Because the formations
  // turn slowly, the neighbour is also tested at a few other orientations. Nothing here uses the random stream, so shapes are unaffected.
  // Two levels: a formation is only moved if it really intersects another (tight test), and it is moved to the nearest place that is safely clear,
  // including while it bobs and turns (m: vertical clearance, infl: outline allowance, sweep: orientations of the neighbour that are tested).
  // The Procession is the composition whose layout was broken (it had no overlap check at all), so it is checked more strictly than the others.
  const PLACE = { trigger: ar === 1 ? { m: .6, infl: 1, sweep: [-.25, 0, .25], tl: .04 } : { m: .08, infl: 1, sweep: [0], tl: .03 }, target: { m: .6, infl: 1.03, sweep: [-.25, 0, .25], tl: .04 } };
  const span = (sh, lx, lz, infl) => {
    const th = Math.atan2(lz, lx), ti = Math.round((th < 0 ? th + 6.2832 : th) / 6.2832 * sh.TS) % sh.TS, rim = sh.rimR[ti], rho = Math.hypot(lx, lz);
    if (rho > rim * infl) return null;
    const k = Math.min(1, rho / rim), an = Math.acos(Math.pow(k, 1 / .75)), row = Math.min(sh.rows - 1, sh.S1 + Math.round(an / (Math.PI / 2) * sh.S2));
    return [sh.pos[(row * sh.TS + ti) * 3 + 1], sh.pos[(Math.min(sh.S1, Math.round(k * sh.S1)) * sh.TS + ti) * 3 + 1]];   // [underside, top]
  };
  const reaches = (A, ax, ay, az, B, bx, by, bz, drot, L) => {   // does any part of A reach into B (B turned by drot)?
    const ca = Math.cos(A.sh.rot), sa = Math.sin(A.sh.rot), cb = Math.cos(B.sh.rot + drot), sb = Math.sin(B.sh.rot + drot), m = L.m;
    for (let ti = 0; ti < 24; ti++) {
      const th = ti / 24 * 6.2832, rim = A.sh.rimR[Math.round(ti / 24 * A.sh.TS) % A.sh.TS];
      for (const f of [0, .3, .6, .85, 1]) {
        const lx = Math.cos(th) * rim * f, lz = Math.sin(th) * rim * f, dx = ax + lx * ca + lz * sa - bx, dz = az - lx * sa + lz * ca - bz;
        const bx2 = dx * cb - dz * sb, bz2 = dx * sb + dz * cb, sB = span(B.sh, bx2, bz2, L.infl), sA = sB && span(A.sh, lx, lz, 1.02);
        if (!sB || !sA) continue;
        const mm = m + L.tl * (Math.hypot(lx, lz) + Math.hypot(bx2, bz2));   // plus allowance for the formations' small random tilt (at most 0.04 rad each)
        if (ay + sA[0] - mm < by + sB[1] + mm && by + sB[0] - mm < ay + sA[1] + mm) return true;
      }
    }
    return false;
  };
  const clashes = (A, x, y, z, L) => placedList.some((B) => L.sweep.some((d) => reaches(A, x, y, z, B, B.x, B.y, B.z, d, L) || reaches(B, B.x, B.y, B.z, A, x, y, z, d, L)));
  const OFFS = (() => {   // candidate moves, nearest first: along the procession path, straight up or down, then an outward spiral
    const o = [], tg = [.93, -.37];
    for (let s = 1; s <= 40; s++) for (const sg of [1, -1]) o.push([sg * s * 2.5 * tg[0], 0, sg * s * 2.5 * tg[1], .85]);
    [3.5, 5, 7, 9, 11, 14].forEach((d) => [1, -1].forEach((sg) => o.push([0, sg * d, 0, .9])));
    for (let s = 1; s <= 320; s++) { const rho = 3.1 * Math.sqrt(s), a = s * 2.39996; o.push([Math.cos(a) * rho, [0, 3, -3][s % 3], Math.sin(a) * rho * .8, 1]); }
    return o.map((c) => ({ c, d: Math.hypot(c[0], c[1] * .6, c[2]) * c[3] })).sort((p, q) => p.d - q.d).map((p) => p.c);
  })();
  const relocate = (A, x, y, z) => {
    if (!clashes(A, x, y, z, PLACE.trigger)) return [x, y, z];
    for (const c of OFFS) { const nx = x + c[0], ny = y + c[1], nz = z + c[2]; if (Math.abs(nx) <= 85 && nz >= -105 && nz <= 16 && ny >= -18 && ny <= 14 && !clashes(A, nx, ny, nz, PLACE.target)) return [nx, ny, nz]; }
    return [x, y, z];
  };
  const spawn = (i) => {
    const small = i >= NL, hero = i === 0 && ar !== 4, t = i / Math.max(1, NL - 1);
    const R = hero ? (ar === 2 ? 12 : 13) : small ? 1.6 + r() * 1.6 : ar === 1 ? 11 - t * 7 + r() * 1.5 : ar === 4 ? 3 + r() * 4 : 4 + Math.pow(r(), 1.4) * 9, A = (hero ? 2.3 : small ? .45 : .8 + r() * .7) * Math.max(.6, R / 8), depth = R * (.12 + .1 * r()), s = seed * 7 + i * 131;
    const rot = ar === 1 && !small ? .6 + t * .5 + (r() - .5) * .2 : r() * 6.28, asp = ar === 1 ? 1.5 + r() * .7 : 1 + r() * .5, ra = r() * 6.28;
    const rim = (th) => R * (1 + .45 * (vnoise(Math.cos(th) * 1.2 + 5, Math.sin(th) * 1.2 + 5, s) - .5) + .1 * (vnoise(Math.cos(th) * 3 + 9, Math.sin(th) * 3 + 9, s + 5) - .5)) * asp / Math.hypot(Math.cos(th - ra) * asp * .85, Math.sin(th - ra));
    const lobes = [];
    if (ar === 2 && !small && (hero || r() < .6)) {   // star dune: radial arms around a high centre
      const arms = 4 + ((r() * 2) | 0); lobes.push({ cx: 0, cz: 0, th: wind, L: R * .45, Wd: R * .45, H: A * .5, horn: 0 });
      for (let k = 0; k < arms; k++) { const th = wind + k / arms * 6.283 + (r() - .5) * .3; lobes.push({ cx: Math.cos(th) * R * .28, cz: Math.sin(th) * R * .28, th, L: R * .85, Wd: R * .26, H: A * (.75 + r() * .35), horn: 0 }); }
    } else if (ar === 1 && !small) { lobes.push({ cx: 0, cz: 0, th: wind, L: R * .4, Wd: R * 1.0, H: A * 1.0, horn: .5 + r() * .5 }, { cx: R * .2, cz: R * .1, th: wind + .4, L: R * .3, Wd: R * .6, H: A * .6, horn: .3 }); }
    else if (ar === 3 && !small) { for (let k = 0, nl = 2 + ((r() * 2) | 0); k < nl; k++) lobes.push({ cx: (r() - .5) * R * .7, cz: (r() - .5) * R * .5, th: wind + (r() - .5) * .3, L: R * (.35 + r() * .25), Wd: R * (.4 + r() * .3), H: A * (.6 + r() * .5), horn: 1 + r() * .5 }); }
    else for (let k = 0, nl = small ? 1 : ar === 4 ? 2 : 3 + ((r() * 2) | 0); k < nl; k++) lobes.push({ cx: (r() - .5) * R * .8, cz: (r() - .5) * R * .6, th: wind + (r() - .5) * 1.1, L: R * (.28 + r() * .3), Wd: R * (.5 + r() * .45), H: A * (.55 + r() * .55), horn: r() < .6 ? .4 + r() * .7 : 0 });
    const lobeSum = (x, z, wp) => {
      let h = 0;
      for (const l of lobes) {
        const dx = x - l.cx + wp * 4, dz = z - l.cz + wp * 4, c = Math.cos(l.th), sn = Math.sin(l.th), u = (dx * c + dz * sn) / l.L, v = (-dx * sn + dz * c) / l.Wd, us = u + l.horn * v * v * .55;
        h += l.H * (us < 0 ? Math.pow(ss((us + 1.3) / 1.3), CREST + .55) : 1 - ss(us / LEE)) * Math.exp(-v * v * (ar === 2 && l.horn === 0 ? 1.6 : 1));
      }
      return A * 2 * Math.tanh(h / (A * 2));   // soft cap: overlapping lobes merge into broad mounds, never spikes
    };
    const far0 = i > 3 && !hero ? 1 : 0;
    const TS = Math.round((Q < 1 ? 84 : 190) * (small ? .5 : clamp(R / 11, .5, 1.15)) * (far0 ? .8 : 1)), S1 = Math.round((Q < 1 ? 30 : 58) * (small ? .5 : clamp(R / 11, .55, 1))), S2 = Q < 1 ? 7 : 12, rows = S1 + S2 + 1, ph = r() * 6.28;
    const pos = new Float32Array(TS * rows * 3), col = new Float32Array(TS * rows * 3), c = new T.Color(), rimR = new Float32Array(TS), rimH = new Float32Array(TS), wpAt = (x, z) => fbm(x * .05 + 3, z * .05 + 3, s, 3) - .5, bump = (x, z) => (fbm(x * .09, z * .09, s + 4, 3) - .5) * A * .35;
    for (let ti = 0; ti < TS; ti++) { const th = ti / TS * 6.2832, rr = rim(th), x = Math.cos(th) * rr, z = Math.sin(th) * rr; rimR[ti] = rr; rimH[ti] = (lobeSum(x, z, wpAt(x, z)) + bump(x, z)) * .12; }
    for (let si = 0; si < rows; si++) for (let ti = 0; ti < TS; ti++) {
      const th = ti / TS * 6.2832, ct = Math.cos(th), st = Math.sin(th), rr = rimR[ti]; let x, y, z;
      if (si <= S1) {
        const k = si / S1, e = .4; x = ct * rr * k; z = st * rr * k;
        const wp = wpAt(x, z), edge = 1 - Math.pow(k, 3) * .78, u = x * cw + z * sw, w = -x * sw + z * cw, rp = Math.sin(u * RIP + Math.sin(w * .8) * 1.5 + ph);
        const h0 = lobeSum(x, z, wp) + bump(x, z), sl = (lobeSum(x + e * cw, z + e * sw, wp) - lobeSum(x - e * cw, z - e * sw, wp)) / (2 * e);
        y = h0 * edge + depth * .06 + rp * .04 * edge * clamp(h0 / A + .3, 0, 1);
        c.copy(gold).lerp(ivory, clamp(.45 + y / (A * 1.5), 0, 1)).lerp(peach, .18).lerp(rose, Math.pow(k, 7) * .4);
        c.lerp(ivory, clamp(sl * .45, 0, .3)).lerp(dusk, clamp(-sl * .55, 0, .38) * (1 - Math.pow(k, 4))).lerp(rose, (.5 + .5 * rp) * .1);
      } else {
        const q = (si - S1) / S2, an = q * Math.PI / 2, n = vnoise(ct * 2 + q * 3, st * 2 + q * 3, s + 3), shrink = Math.pow(Math.cos(an), .75);
        x = ct * rr * shrink; z = st * rr * shrink; y = rimH[ti] - depth * Math.pow(Math.sin(an), 1.25) * (.7 + .6 * n);
        c.copy(peach).lerp(clay, .5 + q * .3).lerp(dusk, q * q * .4).lerp(ivory, (.5 + .5 * Math.sin(q * 30 + n * 6)) * .15 * (1 - q));
      }
      const o = (si * TS + ti) * 3; pos[o] = x; pos[o + 1] = y; pos[o + 2] = z; col[o] = c.r; col[o + 1] = c.g; col[o + 2] = c.b;
    }
    const idx = [];
    for (let si = 0; si < rows - 1; si++) for (let ti = 0; ti < TS; ti++) { const p0 = si * TS + ti, p1 = si * TS + (ti + 1) % TS, p2 = (si + 1) * TS + ti, p3 = (si + 1) * TS + (ti + 1) % TS; idx.push(p0, p2, p1, p1, p2, p3); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    let px = 0, py = 0, pz = 0;   // layout per composition
    for (let tries = 0; tries < 16; tries++) {
      if (hero) { px = ar === 2 ? 2 : 6; py = -1; pz = -4; break; }
      if (ar === 1) { px = -34 + t * 66 + (r() - .5) * 4; pz = -8 - t * 24 + Math.sin(t * 5) * 7; py = -3 + (t - .5) * 12 + (r() - .5) * 3; break; }
      if (ar === 3) { const a = Math.PI * (.15 + i / NL * .75) + (r() - .5) * .3, d = 24 + r() * 12; px = Math.cos(a + Math.PI) * d * 1.3; pz = -Math.sin(a) * d - 4; py = (r() - .5) * 14; }
      else { const dist = 12 + r() * (small ? 40 : 60), a = r() * 6.28 * .55 + 3.6; px = Math.cos(a) * dist * 1.1; pz = -Math.abs(Math.sin(a)) * dist - 6 + (small ? 14 : 0); py = (r() - .45) * (small ? 24 : 18) - dist * .05; }
      if (origList.every((o) => Math.hypot(o.x - px, o.z - pz) > (o.R + R) * .8 || Math.abs(o.y - py) > 4)) break;
    }
    origList.push({ x: px, y: py, z: pz, R });
    // Placement safety: keep the proposed position unless the formation really intersects an earlier one; then move it the shortest way that clears it.
    const sh = { TS, S1, S2, rows, pos, rimR, rot };
    if (placedList.length) { const f = relocate({ sh }, px, py, pz); px = f[0]; py = f[1]; pz = f[2]; }
    placedList.push({ x: px, y: py, z: pz, sh });
    const grp = new T.Group(); grp.position.set(px, py, pz); grp.rotation.set((r() - .5) * .08, rot, (r() - .5) * .08);
    const mesh = new T.Mesh(geo, mat); if (Q === 1 && R > 3) { mesh.castShadow = true; mesh.receiveShadow = true; } grp.add(mesh);
    const stream = (th, rf, w, cnt) => {   // a curtain of sand falling from the lee edge
      const len = depth * 2.5 + 7, m = motes(env, Math.round(cnt * Q), [w, len, .3], [cw * .3, -1, sw * .3], PAL, 3.4, r, .9, { normal: true, min: 2.2, k: 40 }), ix = Math.round((th / 6.2832 + 1) % 1 * TS) % TS;
      m.rotation.y = -(wind + Math.PI / 2) - rot; m.position.set(Math.cos(th) * rimR[ix] * rf, -depth * .4 - len / 2, Math.sin(th) * rimR[ix] * rf); grp.add(m);
    };
    const leeA = wind - rot;
    if (!small) { stream(leeA + (r() - .5) * .5, .85, R * .35, 240); if (R > 7) stream(leeA + .8 + r() * .8, .8, R * .2, 150); } else stream(leeA, .7, .5, 60);
    const hAt = (x, z) => lobeSum(x, z, wpAt(x, z)) + bump(x, z) + depth * .06;
    if (hero) stones(grp, STYLE[0], R, hAt); else if (!small && (ar === 4 ? i < 4 : i === 1)) stones(grp, STYLE[1], R, hAt);
    g.add(grp); slabs.push({ grp, y0: py, ph: r() * 6.28, sp: .2 + r() * .25 });
  };
  for (let i = 0; i < NL + NS; i++) spawn(i);
  // Particles, in layers, all moving with the wind. Normal blending and dark-rimmed discs keep them readable on bright and dark ground.
  const GRN = { normal: true, anchor: true, min: 2.4 };
  const air = [
    motes(env, Math.round(1600 * Q), [44, 22, 44], [cw * 1.1, .05, sw * 1.1], PAL, 4.2, r, .95, GRN),                                // fine grains near the lens, filling the view
    motes(env, Math.round(2600 * Q), [90, 34, 70], [cw * .9, .05, sw * .9], PAL, 3.8, r, .9, { normal: true, k: 34, min: 2.2 }),   // grains through the whole scene
    motes(env, Math.round(420 * Q), [70, 30, 70], [cw * .55, .03, sw * .55], PAL, 10, r, .55, { normal: true, anchor: true, soft: true, min: 6, max: 16 }),   // medium drifting particles
    motes(env, Math.round(150 * Q), [90, 40, 90], [cw * .15, .04, sw * .15], PAL, 22, r, .13, { normal: true, anchor: true, soft: true, min: 12, max: 30 })];   // floating dust
  air[1].position.set(0, 0, -16); air.forEach((m) => g.add(m));
  for (let k = 0; k < 8; k++) { const m = motes(env, Math.round(190 * Q), [52, 2.2, 3.4], [cw * 3.4, .03, sw * 3.4], PAL, 4, r, .9, { normal: true, min: 2.4, k: 40 }); m.rotation.y = -wind; m.position.set((r() - .5) * 40, -7 + r() * 14, -30 + r() * 26); g.add(m); }   // streams of blowing sand
  for (let k = 0; k < 3; k++) { const m = motes(env, Math.round(700 * Q), [44, 5, 44], [cw * 2.4, .05, sw * 2.4], PAL, 3.6, r, .8, { normal: true, min: 2.2, k: 40 }); m.position.set((r() - .5) * 20, -2 + k * 1.5, -14 - r() * 10); g.add(m); }   // low blowing sheets
  const hz = [haze(env, r, ['#f0c6a8', '#d99a96', '#f4e6d4'], Q < 1 ? 8 : 14, 120, 30, 30, .1, -4), haze(env, r, ['#f0c6a8'], Q < 1 ? 5 : 9, 140, 4, 40, .07, -14)]; hz.forEach((l) => l.forEach((s) => g.add(s)));
  const shafts = []; for (let k = 0; k < (Q < 1 ? 3 : 5); k++) { const s = glow(env, '#ffd9b8', 1, .06, -20 + r() * 60, 6, -40 + r() * 20); s.scale.set(3.5 + r() * 2, 30, 1); s.material.rotation = -.5 + r() * .15; g.add(s); shafts.push({ s, ph: r() * 6.28 }); }
  const SUN = [[-24, 15, -9], [22, 13, -14], [-6, 11, -26], [-20, 18, 8]][ar === 0 ? 0 : (r() * 4) | 0];
  g.add(glow(env, '#ffd2b0', 60, .55, SUN[0] * 1.4, 12, SUN[2] * 7)); g.add(glow(env, '#f4e6d4', 18, .45, SUN[0] * 1.4, 12, SUN[2] * 7));
  g.add(new T.HemisphereLight('#ffe9dc', '#7a5568', .7));
  const sun = new T.DirectionalLight('#ffd5b8', 1.2); sun.position.set(SUN[0], SUN[1], SUN[2]);
  if (Q === 1) { sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc2 = sun.shadow.camera; sc2.left = -70; sc2.right = 70; sc2.top = 70; sc2.bottom = -70; sc2.near = 1; sc2.far = 160; sun.shadow.bias = -.0008; sun.shadow.normalBias = .06; }
  g.add(sun);
  return { group: g, label: ARCH_NAMES[2][ar], fog: { color: '#7a5668', density: .0105 + r() * .004 }, sky: ['#2a1f33', '#b6877a', '#f4cfae'],
    cam: { center: new T.Vector3(2, -2, -14), dist: [40, 42, 38, 40, 40][ar], min: 14, max: 78, pitch: [.0, .8], pitch0: .17, drift: .025, yaw0: [.35, -.3, .5, 0, -.35][ar] },
    stats: { stones: stoneDims, layout: placedList },
    setScale(v) { slabs.forEach((o) => o.grp.scale.setScalar(v)); },
    update(t, dt) {
      slabs.forEach((o, i) => { o.grp.position.y = o.y0 + Math.sin(t * o.sp + o.ph) * .35; o.grp.rotation.y += dt * .004 * (i % 2 ? 1 : -1); });
      hz.forEach((l) => l.forEach((s) => { s.position.x += s.userData.v * dt; if (Math.abs(s.position.x) > 62) s.position.x *= -.98; }));
      shafts.forEach((o) => { o.s.material.opacity = .055 + .03 * Math.sin(t * .17 + o.ph); });
    } };
}

return { build: (i, seed, env) => [tidal, blooming, dunes][i](seed, env), archetype, ARCH_NAMES };
})();
