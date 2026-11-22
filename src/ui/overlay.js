// Vücut çizimi: kişinin üzerine 3 boyutlu görünen bir "beden" kaplaması çizer.
// Yalnız KENAR ÇİZGİLERİ (içi boş): kollar/bacaklar kesit halkalı silindir, gövde kontur, baş ve eklemler küre.
// Kameraya yakın uzuvlar öne çizilir. Hatalı kuralların ilgili bölgeleri kırmızı/turuncu yanar.
// NOT: yalnızca GÖRÜNÜM — analiz ve ölçüm kodu bu dosyayı kullanmaz.
import { SIDE } from '../core/landmarks.js';

const MEASURE_PARTS = {
  elbowAngle: ['elbow'], armFlex: ['shoulder', 'elbow'], armAbd: ['shoulder', 'elbow'], armElev: ['shoulder', 'elbow'],
  armPlane: ['elbow'], shrug: ['shoulder', 'ear'], shrugX: ['shoulder', 'ear'], shrugP: ['shoulder', 'ear'], elbowSpread: ['elbow'], torsoLenRatio: ['shoulder', 'hip'], sideLean: ['shoulder', 'hip'], armFrontalDev: ['elbow'], torsoPitch: ['shoulder', 'hip'], torsoLean: ['shoulder', 'hip'],
  torsoRoll: ['shoulder', 'hip'], torsoFromVertical: ['shoulder', 'hip'], forearmTilt: ['elbow', 'wrist'],
  wristOverElbow: ['wrist'], elbowDrop: ['elbow'], wristDrop: ['wrist'], elbowOut: ['elbow'], wristSpread: ['wrist'],
  bodyLine: ['hip'], kneeValgus: ['knee'], kneeSpreadRatio: ['knee'], stanceWidth: ['ankle'], footLevel: ['ankle'],
  kneeOverToe: ['knee', 'toe'], footAngle: ['heel'], heelRise: ['heel'], shoulderForward: ['shoulder'],
  chinOverHands: ['wrist'], kneeSwing: ['knee'], hipLift: ['hip'], hipShift: ['hip'], barDistance: ['wrist'],
  neckFlex: ['ear'], kneeAngle: ['knee'], hipAngle: ['hip'], wristLevel: ['wrist'], armElevDiff: ['elbow'],
  backKnee: ['knee'], frontKneeOverToe: ['knee'], thighTilt: ['hip', 'knee'], thighExt: ['knee'],
  elbowUnderShoulder: ['elbow'], headHeight: ['ear'], wristAnt: ['wrist'], footAhead: ['ankle'], armsEarly: ['elbow'],
  armVertTilt: ['shoulder', 'wrist'],
};

// renkler (yalnız kenar çizgisi; içi boş — vücut görünür kalır)
const COLOR = { ok: '#3ee07f', warn: '#ff9f0a', bad: '#ff3b30' };

// uzuvlar: [başlangıç, bitiş, başlangıç yarıçapı, bitiş yarıçapı] (yarıçap üst kol boyunun oranı)
const LIMBS = [
  [11, 13, 0.2, 0.16], [13, 15, 0.16, 0.12], [12, 14, 0.2, 0.16], [14, 16, 0.16, 0.12], // kollar
  [23, 25, 0.28, 0.2], [25, 27, 0.2, 0.14], [24, 26, 0.28, 0.2], [26, 28, 0.2, 0.14], // bacaklar
  [15, 19, 0.11, 0.08], [16, 20, 0.11, 0.08], // eller
  [27, 31, 0.12, 0.09], [28, 32, 0.12, 0.09], // ayaklar
];

const ok = (p) => p && p.v >= 0.5;

export function drawPose(ctx, pose, snap, def) {
  const { canvas } = ctx;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!pose) return;
  const pts = pose.pts;

  // hatalı bölgeler (eklem indeksi → 'bad' | 'warn')
  const hot = new Map();
  if (snap?.rules && def) {
    for (const r of snap.rules) {
      if (r.status !== 'bad' && r.status !== 'warn') continue;
      const rule = def.rules.find((x) => x.id === r.id);
      const parts = MEASURE_PARTS[typeof rule?.measure === 'string' ? rule.measure : ''] || [];
      const sides = r.side ? [r.side] : ['L', 'R'];
      for (const s of sides) for (const p of parts) {
        const i = SIDE[s][p];
        if (i !== undefined && hot.get(i) !== 'bad') hot.set(i, r.status);
      }
    }
  }
  const stateOf = (...ids) => (ids.some((i) => hot.get(i) === 'bad') ? 'bad' : ids.some((i) => hot.get(i) === 'warn') ? 'warn' : 'ok');

  // ölçek: üst kol boyu (yoksa omuz genişliği / tuval)
  let ua = pose.scale?.();
  if (!Number.isFinite(ua) || ua < 10) {
    const a = pts[11], b = pts[12];
    ua = ok(a) && ok(b) ? Math.hypot(a.x - b.x, a.y - b.y) * 0.8 : canvas.width / 12;
  }

  const lw = Math.max(1.5, Math.min(3, ua * 0.025)); // çizgi kalınlığı

  // çizilecek parçalar (derinliğe göre sıralanır: uzak → yakın)
  const items = [];
  for (const [a, b, ra, rb] of LIMBS) {
    const A = pts[a], B = pts[b];
    if (!ok(A) || !ok(B)) continue;
    items.push({ z: (A.z + B.z) / 2, draw: () => capsule(ctx, A, B, ra * ua, rb * ua, stateOf(a, b), lw) });
  }
  // gövde: kalça hatalıysa ya da iki omuz birden hatalıysa (ör. salınım, silkme) yanar; tek kol hatası gövdeyi boyamaz
  const both = (a, b) => (hot.get(a) && hot.get(b) ? (hot.get(a) === 'bad' || hot.get(b) === 'bad' ? 'bad' : 'warn') : 'ok');
  const hs = stateOf(23, 24), ss = both(11, 12);
  const torsoState = hs === 'bad' || ss === 'bad' ? 'bad' : hs === 'warn' || ss === 'warn' ? 'warn' : 'ok';
  const ls = pts[11], rs = pts[12], lh = pts[23], rh = pts[24];
  if (ok(ls) && ok(rs)) {
    const hips = ok(lh) && ok(rh) ? [lh, rh] : null;
    items.push({ z: (ls.z + rs.z) / 2 + ua * 0.4, draw: () => torso(ctx, ls, rs, hips, ua, torsoState, lw) });
  }
  // baş + boyun
  const head = headCenter(pts, ua);
  if (head && ok(ls) && ok(rs)) {
    const neck = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2, z: (ls.z + rs.z) / 2 };
    items.push({ z: head.z - 1, draw: () => {
      const st = stateOf(7, 8);
      capsule(ctx, neck, { x: head.x, y: head.y + head.r * 0.85, z: head.z }, ua * 0.16, ua * 0.14, st, lw);
      sphere(ctx, head.x, head.y, head.r, st, lw);
    } });
  }
  items.sort((p, q) => q.z - p.z); // MediaPipe: küçük z = kameraya yakın → büyük z önce (arkada) çizilir
  for (const it of items) it.draw();

  // eklem halkaları (hatalı olanlar kalın ve büyük)
  for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    const p = pts[i];
    if (!ok(p)) continue;
    const st = hot.get(i) || 'ok';
    const r = ua * (st === 'ok' ? 0.1 : 0.15) * (i >= 23 ? 1.15 : 1);
    sphere(ctx, p.x, p.y, r, st, lw * 0.8, false);
  }
}

/** Yalnız kenar çizgisi: önce koyu gölge (her arka planda okunsun), üstüne renkli ince çizgi. İçi boş. */
function outline(ctx, st, w, hotK = 1) {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = w * hotK + 2;
  ctx.stroke();
  ctx.strokeStyle = COLOR[st];
  ctx.lineWidth = w * hotK;
  ctx.stroke();
  ctx.restore();
}

/** Konik silindir (kapsül) kenarı + iki uçta kesit halkası (3B hissi). */
function capsule(ctx, A, B, ra, rb, st, w) {
  const dx = B.x - A.x, dy = B.y - A.y;
  const L = Math.hypot(dx, dy);
  const hk = st === 'ok' ? 1 : 1.6;
  if (L < 1) { ctx.beginPath(); ctx.arc(A.x, A.y, ra, 0, Math.PI * 2); outline(ctx, st, w, hk); return; }
  const ang = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.arc(A.x, A.y, ra, ang + Math.PI / 2, ang - Math.PI / 2);
  ctx.arc(B.x, B.y, rb, ang - Math.PI / 2, ang + Math.PI / 2);
  ctx.closePath();
  outline(ctx, st, w, hk);
  // kesit halkaları: uzuv ekseni boyunca basık elipsler (yalnız ön yarısı)
  if (L > (ra + rb) * 1.2) {
    for (const u of [0.25, 0.7]) {
      const cx = A.x + dx * u, cy = A.y + dy * u, r = ra + (rb - ra) * u;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.28, r, ang, -Math.PI / 2, Math.PI / 2);
      outline(ctx, st, w * 0.55, hk);
    }
  }
}

/** Gövde: omuz ve kalçalardan yuvarlak hatlı kontur. */
function torso(ctx, ls, rs, hips, ua, st, w) {
  const sx = (ls.x + rs.x) / 2, sy = (ls.y + rs.y) / 2;
  let lh, rh;
  if (hips) [lh, rh] = hips;
  else {
    const down = ua * 1.6;
    lh = { x: ls.x * 0.85 + sx * 0.15, y: ls.y + down }; rh = { x: rs.x * 0.85 + sx * 0.15, y: rs.y + down };
  }
  const hx = (lh.x + rh.x) / 2, hy = (lh.y + rh.y) / 2;
  const ax = hx - sx, ay = hy - sy, aL = Math.hypot(ax, ay) || 1;
  const px = -ay / aL, py = ax / aL;
  const halfS = Math.max(Math.hypot(ls.x - rs.x, ls.y - rs.y) / 2 + ua * 0.15, ua * 0.45);
  const halfH = Math.max(Math.hypot(lh.x - rh.x, lh.y - rh.y) / 2 + ua * 0.15, ua * 0.4);
  const P = (cx, cy, h) => [cx + px * h, cy + py * h];
  const s1 = P(sx, sy, halfS), s2 = P(sx, sy, -halfS), h1 = P(hx, hy, halfH), h2 = P(hx, hy, -halfH);
  const wm = (halfS + halfH) / 2 * 0.9;
  const w1 = P(sx + ax * 0.55, sy + ay * 0.55, wm), w2 = P(sx + ax * 0.55, sy + ay * 0.55, -wm);
  const hk = st === 'ok' ? 1 : 1.6;
  ctx.beginPath();
  ctx.moveTo(...s1);
  ctx.quadraticCurveTo(sx - ax * 0.12, sy - ay * 0.12, ...s2);
  ctx.quadraticCurveTo(...w2, ...h2);
  ctx.quadraticCurveTo(hx + ax * 0.1, hy + ay * 0.1, ...h1);
  ctx.quadraticCurveTo(...w1, ...s1);
  ctx.closePath();
  outline(ctx, st, w, hk);
  // bel kesiti (3B hissi)
  ctx.beginPath();
  ctx.ellipse(sx + ax * 0.55, sy + ay * 0.55, wm, wm * 0.22, Math.atan2(py, px), 0, Math.PI);
  outline(ctx, st, w * 0.55, hk);
}

/** Küre kenarı + ekvator halkası. */
function sphere(ctx, x, y, r, st, w, ring = true) {
  const hk = st === 'ok' ? 1 : 1.6;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  outline(ctx, st, w, hk);
  if (ring) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.3, 0, 0, Math.PI); outline(ctx, st, w * 0.55, hk); }
}

/** Baş merkezi ve yarıçapı: kulaklar → gözler → burun yedekli. */
function headCenter(pts, ua) {
  const ears = [pts[7], pts[8]].filter(ok);
  const eyes = [pts[2], pts[5]].filter(ok);
  const nose = ok(pts[0]) ? pts[0] : null;
  const ref = ears.length ? ears : eyes.length ? eyes : nose ? [nose] : [];
  if (!ref.length) return null;
  const cx = ref.reduce((a, p) => a + p.x, 0) / ref.length;
  const cy = ref.reduce((a, p) => a + p.y, 0) / ref.length;
  const cz = ref.reduce((a, p) => a + p.z, 0) / ref.length;
  let r;
  if (ears.length === 2) r = Math.hypot(ears[0].x - ears[1].x, ears[0].y - ears[1].y) * 0.62;
  else if (ears.length === 1 && nose) r = Math.hypot(ears[0].x - nose.x, ears[0].y - nose.y) * 0.75;
  else if (eyes.length === 2) r = Math.hypot(eyes[0].x - eyes[1].x, eyes[0].y - eyes[1].y) * 1.4;
  else r = 20;
  // kafa merkezi kulak hizasından biraz yukarıda
  // yandan iki kulak üst üste düşer → yarıçap vücut ölçeğiyle sınırlanır
  r = Math.min(Math.max(r, ua * 0.42), ua * 0.75);
  return { x: cx, y: cy - r * 0.15, z: cz, r };
}
