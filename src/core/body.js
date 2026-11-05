// Vücut modeli: MediaPipe noktalarından güvenilir ölçümler çıkarır.
//
// Temel ilkeler (önceki denemede yaşanan hatalara karşı):
// 1) MediaPipe'ın z (derinlik) değeri gürültülüdür. Derinlik yönündeki açıları z'den DEĞİL,
//    segmentin ekranda kısalmasından (Taylor yöntemi) hesaplıyoruz: bir kemiğin gerçek boyu
//    (kayan pencere maksimumu) biliniyorsa, ekrandaki boyu kısaldıkça kamera eksenine dönmüştür.
//    z yalnızca YÖN işareti (öne mi arkaya mı) için kullanılır.
// 2) Hiçbir ölçüm tek noktaya bağlı değil. Her ölçüm bir yedek zinciriyle hesaplanır
//    (ör. kulak → göz → ağız → burun; kalça → omuz hattı → yerçekimi) ve hangi kaynağı
//    kullandığını (src) ve güvenini (conf) döndürür. Düşük güvenli ölçüm tekrarı reddedemez.
// 3) Kameranın gördüğü düzlemdeki ölçümler (önden: yana açılma, yandan: öne-arkaya) 2B ile
//    yüksek güvenle, derinlik düzlemindeki ölçümler düşük güvenle değerlendirilir.
import { LM, SIDE } from './landmarks.js';
import { LandmarkSmoother } from './filter.js';
import {
  DEG, clamp, sub, mid, avgPts, dot2, len2, norm2, perp2, dot3, len3, angle2, angle3,
  jointAngle2, percentile,
} from './geometry.js';

export const VIS = 0.55; // bir noktayı "görünür" saymak için eşik
const REF_WINDOW_MS = 10000;
const REF_SHRINK = 0.96; // kayan maksimumdaki titreşim payı

export class BodyTracker {
  constructor() {
    this.smoother = new LandmarkSmoother({ minCutoff: 1.4, beta: 0.012 });
    this.worldSmoother = new LandmarkSmoother({ minCutoff: 1.0, beta: 0.5 });
    this.reset();
  }
  reset() {
    this.smoother.reset();
    this.worldSmoother.reset();
    this.refs = new Map();
    this.signs = new Map();
    this.viewHist = [];
    this.view = 'unknown';
    this.nearSide = null;
    this.anterior = null; // yandan çekimde göğsün baktığı yön (2B birim vektör)
    this.activeSide = null;
  }

  /**
   * Derinlik yönü (öne/arkaya) — z gürültülü olduğu için kalıcı: yön ancak z farkı belirgin ve
   * ~200 ms boyunca tutarlıysa değişir. Belirsizken hareketin olağan yönü (prior) kullanılır.
   */
  depthSign(key, dz, ref, prior, t) {
    let s = this.signs.get(key);
    if (!s) { s = { sign: prior, cand: 0, since: t }; this.signs.set(key, s); }
    const strong = Math.abs(dz) > 0.3 * ref;
    const c = strong ? Math.sign(dz) : 0;
    if (c && c !== s.sign) {
      if (s.cand !== c) { s.cand = c; s.since = t; }
      if (t - s.since >= 200) { s.sign = c; s.cand = 0; }
    } else s.cand = 0;
    return s.sign;
  }

  /** Segment boyu örneği ekle ve gerçek boy tahminini döndür. */
  refLen(key, len, t) {
    let r = this.refs.get(key);
    if (!r) { r = []; this.refs.set(key, r); }
    if (Number.isFinite(len) && len > 1) {
      r.push({ t, len });
      while (r.length && t - r[0].t > REF_WINDOW_MS) r.shift();
    }
    if (!r.length) return NaN;
    return percentile(r.map((s) => s.len), 0.95);
  }

  /**
   * @param {{landmarks:Array, world?:Array, width:number, height:number, t:number, posture?:string}} input
   */
  process(input) {
    const { landmarks, world, width: w, height: h, t } = input;
    const raw = landmarks.map((p) => {
      let v = Math.min(p.visibility ?? 1, p.presence ?? 1);
      if (p.x < -0.01 || p.x > 1.01 || p.y < -0.01 || p.y > 1.01) v *= 0.25; // kadraj dışı tahmin
      return { x: p.x * w, y: p.y * h, z: p.z * w, v };
    });
    const pts = this.smoother.apply(raw, t);
    let wpts = null;
    if (world && world.length === 33) {
      wpts = this.worldSmoother.apply(world.map((p, i) => ({ x: p.x, y: p.y, z: p.z, v: raw[i].v })), t);
    }
    this.allSides = !!input.allSides;
    return new Pose(this, pts, wpts, w, h, t, input.posture || 'upright');
  }
}

export class Pose {
  constructor(tracker, pts, world, w, h, t, posture) {
    this.tr = tracker; this.pts = pts; this.world = world; this.w = w; this.h = h; this.t = t;
    this.posture = posture;
    this.allSides = !!tracker.allSides;
    this._cache = new Map();
    this.updateSegmentRefs();
    this.view = this.detectView();
    this.near = this.detectNearSide();
  }

  memo(key, fn) {
    if (!this._cache.has(key)) this._cache.set(key, fn());
    return this._cache.get(key);
  }

  vis(i) { return this.pts[i]?.v ?? 0; }
  ok(i, thr = VIS) { return this.vis(i) >= thr; }
  pt(i, thr = VIS) { return this.ok(i, thr) ? this.pts[i] : null; }
  idx(side, part) { return SIDE[side][part]; }
  get(side, part, thr = VIS) { return this.pt(SIDE[side][part], thr); }
  sideVis(side, parts) { return Math.min(...parts.map((p) => this.vis(SIDE[side][p]))); }
  hasSide(side, parts, thr = VIS) { return parts.every((p) => this.ok(SIDE[side][p], thr)); }

  /** Görünür taraflar; yandan çekimde yalnızca kameraya yakın taraf (uzak taraf tahmindir). */
  sidesFor(parts) {
    const cands = this.view === 'side' && this.near && !this.allSides ? [this.near] : ['L', 'R'];
    return cands.filter((s) => this.hasSide(s, parts));
  }

  updateSegmentRefs() {
    const segs = [['shoulder', 'elbow'], ['elbow', 'wrist'], ['hip', 'knee'], ['knee', 'ankle'], ['shoulder', 'hip'], ['heel', 'toe']];
    for (const s of ['L', 'R']) {
      for (const [a, b] of segs) {
        const A = this.get(s, a), B = this.get(s, b);
        this.tr.refLen(`${s}.${a}-${b}`, A && B ? len2(sub(B, A)) : NaN, this.t);
      }
    }
  }
  rawRef(side, a, b) {
    const k1 = `${side}.${a}-${b}`;
    return this.tr.refs.has(k1) ? this.tr.refLen(k1, NaN, this.t) : this.tr.refLen(`${side}.${b}-${a}`, NaN, this.t);
  }
  /**
   * Segmentin gerçek boyu. Gözlenen kayan maksimum + vücut oranı alt sınırları: segment hiç kamera
   * düzlemine gelmese bile (ör. dirsek sürekli bükük, ön kol kameraya dönük) boy doğru tahmin edilir.
   */
  ref(side, a, b) {
    const key = [a, b].sort().join('-');
    return this.memo(`ref|${side}|${key}`, () => {
      const own = this.rawRef(side, a, b);
      const other = this.rawRef(side === 'L' ? 'R' : 'L', a, b);
      const bounds = [own, 0.9 * other]; // sağ-sol simetri
      const P = { 'elbow-wrist': [['shoulder', 'elbow', 0.8]], 'elbow-shoulder': [['elbow', 'wrist', 0.95]], 'ankle-knee': [['hip', 'knee', 0.85]], 'hip-knee': [['knee', 'ankle', 0.85]] }[key] || [];
      for (const [x, y, k] of P) bounds.push(k * Math.max(this.rawRef(side, x, y) || 0, 0.9 * (this.rawRef(side === 'L' ? 'R' : 'L', x, y) || 0)));
      const v = Math.max(...bounds.filter(Number.isFinite));
      return Number.isFinite(v) && v > 0 ? v : NaN;
    });
  }

  /** Vücut ölçeği (piksel): üst kol gerçek boyu → omuz genişliği → gövde/1.6. */
  scale() {
    return this.memo('scale', () => {
      const ua = ['L', 'R'].map((s) => this.ref(s, 'shoulder', 'elbow')).filter(Number.isFinite);
      if (ua.length) return ua.reduce((a, b) => a + b, 0) / ua.length;
      const ls = this.pt(LM.leftShoulder), rs = this.pt(LM.rightShoulder);
      if (ls && rs && this.view === 'front') return len2(sub(ls, rs)) * 0.85;
      const tl = ['L', 'R'].map((s) => this.ref(s, 'shoulder', 'hip')).filter(Number.isFinite);
      if (tl.length) return tl[0] / 1.6;
      return NaN;
    });
  }

  // ---------------------------------------------------------------- görüş açısı
  detectView() {
    const ls = this.pts[LM.leftShoulder], rs = this.pts[LM.rightShoulder];
    if (!ls || !rs || ls.v < 0.3 || rs.v < 0.3) {
      if (ls?.v >= 0.5 || rs?.v >= 0.5) return this.voteView('side');
      return this.voteView('unknown');
    }
    const votes = [];
    const sw = len2(sub(ls, rs));
    const lh = this.pts[LM.leftHip], rh = this.pts[LM.rightHip];
    if (lh && rh && lh.v > 0.4 && rh.v > 0.4) {
      const tl = len2(sub(mid(ls, rs), mid(lh, rh)));
      if (tl > 1) { const r = sw / tl; votes.push(r >= 0.42 ? 'front' : r <= 0.26 ? 'side' : 'oblique'); }
    }
    const ua = ['L', 'R'].map((s) => this.ref(s, 'shoulder', 'elbow')).filter(Number.isFinite);
    if (ua.length) {
      const r = sw / (ua.reduce((a, b) => a + b, 0) / ua.length);
      votes.push(r >= 0.75 ? 'front' : r <= 0.42 ? 'side' : 'oblique');
    }
    const yaw = Math.atan2(Math.abs(ls.z - rs.z), Math.abs(ls.x - rs.x)) * DEG;
    votes.push(yaw < 35 ? 'front' : yaw > 58 ? 'side' : 'oblique');
    const count = (k) => votes.filter((v) => v === k).length;
    let v = 'oblique';
    if (count('front') > votes.length / 2) v = 'front';
    else if (count('side') > votes.length / 2) v = 'side';
    return this.voteView(v);
  }
  voteView(v) {
    const hist = this.tr.viewHist;
    hist.push(v);
    if (hist.length > 24) hist.shift();
    const c = {};
    hist.forEach((x) => { c[x] = (c[x] || 0) + 1; });
    const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    // histerezis: mevcut görüş %35'ten fazla oy alıyorsa koru
    if (this.tr.view !== 'unknown' && (c[this.tr.view] || 0) >= hist.length * 0.35) return this.tr.view;
    this.tr.view = best[0];
    return this.tr.view;
  }
  detectNearSide() {
    const ls = this.pts[LM.leftShoulder], rs = this.pts[LM.rightShoulder];
    if (!ls || !rs) return this.tr.nearSide;
    let n;
    if (Math.abs(ls.v - rs.v) > 0.15) n = ls.v > rs.v ? 'L' : 'R';
    else n = ls.z < rs.z ? 'L' : 'R';
    const prev = this.tr.nearSide;
    if (prev && n !== prev) {
      // yön değişimi için belirgin fark iste
      const dz = Math.abs(ls.z - rs.z) / (this.scale() || 100);
      if (dz < 0.25 && Math.abs(ls.v - rs.v) < 0.25) n = prev;
    }
    this.tr.nearSide = n;
    return n;
  }

  // ---------------------------------------------------------------- gövde ekseni
  shoulderAnchor() {
    return this.memo('sAnchor', () => {
      const ls = this.pt(LM.leftShoulder), rs = this.pt(LM.rightShoulder);
      if (this.view === 'side') {
        // yandan: uzak taraf modelin tahminidir → yalnızca kameraya yakın omuz
        const n = this.near && this.get(this.near, 'shoulder');
        if (n) return { p: n, conf: n.v };
      }
      if (ls && rs) return { p: mid(ls, rs), conf: Math.min(ls.v, rs.v) };
      const one = ls || rs;
      return one ? { p: one, conf: one.v * 0.7 } : null;
    });
  }
  hipAnchor() {
    return this.memo('hAnchor', () => {
      const lh = this.pt(LM.leftHip), rh = this.pt(LM.rightHip);
      if (this.view === 'side' && this.near) {
        const n = this.get(this.near, 'hip');
        if (n) return { p: n, conf: n.v };
      }
      if (lh && rh) return { p: mid(lh, rh), conf: Math.min(lh.v, rh.v) };
      const one = this.view === 'side' ? (lh || rh) : null;
      return one ? { p: one, conf: one.v * 0.85 } : null;
    });
  }

  /** Gövde aşağı ekseni (omuz → kalça). Yedekler: omuz hattına dik → yerçekimi. */
  torso() {
    return this.memo('torso', () => {
      const S = this.shoulderAnchor();
      if (!S) return null;
      const H = this.hipAnchor();
      if (H) {
        const v = sub(H.p, S.p);
        const l = len2(v);
        if (l > 5) return { down: norm2(v), len: l, conf: Math.min(S.conf, H.conf), src: 'kalça', s: S.p, hp: H.p };
      }
      const upright = this.posture === 'upright' || this.posture === 'seated';
      const ls = this.pt(LM.leftShoulder), rs = this.pt(LM.rightShoulder);
      const estLen = (this.scale() || 100) * 1.6;
      if (this.view === 'front' && ls && rs && upright) {
        let d = norm2(perp2(sub(rs, ls)));
        if (d.y < 0) d = { x: -d.x, y: -d.y };
        return { down: d, len: estLen, conf: 0.7 * S.conf, src: 'omuz hattı', s: S.p, hp: null };
      }
      if (upright) return { down: { x: 0, y: 1 }, len: estLen, conf: 0.55 * S.conf, src: 'yerçekimi', s: S.p, hp: null };
      return null;
    });
  }

  /** Yandan çekimde göğsün baktığı yön (gövdeye dik, burun tarafı). */
  anterior() {
    return this.memo('ant', () => {
      const T = this.torso();
      if (!T) return null;
      const c1 = perp2(T.down);
      const pick = (c) => {
        const prev = this.tr.anterior;
        const nose = this.pt(LM.nose, 0.5);
        if (nose) {
          const d = dot2(sub(nose, T.s), c);
          if (Math.abs(d) > 0.12 * T.len) return d > 0 ? c : { x: -c.x, y: -c.y };
        }
        for (const s of ['L', 'R']) {
          const heel = this.get(s, 'heel'), toe = this.get(s, 'toe');
          if (heel && toe && (this.posture === 'upright' || this.posture === 'seated')) {
            const d = dot2(sub(toe, heel), c);
            if (Math.abs(d) > 3) return d > 0 ? c : { x: -c.x, y: -c.y };
          }
        }
        if (prev) return dot2(prev, c) >= 0 ? c : { x: -c.x, y: -c.y };
        return c;
      };
      const a = pick(c1);
      this.tr.anterior = a;
      return a;
    });
  }

  /** Kafa referans noktaları (yedek zinciri sırasıyla). */
  headRefs(side) {
    const out = [];
    const sides = side ? [side] : ['L', 'R'];
    const grab = (part) => avgPts(sides.map((s) => this.get(s, part, 0.5)).filter(Boolean));
    const ear = grab('ear'); if (ear) out.push(['kulak', ear]);
    const eye = grab('eye'); if (eye) out.push(['göz', eye]);
    const mouth = grab('mouth'); if (mouth) out.push(['ağız', mouth]);
    const nose = this.pt(LM.nose, 0.5); if (nose) out.push(['burun', nose]);
    return out;
  }

  /**
   * Omuz–kafa mesafesi (ölçeğe bölünmüş), her taraf ve her kafa referansı için.
   * Omuz silkme = bu mesafenin kalibrasyona göre azalması.
   */
  headShoulderDist() {
    return this.memo('hsd', () => {
      const T = this.torso();
      const sc = this.scale();
      if (!T || !Number.isFinite(sc)) return null;
      // eksen: kalça varsa gövde, yoksa dik duruşta yerçekimi (tek omuz silkmesi ekseni bozmasın)
      const axis = T.src === 'kalça' ? T.down : (this.posture === 'upright' || this.posture === 'seated') ? { x: 0, y: 1 } : null;
      if (!axis) return null;
      const res = {};
      for (const s of this.sidesFor(['shoulder'])) {
        const S = this.get(s, 'shoulder');
        // önden çekimde aynı taraf kulak/göz tercih edilir; yoksa iki taraf ortalaması
        let refs = this.headRefs(this.view === 'front' ? s : null);
        if (!refs.length) refs = this.headRefs(null);
        res[s] = {};
        for (const [name, P] of refs) res[s][name] = dot2(sub(S, P), axis) / sc;
      }
      return res;
    });
  }

  /**
   * headShoulderDist'in piksel sürümü (ölçeğe bölünmemiş) + gövde boyu. shrugX bunu kalibrasyondaki
   * sabit ölçekle karşılaştırır: kolların kamera düzlemine girip çıkması (pec deck, ters pec deck vb.)
   * vücut ölçeğini değiştirip sahte silkme üretmesin diye.
   */
  headShoulderPx() {
    return this.memo('hsdPx', () => {
      const T = this.torso();
      if (!T) return null;
      const axis = T.src === 'kalça' ? T.down : (this.posture === 'upright' || this.posture === 'seated') ? { x: 0, y: 1 } : null;
      if (!axis) return null;
      const res = { torsoLen: T.src === 'kalça' ? T.len : NaN, sides: {} };
      for (const s of this.sidesFor(['shoulder'])) {
        const S = this.get(s, 'shoulder');
        let refs = this.headRefs(this.view === 'front' ? s : null);
        if (!refs.length) refs = this.headRefs(null);
        res.sides[s] = {};
        for (const [name, P] of refs) res.sides[s][name] = dot2(sub(S, P), axis);
      }
      return res;
    });
  }

  // ---------------------------------------------------------------- 3B segment yeniden kurma
  /**
   * a→b segmentini 3B'ye kurar. Düzlem dışı bileşen = sqrt(gerçekBoy² − ekranBoyu²),
   * işaret = z farkı (belirsizse prior). Dönen z: + kameradan uzağa.
   */
  seg3(side, a, b, priorSign = -1) {
    const A = this.get(side, a), B = this.get(side, b);
    if (!A || !B) return null;
    const v = sub(B, A);
    const l = len2(v);
    const ref = this.ref(side, a, b);
    if (!Number.isFinite(ref) || ref < 5) return { v3: { x: v.x, y: v.y, z: 0 }, len2: l, out: 0, ratio: 1, conf: 0.4 };
    const r = ref * REF_SHRINK;
    const out = Math.sqrt(Math.max(0, r * r - l * l));
    const sign = this.tr.depthSign(`${side}.${a}-${b}`, B.z - A.z, ref, priorSign, this.t);
    return { v3: { x: v.x, y: v.y, z: sign * out }, len2: l, out, ratio: l / ref, conf: Math.min(A.v, B.v) };
  }

  /** Vücut eksenleri (3B, görüntü koordinatında; z kameradan uzağa). */
  axes(side) {
    const T = this.torso();
    if (!T) return null;
    const d3 = { x: T.down.x, y: T.down.y, z: 0 };
    if (this.view === 'side') {
      const a = this.anterior();
      if (!a) return null;
      const outward = side === this.near ? -1 : 1; // yakın taraf kameraya doğru açılır
      return { d3, a3: { x: a.x, y: a.y, z: 0 }, l3: { x: 0, y: 0, z: outward }, inPlane: 'sagittal', T };
    }
    // önden (veya çapraz): öne = kameraya doğru, yan = omuzdan dışarı
    let lat = perp2(T.down);
    const S = this.get(side, 'shoulder');
    const other = this.get(side === 'L' ? 'R' : 'L', 'shoulder');
    if (S && other && dot2(lat, sub(S, other)) < 0) lat = { x: -lat.x, y: -lat.y };
    return { d3, a3: { x: 0, y: 0, z: -1 }, l3: { x: lat.x, y: lat.y, z: 0 }, inPlane: 'frontal', T };
  }

  /**
   * Üst kolun gövdeye göre konumu.
   * elev: gövde ekseniyle 3B açı (0 = kol yanda aşağı, 90 = yatay, 180 = baş üstü)
   * flex: öne kaldırma (işaretli, + öne, − arkaya), abd: yana açılma (işaretli, + dışa)
   * plane: kaldırılmış kolun yönü (0 = tam önde, 90 = tam yanda)
   */
  arm(side) {
    return this.memo(`arm${side}`, () => {
      const ax = this.axes(side);
      if (!ax) return null;
      const sideView = this.view === 'side';
      const prior = sideView ? (side === this.near ? -1 : 1) : -1;
      const s = this.seg3(side, 'shoulder', 'elbow', prior);
      if (!s) return null;
      const u = s.v3;
      const L = len3(u) || 1;
      const dd = dot3(u, ax.d3) / L, aa = dot3(u, ax.a3) / L, ll = dot3(u, ax.l3) / L;
      // görüntü düzlemindeki bileşen için 2B ölçüm daha doğru: elev'i 2B açıyla birleştir
      const inPlaneComp = sideView ? aa : ll;
      const outComp = sideView ? ll : aa;
      const elev = Math.atan2(Math.hypot(aa, ll), dd) * DEG;
      // kol baş üstündeyken atan2 ±180'de sıçrar → sürekli tut (arkaya −100°'den fazla açılma olmaz)
      let flex = Math.atan2(aa, Math.max(dd, -1)) * DEG;
      if (flex < -100) flex += 360;
      const abd = Math.atan2(ll, dd) * DEG;
      const plane = Math.atan2(Math.abs(ll), Math.abs(aa) + 1e-6) * DEG;
      const vis = s.conf * ax.T.conf;
      return {
        elev, flex, abd, plane, dd, aa, ll, inPlaneComp, outComp, ratio: s.ratio,
        confIn: clamp(vis * 1.05, 0, 1), confOut: clamp(vis * 0.6, 0, 1),
        torsoSrc: ax.T.src,
      };
    });
  }

  /**
   * Eklem açısı. Varsayılan 'auto': iki segment de ekranda tam boyundaysa (kamera düzleminde)
   * 2B açı (en doğru); biri kameraya doğru kısalmışsa Taylor 3B açı; arada yumuşak geçiş.
   * mode '2d' yalnızca açıkça istenirse 2B'ye zorlar.
   */
  joint(side, a, b, c, mode = 'auto', priors = [-1, -1]) {
    const A = this.get(side, a), B = this.get(side, b), C = this.get(side, c);
    if (!A || !B || !C) return null;
    const conf = Math.min(A.v, B.v, C.v);
    const a2 = jointAngle2(A, B, C);
    if (mode === '2d') return { v: a2, conf };
    const s1 = this.seg3(side, b, a, priors[0]); // tepe → a
    const s2 = this.seg3(side, b, c, priors[1]);
    if (!s1 || !s2) return { v: a2, conf: conf * 0.7 };
    const a3 = angle3(s1.v3, s2.v3);
    const rmin = Math.min(s1.ratio, s2.ratio);
    const w = clamp((rmin - 0.8) / 0.12, 0, 1); // 1 → 2B, 0 → 3B
    // iki segment de kısalmışsa işaret belirsizliği → güveni düşür
    const both = s1.ratio < 0.85 && s2.ratio < 0.85;
    return { v: w * a2 + (1 - w) * a3, conf: conf * (w > 0.99 ? 1 : both ? 0.6 : 0.85) };
  }

  /** Gövdenin öne/arkaya eğimi (derece, + öne). relOnly: yalnızca değişimi anlamlıdır. */
  torsoPitch() {
    return this.memo('pitch', () => {
      const T = this.torso();
      if (this.view === 'side') {
        const a = this.anterior();
        if (T && T.src === 'kalça' && a) {
          const t = { x: -T.down.x, y: -T.down.y }; // kalça → omuz
          const antH = Math.sign(a.x) || 1;
          return { v: Math.atan2(t.x * antH, -t.y) * DEG, conf: T.conf, src: 'kalça-omuz açısı' };
        }
        const S = this.shoulderAnchor();
        if (S && a) {
          const antH = Math.sign(a.x) || 1;
          const Lt = (this.scale() || 100) * 1.6;
          return { v: (S.p.x * antH / Lt) * DEG, conf: 0.6 * S.conf, src: 'omuz kayması', relOnly: true };
        }
        return null;
      }
      // önden: dünya koordinatları + gövde kısalması
      const ests = [];
      if (this.world) {
        const W = this.world;
        const ws = mid(W[LM.leftShoulder], W[LM.rightShoulder]);
        const wh = mid(W[LM.leftHip], W[LM.rightHip]);
        ests.push({ v: Math.atan2(-(ws.z - wh.z), -(ws.y - wh.y)) * DEG, w: 1 });
      }
      // Not: gövde kısalmasından (Taylor) eğim tahmini kullanılmıyor — omuz silkme gövdeyi uzatıp
      // sahte eğim üretiyordu. Önden salınım yalnızca uyarı düzeyinde (düşük güven) değerlendirilir.
      if (!ests.length) return null;
      const v = ests.reduce((a, e) => a + e.v * e.w, 0) / ests.reduce((a, e) => a + e.w, 0);
      return { v, conf: T && T.src === 'kalça' ? 0.55 : 0.45, src: T && T.src === 'kalça' ? 'gövde derinliği' : 'dünya modeli', relOnly: true };
    });
  }

  /** Önden çekimde gövdenin yana eğilmesi (derece). */
  torsoRoll() {
    return this.memo('roll', () => {
      const T = this.torso();
      if (!T) return null;
      if (T.src === 'kalça') return { v: Math.atan2(-T.down.x, T.down.y) * DEG, conf: T.conf, src: 'kalça-omuz' };
      const S = this.shoulderAnchor();
      const Lt = (this.scale() || 100) * 1.6;
      return { v: (S.p.x / Lt) * DEG, conf: 0.55 * S.conf, src: 'omuz kayması', relOnly: true };
    });
  }

  /** Bir noktanın gövde eksenine göre konumu (ölçek birimiyle): down = aşağı, ant = öne/yana. */
  relToShoulder(side, part) {
    const T = this.torso();
    const S = this.get(side, 'shoulder');
    const P = this.get(side, part);
    const sc = this.scale();
    if (!T || !S || !P || !Number.isFinite(sc)) return null;
    const d = sub(P, S);
    const res = { down: dot2(d, T.down) / sc, conf: Math.min(S.v, P.v) * T.conf };
    if (this.view === 'side' || this.view === 'oblique') {
      const a = this.anterior();
      res.ant = a ? dot2(d, a) / sc : NaN;
    }
    if (this.view !== 'side') {
      const ax = this.axes(side);
      res.out = dot2(d, { x: ax.l3.x, y: ax.l3.y }) / sc;
    }
    return res;
  }

  /** Bilekler arası mesafe / omuz genişliği (önden çekim, açış hareketleri). */
  wristSpread() {
    const lw = this.get('L', 'wrist'), rw = this.get('R', 'wrist');
    const ls = this.get('L', 'shoulder'), rs = this.get('R', 'shoulder');
    if (!lw || !rw || !ls || !rs) return null;
    const sw = len2(sub(ls, rs));
    if (sw < 5) return null;
    return { v: Math.abs(lw.x - rw.x) / sw, conf: Math.min(lw.v, rw.v, ls.v, rs.v) };
  }

  /** Vücut hattı: kalçanın omuz–ayak bileği (veya diz) çizgisinden sapması. + = göğüs/karın yönüne (çökme). */
  bodyLine(side, end = 'ankle') {
    const S = this.get(side, 'shoulder'), H = this.get(side, 'hip'), E = this.get(side, end);
    const a = this.anterior();
    if (!S || !H || !E || !a) return null;
    const ang = jointAngle2(S, H, E);
    const lineDir = norm2(sub(E, S));
    const off = sub(H, S);
    const perp = off.x * -lineDir.y + off.y * lineDir.x; // işaretli dik mesafe
    const n = { x: -lineDir.y, y: lineDir.x };
    const sgn = Math.sign(dot2(n, a)) || 1;
    const dev = 180 - ang;
    return { v: dev * Math.sign(perp * sgn || 1), angle: ang, conf: Math.min(S.v, H.v, E.v) };
  }

  /** Diz içe kaçması (önden): dizin kalça–ayak bileği çizgisine göre içe sapması (ölçek birimi, + = içe). */
  kneeValgus(side) {
    const H = this.get(side, 'hip'), K = this.get(side, 'knee'), A = this.get(side, 'ankle');
    const sc = this.scale();
    const oh = this.get(side === 'L' ? 'R' : 'L', 'hip');
    if (!H || !K || !A || !oh || !Number.isFinite(sc)) return null;
    const dir = sub(A, H);
    const tt = clamp(dot2(sub(K, H), dir) / (dot2(dir, dir) || 1), 0, 1);
    const onLine = { x: H.x + dir.x * tt, y: H.y + dir.y * tt };
    const outward = norm2({ x: H.x - oh.x, y: 0 });
    const off = dot2(sub(K, onLine), outward); // + dışa
    return { v: -off / sc, conf: Math.min(H.v, K.v, A.v) };
  }
}

export { angle2, sub, len2, dot2, mid, norm2 };
