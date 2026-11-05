// Kalıcı vücut ölçümü ("vücut profili"). Kullanıcı bir kez kameraya dönük, dik, kollar yanda ve
// omuzlar RAHAT dururken alınır ve kaydedilir. Omuz silkme her harekette bu doğal duruşa göre ölçülür:
// set başında omuz zaten kalkık olsa bile sistem bunu "normal" sanmaz.
//
// Birim: üst kol boyu (UA). Kamera uzaklığından bağımsız olsun diye her mesafe UA'ya bölünür; çalışırken
// UA o anki görüntüden en güvenilir yolla tahmin edilir (önden omuz genişliği → gövde boyu → kol boyu).
import { LM } from './landmarks.js';
import { median, len2, sub, mid } from './geometry.js';

const NEED_MS = 1500;

export class ProfileCapture {
  constructor() { this.frames = []; }

  /** Her karede çağrılır. {done, profile?, message, progress} döndürür. */
  update(P) {
    const fail = (message) => { this.frames = []; return { done: false, message, progress: 0 }; };
    if (P.view !== 'front') return fail('Vücut ölçümü: kameraya tam karşıdan dön');
    const ls = P.get('L', 'shoulder'), rs = P.get('R', 'shoulder');
    if (!ls || !rs) return fail('Vücut ölçümü: iki omuz da görünmeli');
    const hp = P.headShoulderPx();
    if (!hp || !hp.sides.L || !hp.sides.R || !Object.keys(hp.sides.L).length) return fail('Vücut ölçümü: yüzün (kulak/göz/burun) görünmeli');
    const aL = P.arm('L'), aR = P.arm('R');
    if (!aL || !aR || aL.elev > 25 || aR.elev > 25) return fail('Vücut ölçümü: kolların yanda, aşağıda dursun');
    const ua = P.scale();
    if (!Number.isFinite(ua)) return fail('Vücut ölçümü: kolların görünmeli');
    const sw = len2(sub(ls, rs));
    const f = { t: P.t, hp, ua, sw, sy: mid(ls, rs).y };
    this.frames.push(f);
    while (this.frames.length && P.t - this.frames[0].t > NEED_MS + 300) this.frames.shift();
    // sabitlik: omuz yüksekliği ~1 cm'den fazla oynamasın
    const ys = this.frames.map((x) => x.sy);
    if (Math.max(...ys) - Math.min(...ys) > 0.06 * ua) { this.frames = [f]; return { done: false, message: 'Vücut ölçümü: sabit dur, omuzların rahat', progress: 0 }; }
    const span = P.t - this.frames[0].t;
    if (span < NEED_MS) return { done: false, message: 'Vücut ölçümü: dik dur, omuzların rahat ve aşağıda… ', progress: span / NEED_MS };
    return { done: true, profile: buildProfile(this.frames), message: 'Vücut ölçümü kaydedildi', progress: 1 };
  }
}

export function buildProfile(frames) {
  const ua = median(frames.map((f) => f.ua));
  const prof = { v: 1, t: Date.now(), ua, swUA: median(frames.map((f) => f.sw)) / ua, sides: {}, mean: {} };
  const tl = frames.map((f) => f.hp.torsoLen).filter(Number.isFinite);
  prof.torsoUA = tl.length > frames.length * 0.6 ? median(tl) / ua : NaN;
  for (const s of ['L', 'R']) {
    prof.sides[s] = {};
    for (const n of ['kulak', 'göz', 'ağız', 'burun']) {
      const vals = frames.map((f) => f.hp.sides[s]?.[n]).filter(Number.isFinite);
      if (vals.length > frames.length * 0.5) prof.sides[s][n] = median(vals) / ua;
    }
  }
  for (const n of ['kulak', 'göz', 'ağız', 'burun']) {
    const v = ['L', 'R'].map((s) => prof.sides[s][n]).filter(Number.isFinite);
    if (v.length) prof.mean[n] = v.reduce((a, b) => a + b, 0) / v.length;
  }
  return prof;
}

/**
 * O anki görüntüden üst kol boyu (px) tahmini, profildeki oranlarla. Önden: omuz genişliği (silkmeden
 * etkilenmez); yoksa gövde boyu; yoksa kol boyu (kayan maksimum).
 */
export function estimateUA(P, prof) {
  if (P.view === 'front') {
    const ls = P.get('L', 'shoulder'), rs = P.get('R', 'shoulder');
    if (ls && rs && prof.swUA > 0) return { ua: len2(sub(ls, rs)) / prof.swUA, src: 'omuz genişliği' };
  }
  const hp = P.headShoulderPx();
  if (hp && Number.isFinite(hp.torsoLen) && prof.torsoUA > 0) return { ua: hp.torsoLen / prof.torsoUA, src: 'gövde boyu' };
  const sc = P.scale();
  return Number.isFinite(sc) ? { ua: sc, src: 'kol boyu' } : null;
}

/** Profile göre omuz silkme (UA birimi, + = omuz doğal duruşundan yukarıda). */
export function profileShrug(P, prof, s) {
  if (!prof) return null;
  const hp = P.headShoulderPx();
  if (!hp || !hp.sides[s]) return null;
  const est = estimateUA(P, prof);
  if (!est) return null;
  const base = P.view === 'front' ? prof.sides[s] : prof.mean;
  const vals = [];
  for (const n of ['kulak', 'göz', 'ağız', 'burun']) {
    const c = hp.sides[s][n], b = base?.[n];
    if (Number.isFinite(c) && Number.isFinite(b) && b > 0.1) vals.push({ name: n, v: b - c / est.ua });
  }
  if (!vals.length) return null;
  const [p1, p2] = vals;
  let conf = p1.name === 'burun' ? 0.6 : 0.88;
  if (p2 && Math.abs(p1.v - p2.v) > 0.08) conf *= 0.75;
  return { v: p1.v, conf, src: `vücut ölçümüne göre omuz–${p1.name}${p2 ? ` (+${p2.name})` : ''} · ${est.src}` };
}

const KEY = 'fa.profile';
export function loadProfile() {
  try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); return p && p.v === 1 ? p : null; } catch { return null; }
}
export function saveProfile(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* yok */ } }
export function clearProfile() { try { localStorage.removeItem(KEY); } catch { /* yok */ } }
export { LM };
