// Basit vektör matematiği. 2B noktalar {x,y}, 3B noktalar {x,y,z} (piksel ölçeğinde).
export const RAD = Math.PI / 180;
export const DEG = 180 / Math.PI;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: (a.z ?? 0) + (b.z ?? 0) });
export const mul = (a, k) => ({ x: a.x * k, y: a.y * k, z: (a.z ?? 0) * k });
export const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: ((a.z ?? 0) + (b.z ?? 0)) / 2 });
export const avgPts = (pts) => {
  const n = pts.length;
  if (!n) return null;
  const s = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + (p.z ?? 0) }), { x: 0, y: 0, z: 0 });
  return { x: s.x / n, y: s.y / n, z: s.z / n };
};

export const dot2 = (a, b) => a.x * b.x + a.y * b.y;
export const cross2 = (a, b) => a.x * b.y - a.y * b.x;
export const len2 = (a) => Math.hypot(a.x, a.y);
export const norm2 = (a) => {
  const l = len2(a);
  return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
};
export const perp2 = (a) => ({ x: -a.y, y: a.x });

export const dot3 = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const len3 = (a) => Math.hypot(a.x, a.y, a.z);

/** İki vektör arasındaki açı (derece, 0..180). */
export function angle2(u, v) {
  const l = len2(u) * len2(v);
  if (l < 1e-9) return NaN;
  return Math.acos(clamp(dot2(u, v) / l, -1, 1)) * DEG;
}
export function angle3(u, v) {
  const l = len3(u) * len3(v);
  if (l < 1e-9) return NaN;
  return Math.acos(clamp(dot3(u, v) / l, -1, 1)) * DEG;
}
/** u'dan v'ye işaretli açı (derece, -180..180), görüntü koordinatında. */
export function signedAngle2(u, v) {
  return Math.atan2(cross2(u, v), dot2(u, v)) * DEG;
}
/** a-b-c eklem açısı (b tepe noktası), 2B. */
export function jointAngle2(a, b, c) {
  return angle2(sub(a, b), sub(c, b));
}

export function median(arr) {
  const a = arr.filter((v) => Number.isFinite(v)).sort((x, y) => x - y);
  if (!a.length) return NaN;
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
export function percentile(arr, q) {
  const a = arr.filter((v) => Number.isFinite(v)).sort((x, y) => x - y);
  if (!a.length) return NaN;
  const i = clamp(Math.round((a.length - 1) * q), 0, a.length - 1);
  return a[i];
}
