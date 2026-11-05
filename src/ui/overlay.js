// İskelet çizimi. Hatalı kuralların ilgili eklemleri kırmızı/turuncu yanar.
import { CONNECTIONS, SIDE } from '../core/landmarks.js';

const MEASURE_PARTS = {
  elbowAngle: ['elbow'], armFlex: ['shoulder', 'elbow'], armAbd: ['shoulder', 'elbow'], armElev: ['shoulder', 'elbow'],
  armPlane: ['elbow'], shrug: ['shoulder', 'ear'], shrugX: ['shoulder', 'ear'], elbowSpread: ['elbow'], torsoLenRatio: ['shoulder', 'hip'], sideLean: ['shoulder', 'hip'], armFrontalDev: ['elbow'], torsoPitch: ['shoulder', 'hip'], torsoLean: ['shoulder', 'hip'],
  torsoRoll: ['shoulder', 'hip'], torsoFromVertical: ['shoulder', 'hip'], forearmTilt: ['elbow', 'wrist'],
  wristOverElbow: ['wrist'], elbowDrop: ['elbow'], wristDrop: ['wrist'], elbowOut: ['elbow'], wristSpread: ['wrist'],
  bodyLine: ['hip'], kneeValgus: ['knee'], kneeSpreadRatio: ['knee'], stanceWidth: ['ankle'], footLevel: ['ankle'],
  kneeOverToe: ['knee', 'toe'], footAngle: ['heel'], heelRise: ['heel'], shoulderForward: ['shoulder'],
  chinOverHands: ['wrist'], kneeSwing: ['knee'], hipLift: ['hip'], hipShift: ['hip'], barDistance: ['wrist'],
  neckFlex: ['ear'], kneeAngle: ['knee'], hipAngle: ['hip'], wristLevel: ['wrist'], armElevDiff: ['elbow'],
  backKnee: ['knee'], frontKneeOverToe: ['knee'], thighTilt: ['hip', 'knee'], thighExt: ['knee'],
  elbowUnderShoulder: ['elbow'], headHeight: ['ear'], wristAnt: ['wrist'], footAhead: ['ankle'], armsEarly: ['elbow'],
};

export function drawPose(ctx, pose, snap, def) {
  const { canvas } = ctx;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!pose) return;
  const pts = pose.pts;
  const lw = Math.max(2, canvas.width / 320);
  // hatalı eklemler
  const hot = new Map();
  if (snap?.rules && def) {
    for (const r of snap.rules) {
      if (r.status !== 'bad' && r.status !== 'warn') continue;
      const rule = def.rules.find((x) => x.id === r.id);
      const parts = MEASURE_PARTS[rule?.measure] || [];
      const sides = r.side ? [r.side] : ['L', 'R'];
      for (const s of sides) for (const p of parts) {
        const i = SIDE[s][p];
        if (i !== undefined && (hot.get(i) !== 'bad')) hot.set(i, r.status);
      }
    }
  }
  ctx.lineCap = 'round';
  for (const [a, b] of CONNECTIONS) {
    const A = pts[a], B = pts[b];
    if (!A || !B || A.v < 0.5 || B.v < 0.5) continue;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = lw * 1.6;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
  }
  pts.forEach((p, i) => {
    if (!p || p.v < 0.5 || (i > 0 && i < 11 && ![0, 2, 5, 7, 8].includes(i))) return;
    const st = hot.get(i);
    ctx.fillStyle = st === 'bad' ? '#ff3b30' : st === 'warn' ? '#ff9f0a' : '#30d158';
    const r = (st ? 2.4 : 1.4) * lw * 1.6;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  });
}
