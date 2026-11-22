// Vücut çizimi: kişinin üzerine 3 boyutlu görünen bir "beden" kaplaması çizer.
// Kollar/bacaklar ışıklandırılmış silindir (kapsül), gövde gölgeli yüzey, baş ve eklemler küre.
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

// renkler: [açık, orta, koyu] — silindir gölgelemesi için
const PALETTE = {
  ok: ['#9ff0c0', '#30c26a', '#0d5a32'],
  warn: ['#ffd89a', '#ff9f0a', '#7a4300'],
  bad: ['#ffb1aa', '#ff3b30', '#7a0d07'],
};
const ALPHA = 0.62;

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

  // çizilecek parçalar (derinliğe göre sıralanır: uzak → yakın)
  const items = [];
  for (const [a, b, ra, rb] of LIMBS) {
    const A = pts[a], B = pts[b];
    if (!ok(A) || !ok(B)) continue;
    items.push({ z: (A.z + B.z) / 2, draw: () => capsule(ctx, A, B, ra * ua, rb * ua, stateOf(a, b)) });
  }
  // gövde: kalça hatalıysa ya da iki omuz birden hatalıysa (ör. salınım, silkme) yanar; tek kol hatası gövdeyi boyamaz
  const both = (a, b) => (hot.get(a) && hot.get(b) ? (hot.get(a) === 'bad' || hot.get(b) === 'bad' ? 'bad' : 'warn') : 'ok');
  const hs = stateOf(23, 24), ss = both(11, 12);
  const torsoState = hs === 'bad' || ss === 'bad' ? 'bad' : hs === 'warn' || ss === 'warn' ? 'warn' : 'ok';
  const ls = pts[11], rs = pts[12], lh = pts[23], rh = pts[24];
  if (ok(ls) && ok(rs)) {
    const hips = ok(lh) && ok(rh) ? [lh, rh] : null;
    items.push({ z: (ls.z + rs.z) / 2 + ua * 0.4, draw: () => torso(ctx, ls, rs, hips, ua, torsoState) });
  }
  // baş + boyun
  const head = headCenter(pts, ua);
  if (head && ok(ls) && ok(rs)) {
    const neck = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2, z: (ls.z + rs.z) / 2 };
    items.push({ z: head.z - 1, draw: () => {
      const st = stateOf(7, 8);
      capsule(ctx, neck, { x: head.x, y: head.y + head.r * 0.6, z: head.z }, ua * 0.16, ua * 0.14, st);
      sphere(ctx, head.x, head.y, head.r, st, 1);
    } });
  }
  items.sort((p, q) => q.z - p.z); // MediaPipe: küçük z = kameraya yakın → büyük z önce (arkada) çizilir
  for (const it of items) it.draw();

  // eklem küreleri (hatalı olanlar parlak ve büyük)
  for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    const p = pts[i];
    if (!ok(p)) continue;
    const st = hot.get(i) || 'ok';
    const r = ua * (st === 'ok' ? 0.13 : 0.19) * (i >= 23 ? 1.15 : 1);
    if (st !== 'ok') glow(ctx, p.x, p.y, r * 2.2, st);
    sphere(ctx, p.x, p.y, r, st, 0.9);
  }
}

/** İki uç yarıçaplı kapsül (konik silindir), eksene dik gradyanla gölgelenir. */
function capsule(ctx, A, B, ra, rb, st) {
  const dx = B.x - A.x, dy = B.y - A.y;
  const L = Math.hypot(dx, dy);
  const [hi, mid, lo] = PALETTE[st];
  ctx.save();
  ctx.globalAlpha = ALPHA;
  if (L < 1) { sphere(ctx, A.x, A.y, ra, st, 1); ctx.restore(); return; }
  const nx = -dy / L, ny = dx / L; // dik yön
  const ang = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.arc(A.x, A.y, ra, ang + Math.PI / 2, ang - Math.PI / 2);
  ctx.arc(B.x, B.y, rb, ang - Math.PI / 2, ang + Math.PI / 2);
  ctx.closePath();
  const rm = Math.max(ra, rb);
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
  const g = ctx.createLinearGradient(mx - nx * rm, my - ny * rm, mx + nx * rm, my + ny * rm);
  g.addColorStop(0, lo);
  g.addColorStop(0.3, mid);
  g.addColorStop(0.45, hi);
  g.addColorStop(0.7, mid);
  g.addColorStop(1, lo);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.globalAlpha = ALPHA * 0.8;
  ctx.lineWidth = Math.max(1, rm * 0.08);
  ctx.strokeStyle = lo;
  ctx.stroke();
  ctx.restore();
}

/** Gövde: omuz ve kalçalardan genişletilmiş yuvarlak hatlı yüzey, ışıklı merkez. */
function torso(ctx, ls, rs, hips, ua, st) {
  const [hi, mid, lo] = PALETTE[st];
  const sx = (ls.x + rs.x) / 2, sy = (ls.y + rs.y) / 2;
  let lh, rh;
  if (hips) [lh, rh] = hips;
  else {
    // kalça görünmüyorsa: omuzlardan aşağı tahmini gövde (dik varsayım)
    const down = ua * 1.6;
    lh = { x: ls.x * 0.85 + sx * 0.15, y: ls.y + down }; rh = { x: rs.x * 0.85 + sx * 0.15, y: rs.y + down };
  }
  const hx = (lh.x + rh.x) / 2, hy = (lh.y + rh.y) / 2;
  // gövde ekseni ve genişlik (yandan bakışta omuz genişliği küçülür → en az bir gövde kalınlığı)
  const ax = hx - sx, ay = hy - sy, aL = Math.hypot(ax, ay) || 1;
  const px = -ay / aL, py = ax / aL;
  const halfS = Math.max(Math.hypot(ls.x - rs.x, ls.y - rs.y) / 2 + ua * 0.15, ua * 0.45);
  const halfH = Math.max(Math.hypot(lh.x - rh.x, lh.y - rh.y) / 2 + ua * 0.15, ua * 0.4);
  const P = (cx, cy, h, k = 1) => [cx + px * h * k, cy + py * h * k];
  const s1 = P(sx, sy, halfS), s2 = P(sx, sy, -halfS), h1 = P(hx, hy, halfH), h2 = P(hx, hy, -halfH);
  const w1 = P(sx + ax * 0.55, sy + ay * 0.55, (halfS + halfH) / 2 * 0.9), w2 = P(sx + ax * 0.55, sy + ay * 0.55, -(halfS + halfH) / 2 * 0.9);
  ctx.save();
  ctx.globalAlpha = ALPHA * 0.9;
  ctx.beginPath();
  ctx.moveTo(...s1);
  ctx.quadraticCurveTo(sx - ax * 0.12, sy - ay * 0.12, ...s2); // omuz hattı (hafif kavisli)
  ctx.quadraticCurveTo(...w2, ...h2);
  ctx.quadraticCurveTo(hx + ax * 0.1, hy + ay * 0.1, ...h1);
  ctx.quadraticCurveTo(...w1, ...s1);
  ctx.closePath();
  const g = ctx.createRadialGradient(sx + ax * 0.35, sy + ay * 0.35, ua * 0.1, sx + ax * 0.45, sy + ay * 0.45, Math.max(aL, halfS * 1.6) * 0.9);
  g.addColorStop(0, hi);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, lo);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(1, ua * 0.03);
  ctx.strokeStyle = lo;
  ctx.stroke();
  ctx.restore();
}

/** Işık sol üstten gelen küre. */
function sphere(ctx, x, y, r, st, alphaK = 1) {
  const [hi, mid, lo] = PALETTE[st];
  ctx.save();
  ctx.globalAlpha = Math.min(1, ALPHA * 1.25 * alphaK);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.25, hi);
  g.addColorStop(0.65, mid);
  g.addColorStop(1, lo);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Hatalı bölge için dışa doğru parlama. */
function glow(ctx, x, y, r, st) {
  const c = st === 'bad' ? '255,59,48' : '255,159,10';
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${c},0.55)`);
  g.addColorStop(1, `rgba(${c},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
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
