// Sentetik iskelet üretici: 3B vücut (metre) → kamera izdüşümü → MediaPipe biçiminde noktalar.
// Kişi koordinatı: x = kişinin SOLU, y = yukarı, z = ileri (göğsün baktığı yön).
const RAD = Math.PI / 180;
const v = (x, y, z) => ({ x, y, z });
const add = (a, b) => v(a.x + b.x, a.y + b.y, a.z + b.z);
const mul = (a, k) => v(a.x * k, a.y * k, a.z * k);
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const norm = (a) => { const l = Math.hypot(a.x, a.y, a.z) || 1; return mul(a, 1 / l); };
const rotX = (p, a) => v(p.x, p.y * Math.cos(a) - p.z * Math.sin(a), p.y * Math.sin(a) + p.z * Math.cos(a));
const rotZ = (p, a) => v(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a), p.z);

function randn(rng) { let u = 0, w = 0; while (!u) u = rng(); while (!w) w = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * w); }
export function mulberry(seed = 1) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/**
 * spec: {
 *   rootPitch (derece, tüm vücut x ekseninde döner; -90 = sırtüstü yatış), torsoPitch (DİKKAT: + = GERİYE yatma, − = öne eğilme), torsoRoll,
 *   shrug (metre), hipY, crouch (kalça alçalması, metre),
 *   arms: {L|R: {flex, abd, elbow, bend:'fwd'|'up'|'back', dir?:[out,down,fwd]}},
 *   legs: {L|R: {flex, knee, valgus (metre içe), heel (derece topuk kalkışı)}},
 * }
 */
export function skeleton(spec = {}) {
  const P = new Array(33);
  const hipC = v(0, spec.hipY ?? 1.0, spec.hipZ ?? 0);
  const tp = (spec.torsoPitch || 0) * RAD, tr = (spec.torsoRoll || 0) * RAD;
  // gövde eksenleri
  const T = (p) => rotZ(rotX(p, -tp), -tr); // öne eğilme: yukarı vektör +z'ye doğru
  const up = T(v(0, 1, 0)), fwd = T(v(0, 0, 1)), left = T(v(1, 0, 0));
  const shC = add(hipC, mul(up, 0.5));
  const shrug = spec.shrug || 0;
  const sh = { L: add(add(shC, mul(left, 0.18)), mul(up, shrug + (spec.shrugL || 0))), R: add(add(shC, mul(left, -0.18)), mul(up, shrug + (spec.shrugR || 0))) };
  const hp = { L: add(hipC, mul(left, 0.1)), R: add(hipC, mul(left, -0.1)) };
  // baş (gövdeyle birlikte döner; omuz silkince yerinde kalır)
  const neck = add(shC, mul(up, 0.2));
  const hpitch = (spec.headPitch || 0) * RAD;
  const head = (x, y, z) => add(neck, add(add(mul(left, x), mul(up, y)), mul(fwd, z)));
  const hpt = (x, y, z) => { const q = rotX(v(x, y, z), hpitch); return head(q.x, q.y, q.z); };
  P[0] = hpt(0, 0.0, 0.11);
  P[1] = hpt(0.03, 0.04, 0.1); P[2] = hpt(0.04, 0.04, 0.1); P[3] = hpt(0.055, 0.04, 0.09);
  P[4] = hpt(-0.03, 0.04, 0.1); P[5] = hpt(-0.04, 0.04, 0.1); P[6] = hpt(-0.055, 0.04, 0.09);
  P[7] = hpt(0.08, 0.02, 0.0); P[8] = hpt(-0.08, 0.02, 0.0);
  P[9] = hpt(0.025, -0.04, 0.1); P[10] = hpt(-0.025, -0.04, 0.1);
  // kollar
  const idx = { L: { s: 11, e: 13, w: 15, pk: 17, ix: 19, th: 21 }, R: { s: 12, e: 14, w: 16, pk: 18, ix: 20, th: 22 } };
  for (const s of ['L', 'R']) {
    const a = spec.arms?.[s] || spec.arms?.both || {};
    const out = mul(left, s === 'L' ? 1 : -1);
    const down = mul(up, -1);
    let ud;
    if (a.dir) ud = norm(add(add(mul(out, a.dir[0]), mul(down, a.dir[1])), mul(fwd, a.dir[2])));
    else {
      const abd = (a.abd || 0) * RAD, fl = (a.flex || 0) * RAD;
      const dd = Math.cos(abd), oo = Math.sin(abd);
      ud = norm(add(add(mul(out, oo), mul(down, dd * Math.cos(fl))), mul(fwd, dd * Math.sin(fl))));
    }
    const E = add(sh[s], mul(ud, 0.3));
    const bendAxis = a.bend === 'up' ? up : a.bend === 'back' ? mul(fwd, -1) : a.bend === 'in' ? mul(out, -1) : fwd;
    let bd = add(bendAxis, mul(ud, -dot(bendAxis, ud)));
    if (Math.hypot(bd.x, bd.y, bd.z) < 1e-3) bd = add(up, mul(ud, -dot(up, ud)));
    bd = norm(bd);
    const th = (180 - (a.elbow ?? 175)) * RAD;
    const fd = norm(add(mul(ud, Math.cos(th)), mul(bd, Math.sin(th))));
    const W = add(E, mul(fd, 0.26));
    P[idx[s].s] = sh[s]; P[idx[s].e] = E; P[idx[s].w] = W;
    P[idx[s].pk] = add(W, mul(fd, 0.08)); P[idx[s].ix] = add(W, mul(fd, 0.09)); P[idx[s].th] = add(W, mul(fd, 0.05));
  }
  // bacaklar (gövdeden bağımsız, dünya dikine göre)
  const li = { L: { h: 23, k: 25, a: 27, he: 29, t: 31 }, R: { h: 24, k: 26, a: 28, he: 30, t: 32 } };
  for (const s of ['L', 'R']) {
    const g = spec.legs?.[s] || spec.legs?.both || {};
    const fl = (g.flex || 0) * RAD;
    const thighDir = v(0, -Math.cos(fl), Math.sin(fl));
    const side = s === 'L' ? 1 : -1;
    const Hh = v(hp[s].x * 0 + (s === 'L' ? 0.1 : -0.1), hipC.y, hipC.z);
    let K = add(Hh, mul(thighDir, 0.45));
    K = add(K, v(-side * (g.valgus || 0) + side * (g.spread || 0), 0, 0));
    const kn = (180 - (g.knee ?? 178)) * RAD;
    const shankDir = norm(v(0, -Math.cos(fl - kn), Math.sin(fl - kn)));
    const A = add(K, mul(shankDir, 0.43));
    const A2 = add(A, v(side * (g.spread || 0) * 0.5, 0, 0));
    const hr = (g.heel || 0) * RAD;
    const heel = add(A2, v(0, -0.06 + Math.sin(hr) * 0.0, -0.05));
    const toeDir = v(0, Math.sin(hr) * -1, Math.cos(hr));
    const toe = add(A2, add(v(0, -0.06, 0), mul(toeDir, 0.17)));
    const heel2 = add(toe, mul(toeDir, -0.23));
    P[li[s].h] = Hh; P[li[s].k] = K; P[li[s].a] = A2; P[li[s].he] = hr ? heel2 : heel; P[li[s].t] = toe;
  }
  // kökten döndürme (yatış vb.)
  if (spec.rootPitch) {
    const rp = spec.rootPitch * RAD;
    const piv = hipC;
    for (let i = 0; i < 33; i++) { const d = v(P[i].x - piv.x, P[i].y - piv.y, P[i].z - piv.z); const r = rotX(d, rp); P[i] = v(piv.x + r.x, piv.y + r.y, piv.z + r.z); }
  }
  return { P, hipC };
}

/**
 * Kameraya izdüşür. view: 'front' (kişi kameraya bakıyor) | 'side' (kamera kişinin solunda).
 * frame: {w,h,fw (metre olarak kadraj genişliği), cx, cy (kadraj merkezi, metre)}
 */
export function project(sk, { view = 'front', frame = {}, rng = mulberry(1), noise = 0.0015, hide = [], farVis = 0.6, yaw = 0 } = {}) {
  const { w = 1280, h = 720, fw = 4.2, cy = 1.05, cx = 0 } = frame;
  const fh = fw * h / w;
  const ya = yaw * Math.PI / 180;
  const lm = sk.P.map((p, i) => {
    let ix, depth;
    const px = p.x * Math.cos(ya) + p.z * Math.sin(ya), pz = -p.x * Math.sin(ya) + p.z * Math.cos(ya);
    if (view === 'front') { ix = px; depth = -pz; } else { ix = -pz; depth = -px; }
    const x = 0.5 + (ix - cx) / fw + randn(rng) * noise;
    const y = 0.5 + (cy - p.y) / fh + randn(rng) * noise * w / h;
    const z = (depth - 0) / fw + randn(rng) * noise * 8;
    let vis = 0.97;
    if (view === 'side') {
      const leftSide = [1, 2, 3, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31].includes(i);
      if (!leftSide && i !== 0) vis = farVis;
    }
    if (hide.includes(i)) vis = 0.05;
    return { x, y, z, visibility: vis, presence: 0.99 };
  });
  const world = sk.P.map((p) => ({ x: p.x, y: -(p.y - sk.hipC.y), z: -p.z }));
  return { landmarks: lm, world, width: w, height: h };
}

/** Bir hareket dizisi üret: önce bekleme (kalibrasyon), sonra tekrarlar. */
export function sequence({ specAt, reps = 3, repMs = 2200, idleMs = 1500, restMs = 400, fps = 30, view, frame, hide, noise, seed = 7, farVis, yaw }) {
  const rng = mulberry(seed);
  const frames = [];
  const dt = 1000 / fps;
  let t = 1000;
  const push = (phase, k) => {
    const sk = skeleton(specAt(phase, k));
    frames.push({ ...project(sk, { view, frame, rng, noise, hide: typeof hide === 'function' ? hide(phase, k) : hide, farVis, yaw }), t });
    t += dt;
  };
  for (let i = 0; i < idleMs / dt; i++) push(0, -1);
  for (let k = 0; k < reps; k++) {
    const n = Math.round(repMs / dt);
    for (let i = 0; i <= n; i++) push(0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n), k); // 0 → 1 → 0
    for (let i = 0; i < restMs / dt; i++) push(0, k);
  }
  return frames;
}

export const lerp = (a, b, u) => a + (b - a) * u;
