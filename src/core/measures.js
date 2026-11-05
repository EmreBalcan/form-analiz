// Ölçüm kütüphanesi. Her ölçüm (P: Pose, ctx, side) → {v, conf, src, relOnly?} | null döndürür.
// ctx: { angleMode: '2d'|'3d', calib: {...}, def }
import { LM } from './landmarks.js';
import { DEG, sub, dot2, len2, norm2, angle2, mid } from './geometry.js';

const elbowPriors = [1, -1]; // dirsek→omuz biraz geride, ön kol kameraya doğru (belirsiz durumda)

export const M = {
  elbowAngle: (P, ctx, s) => {
    const r = P.joint(s, 'shoulder', 'elbow', 'wrist', ctx.angleMode, elbowPriors);
    return r && { ...r, src: ctx.angleMode === '2d' ? 'omuz-dirsek-bilek 2B' : 'omuz-dirsek-bilek 3B' };
  },
  kneeAngle: (P, ctx, s) => {
    const r = P.joint(s, 'hip', 'knee', 'ankle', ctx.angleMode, [-1, 1]);
    return r && { ...r, src: 'kalça-diz-bilek' };
  },
  hipAngle: (P, ctx, s) => {
    const r = P.joint(s, 'shoulder', 'hip', 'knee', ctx.angleMode, [-1, -1]);
    return r && { ...r, src: 'omuz-kalça-diz' };
  },
  /** Kolun gövdeyle yaptığı açı (3B, 0 = yanda, 90 = yatay, 180 = baş üstü). */
  armElev: (P, ctx, s) => {
    const a = P.arm(s);
    if (!a) return null;
    // elev = gövde eksenine (görüntü düzleminde) izdüşüm / gerçek kol boyu → derinlikten bağımsız, güvenilir
    return { v: a.elev, conf: a.confIn * 0.9, src: `kol-gövde (${a.torsoSrc})` };
  },
  /** Kolun öne açısı (+ öne, − arkaya). Yandan çekimde 2B (güvenilir), önden Taylor (düşük güven). */
  armFlex: (P, ctx, s) => {
    const a = P.arm(s);
    if (!a) return null;
    return { v: a.flex, conf: P.view === 'side' ? a.confIn : a.confOut, src: `${P.view === 'side' ? 'yan' : 'derinlik'} · ${a.torsoSrc}` };
  },
  /** Kolun yana açılması (+ dışa). Önden çekimde 2B (güvenilir), yandan Taylor. */
  armAbd: (P, ctx, s) => {
    const a = P.arm(s);
    if (!a) return null;
    return { v: a.abd, conf: P.view === 'side' ? a.confOut : a.confIn, src: `${P.view === 'side' ? 'derinlik' : 'ön'} · ${a.torsoSrc}` };
  },
  /** Kaldırılmış kolun yönü: 0 = tam önde, 90 = tam yanda. Kol aşağıdayken anlamsız (conf 0). */
  armPlane: (P, ctx, s) => {
    const a = P.arm(s);
    if (!a || a.elev < 35) return null;
    return { v: a.plane, conf: Math.min(a.confIn, a.confOut + 0.15), src: 'kol düzlemi' };
  },
  /**
   * Omuz silkme: omzun kafaya doğru yükselmesi, kalibrasyona göre, ÜST KOL BOYU biriminde
   * (0.10 ≈ 3 cm, 0.17 ≈ 5 cm). Hangi kafa noktası kullanılırsa kullanılsın aynı ölçek.
   * Zincir: kulak → göz → ağız → burun. İkinci kaynak çapraz kontrol için kullanılır.
   */
  shrug: (P, ctx, s) => {
    const cur = P.headShoulderDist();
    const base = ctx.calib?.hsd;
    if (!cur || !base || !cur[s] || !base[s]) return null;
    const order = ['kulak', 'göz', 'ağız', 'burun'];
    const vals = [];
    for (const name of order) {
      const c = cur[s][name], b = base[s][name];
      if (Number.isFinite(c) && Number.isFinite(b) && b > 0.1) vals.push({ name, v: b - c });
    }
    if (!vals.length) return null;
    const [p1, p2] = vals;
    let conf = p1.name === 'burun' ? 0.6 : 0.9;
    if (p2 && Math.abs(p1.v - p2.v) > 0.08) conf *= 0.7; // kaynaklar çelişiyor (baş eğilmiş olabilir)
    return { v: p1.v, conf, src: `omuz–${p1.name}${p2 ? ` (+${p2.name})` : ''}` };
  },
  torsoPitch: (P) => P.torsoPitch(),
  /** Mutlak gövde eğimi (yalnızca güvenilir kaynak). */
  torsoLean: (P) => {
    const r = P.torsoPitch();
    return r && !r.relOnly ? r : null;
  },
  torsoRoll: (P) => P.torsoRoll(),
  /** Ön kolun dikeyden sapması (presslerde bilek dirseğin üstünde olmalı). */
  forearmTilt: (P, ctx, s) => {
    const E = P.get(s, 'elbow'), W = P.get(s, 'wrist');
    if (!E || !W) return null;
    const v = sub(W, E);
    const a = angle2(v, { x: 0, y: -1 });
    return { v: Math.min(a, 180 - a), conf: Math.min(E.v, W.v), src: 'dirsek-bilek dikeyliği' };
  },
  /** Bilek dirseğin ne kadar üstünde (ön kol boyu birimi, + yukarı). */
  wristOverElbow: (P, ctx, s) => {
    const E = P.get(s, 'elbow'), W = P.get(s, 'wrist');
    const ref = P.ref(s, 'elbow', 'wrist');
    if (!E || !W || !Number.isFinite(ref)) return null;
    return { v: (E.y - W.y) / ref, conf: Math.min(E.v, W.v), src: 'bilek-dirsek yüksekliği' };
  },
  /** Dirsek omzun ne kadar altında (gövde ekseninde, ölçek birimi; − = omzun üstünde). */
  elbowDrop: (P, ctx, s) => {
    const r = P.relToShoulder(s, 'elbow');
    return r && { v: r.down, conf: r.conf, src: 'dirsek-omuz yüksekliği' };
  },
  wristDrop: (P, ctx, s) => {
    const r = P.relToShoulder(s, 'wrist');
    return r && { v: r.down, conf: r.conf, src: 'bilek-omuz yüksekliği' };
  },
  /** Dirsek omzun ne kadar dışında (önden, ölçek birimi). */
  elbowOut: (P, ctx, s) => {
    if (P.view === 'side') return null;
    const r = P.relToShoulder(s, 'elbow');
    return r && { v: r.out, conf: r.conf, src: 'dirsek yan mesafesi' };
  },
  wristSpread: (P) => {
    const r = P.wristSpread();
    return r && { ...r, src: 'bilek aralığı / omuz' };
  },
  bodyLine: (P, ctx, s) => {
    const r = P.bodyLine(s, ctx.def.lineEnd || 'ankle');
    return r && { v: r.v, conf: r.conf, src: `omuz-kalça-${ctx.def.lineEnd === 'knee' ? 'diz' : 'bilek'} hattı` };
  },
  kneeValgus: (P, ctx, s) => {
    const r = P.kneeValgus(s);
    return r && { ...r, src: 'diz / kalça-bilek çizgisi' };
  },
  stanceWidth: (P) => {
    const la = P.get('L', 'ankle'), ra = P.get('R', 'ankle'), ls = P.get('L', 'shoulder'), rs = P.get('R', 'shoulder');
    if (!la || !ra || !ls || !rs) return null;
    const sw = len2(sub(ls, rs));
    return sw > 5 ? { v: Math.abs(la.x - ra.x) / sw, conf: Math.min(la.v, ra.v), src: 'ayak aralığı / omuz' } : null;
  },
  kneeSpreadRatio: (P) => {
    const lk = P.get('L', 'knee'), rk = P.get('R', 'knee'), la = P.get('L', 'ankle'), ra = P.get('R', 'ankle');
    if (!lk || !rk || !la || !ra) return null;
    const aw = Math.abs(la.x - ra.x);
    return aw > 5 ? { v: Math.abs(lk.x - rk.x) / aw, conf: Math.min(lk.v, rk.v, la.v, ra.v), src: 'diz aralığı / ayak aralığı' } : null;
  },
  /** Dizin ayak ucunu geçme miktarı (ayak boyu birimi, yandan). */
  kneeOverToe: (P, ctx, s) => {
    const K = P.get(s, 'knee'), T = P.get(s, 'toe'), a = P.anterior();
    const fl = P.ref(s, 'heel', 'toe');
    if (!K || !T || !a || !Number.isFinite(fl)) return null;
    const antH = { x: Math.sign(a.x) || 1, y: 0 };
    return { v: dot2(sub(K, T), antH) / fl, conf: Math.min(K.v, T.v), src: 'diz-ayak ucu' };
  },
  /** Ayak tabanı açısı (topuk kalkması için, derece; kalibrasyona göre kullanılır). */
  footAngle: (P, ctx, s) => {
    const H = P.get(s, 'heel'), T = P.get(s, 'toe'), a = P.anterior();
    if (!H || !T) return null;
    const v = sub(T, H);
    const dir = a ? (Math.sign(a.x) || 1) : Math.sign(v.x) || 1;
    return { v: Math.atan2(v.y, v.x * dir) * DEG, conf: Math.min(H.v, T.v), src: 'topuk-ayak ucu' };
  },
  /** Topuğun ayak bileğine göre yükselmesi (ölçek birimi) — ayak ucu görünmezse yedek. */
  heelRise: (P, ctx, s) => {
    const H = P.get(s, 'heel'), T = P.get(s, 'toe');
    const sc = P.scale();
    if (H && T && Number.isFinite(sc)) return { v: (T.y - H.y) / sc, conf: Math.min(H.v, T.v), src: 'topuk-ayak ucu yüksekliği' };
    const A = P.get(s, 'ankle'), K = P.get(s, 'knee');
    if (A && K && Number.isFinite(sc)) return { v: (K.y - A.y) / sc * -1, conf: Math.min(A.v, K.v) * 0.6, src: 'bilek yüksekliği', relOnly: true };
    return null;
  },
  /** Omuzun öne yuvarlanması: omuzun kalça–kulak çizgisinden öne sapması (ölçek birimi). */
  shoulderForward: (P, ctx, s) => {
    if (P.view === 'front') return null;
    const S = P.get(s, 'shoulder'), a = P.anterior();
    const ear = P.get(s, 'ear', 0.5) || P.get(s, 'eye', 0.5);
    const H = P.get(s, 'hip');
    const sc = P.scale();
    if (!S || !a || !ear || !Number.isFinite(sc)) return null;
    if (H) {
      const dir = norm2(sub(ear, H));
      const n = { x: -dir.y, y: dir.x };
      const sg = Math.sign(dot2(n, a)) || 1;
      return { v: dot2(sub(S, H), n) * sg / sc, conf: Math.min(S.v, ear.v, H.v), src: 'omuz / kalça-kulak çizgisi' };
    }
    return { v: dot2(sub(S, ear), { x: Math.sign(a.x) || 1, y: 0 }) / sc, conf: Math.min(S.v, ear.v) * 0.7, src: 'omuz / kulak dikeyi' };
  },
  /** Çene barın üstünde mi: el seviyesinin ağız/burun üstündeki mesafesi (ölçek birimi, + = çene üstte). */
  chinOverHands: (P) => {
    const sc = P.scale();
    const hands = ['L', 'R'].map((s) => P.get(s, 'wrist')).filter(Boolean);
    const mouth = [P.pt(LM.mouthLeft, 0.5), P.pt(LM.mouthRight, 0.5)].filter(Boolean);
    let chin = mouth.length ? mid(mouth[0], mouth[mouth.length - 1]) : null;
    let src = 'ağız-el';
    if (!chin) { const n = P.pt(LM.nose, 0.5); if (n) { chin = { x: n.x, y: n.y + 0.25 * (sc || 0) }; src = 'burun-el'; } }
    if (!chin || !hands.length || !Number.isFinite(sc)) return null;
    const handY = hands.reduce((a, h) => a + h.y, 0) / hands.length;
    return { v: (handY - chin.y) / sc, conf: Math.min(...hands.map((h) => h.v)), src };
  },
  /** Dizin kalçaya göre yatay konumu (ölçek birimi) — sallanma/bacak savurma için (rep bazlı). */
  kneeSwing: (P, ctx, s) => {
    const K = P.get(s, 'knee'), H = P.get(s, 'hip') || P.get(s, 'shoulder');
    const sc = P.scale();
    if (!K || !H || !Number.isFinite(sc)) return null;
    return { v: (K.x - H.x) / sc, conf: Math.min(K.v, H.v), src: 'diz yatay konumu' };
  },
  /** Kalçanın omuza göre yüksekliği (yatarak hareketlerde kalça kaldırma). */
  hipLift: (P, ctx, s) => {
    const H = P.get(s, 'hip'), S = P.get(s, 'shoulder');
    const sc = P.scale();
    if (!H || !S || !Number.isFinite(sc)) return null;
    return { v: (S.y - H.y) / sc, conf: Math.min(H.v, S.v), src: 'kalça-omuz yüksekliği' };
  },
  /** Kalça noktasının yatay konumu (ölçek birimi) — kalça geri/öne kayması. */
  hipShift: (P, ctx, s) => {
    const H = P.get(s, 'hip'), a = P.anterior(), K = P.get(s, 'knee');
    const sc = P.scale();
    if (!H || !Number.isFinite(sc)) return null;
    const ref = K || P.get(s, 'ankle');
    if (!ref) return null;
    const dir = a ? Math.sign(a.x) || 1 : 1;
    return { v: (H.x - ref.x) * dir / sc, conf: Math.min(H.v, ref.v), src: 'kalça-diz yatay' };
  },
  /** Bilek–ayak bileği/dizin öne mesafesi (barın vücuda yakınlığı, ölçek birimi). */
  barDistance: (P, ctx, s) => {
    const W = P.get(s, 'wrist'), K = P.get(s, 'knee') || P.get(s, 'ankle'), a = P.anterior();
    const sc = P.scale();
    if (!W || !K || !a || !Number.isFinite(sc)) return null;
    return { v: (W.x - K.x) * (Math.sign(a.x) || 1) / sc, conf: Math.min(W.v, K.v), src: 'bilek-bacak yatay' };
  },
  /** Baş–gövde hizası: kulağın omuz–kalça çizgisine göre öne çıkması (derece). */
  neckFlex: (P, ctx, s) => {
    const S = P.get(s, 'shoulder'), H = P.get(s, 'hip');
    const ear = P.get(s, 'ear', 0.5) || P.get(s, 'eye', 0.5);
    if (!S || !H || !ear) return null;
    return { v: angle2(sub(S, H), sub(ear, S)), conf: Math.min(S.v, H.v, ear.v), src: 'kalça-omuz-kulak' };
  },
  /** Ayak bilekleri öne/arkaya fark (koşu, adım). */
  ankleSplit: (P) => {
    const la = P.get('L', 'ankle', 0.35), ra = P.get('R', 'ankle', 0.35), a = P.anterior();
    const sc = P.scale();
    if (!la || !ra || !Number.isFinite(sc)) return null;
    const dir = a ? Math.sign(a.x) || 1 : 1;
    return { v: (la.x - ra.x) * dir / sc, conf: Math.min(la.v, ra.v), src: 'ayak bilekleri' };
  },
  /** Ayak bileğinin kalçanın ne kadar önüne basıldığı (aşırı adım, bacak boyu birimi). */
  footAhead: (P, ctx, s) => {
    const A = P.get(s, 'ankle'), H = P.get(s, 'hip'), a = P.anterior();
    const leg = P.ref(s, 'hip', 'knee') + P.ref(s, 'knee', 'ankle');
    if (!A || !H || !a || !Number.isFinite(leg)) return null;
    return { v: (A.x - H.x) * (Math.sign(a.x) || 1) / leg, conf: Math.min(A.v, H.v), src: 'bilek-kalça yatay' };
  },
  /** Kafa yüksekliğinin değişimi (ölçek birimi, + yukarı) — sıçrama vb. */
  headHeight: (P) => {
    const n = P.pt(LM.nose, 0.5);
    const sc = P.scale();
    if (!n || !Number.isFinite(sc)) return null;
    return { v: -n.y / sc, conf: n.v, src: 'burun yüksekliği', relOnly: true };
  },
  /** Gövdenin dikeyden açısı (yatay = 90). Kalça zorunlu. */
  torsoFromVertical: (P) => {
    const T = P.torso();
    if (!T || T.src !== 'kalça') return null;
    return { v: angle2({ x: -T.down.x, y: -T.down.y }, { x: 0, y: -1 }), conf: T.conf, src: 'kalça-omuz' };
  },
  /** Uyluğun yataydan açısı (squat derinliği için; + kalça dizin altında). */
  thighBelowHorizontal: (P, ctx, s) => {
    const H = P.get(s, 'hip'), K = P.get(s, 'knee');
    if (!H || !K) return null;
    const v = sub(H, K);
    return { v: Math.atan2(v.y, Math.abs(v.x)) * DEG, conf: Math.min(H.v, K.v), src: 'kalça-diz' };
  },
};

const kneeOf = (P, ctx, s) => P.joint(s, 'hip', 'knee', 'ankle', ctx.angleMode, [-1, 1]);
const legsOrdered = (P) => {
  // öndeki / arkadaki bacak (yandan çekim, iki bacak da kullanılır)
  const a = P.anterior();
  const la = P.get('L', 'ankle', 0.35), ra = P.get('R', 'ankle', 0.35);
  if (!a || !la || !ra) return null;
  const dir = Math.sign(a.x) || 1;
  return (la.x - ra.x) * dir > 0 ? { front: 'L', back: 'R' } : { front: 'R', back: 'L' };
};

Object.assign(M, {
  /** Bileğin omza göre öne (yandan: göğüs yönüne) uzaklığı, ölçek birimi. */
  wristAnt: (P, ctx, s) => {
    const r = P.relToShoulder(s, 'wrist');
    return r && Number.isFinite(r.ant) ? { v: r.ant, conf: r.conf, src: 'bilek-omuz (öne)' } : null;
  },
  elbowAnt: (P, ctx, s) => {
    const r = P.relToShoulder(s, 'elbow');
    return r && Number.isFinite(r.ant) ? { v: r.ant, conf: r.conf, src: 'dirsek-omuz (öne)' } : null;
  },
  /** Omzun bilek üstündeki yüksekliği (görüntü dikeyi, ölçek birimi) — şınav derinliği. */
  shoulderOverWrist: (P, ctx, s) => {
    const S = P.get(s, 'shoulder'), W = P.get(s, 'wrist');
    const sc = P.scale();
    if (!S || !W || !Number.isFinite(sc)) return null;
    return { v: (W.y - S.y) / sc, conf: Math.min(S.v, W.v), src: 'omuz-bilek yüksekliği' };
  },
  /** İki bilek arasındaki yükseklik farkı (simetri, ölçek birimi). */
  wristLevel: (P) => {
    const l = P.get('L', 'wrist'), r = P.get('R', 'wrist');
    const sc = P.scale();
    if (!l || !r || !Number.isFinite(sc) || P.view === 'side') return null;
    return { v: Math.abs(l.y - r.y) / sc, conf: Math.min(l.v, r.v), src: 'sol-sağ bilek' };
  },
  /** İki kolun kalkış açısı farkı (simetri). */
  armElevDiff: (P) => {
    if (P.view === 'side') return null;
    const l = P.arm('L'), r = P.arm('R');
    if (!l || !r) return null;
    return { v: Math.abs(l.elev - r.elev), conf: Math.min(l.confIn, r.confIn), src: 'sol-sağ kol' };
  },
  /** İki ayağın aynı hizada olması (önden: yükseklik farkı). */
  footLevel: (P) => {
    const l = P.get('L', 'ankle'), r = P.get('R', 'ankle');
    const sc = P.scale();
    if (!l || !r || !Number.isFinite(sc) || P.view === 'side') return null;
    return { v: Math.abs(l.y - r.y) / sc, conf: Math.min(l.v, r.v), src: 'sol-sağ ayak bileği' };
  },
  frontKnee: (P, ctx) => {
    const o = legsOrdered(P);
    const r = o && kneeOf(P, ctx, o.front);
    return r && { ...r, src: 'öndeki diz' };
  },
  backKnee: (P, ctx) => {
    const o = legsOrdered(P);
    const r = o && kneeOf(P, ctx, o.back);
    return r && { ...r, src: 'arkadaki diz' };
  },
  frontKneeOverToe: (P, ctx) => {
    const o = legsOrdered(P);
    return o ? M.kneeOverToe(P, ctx, o.front) : null;
  },
  /** Basamakta: ayağı yüksekte olan bacağın diz açısı (ayaklar aynı hizadaysa büyük olan). */
  stepKnee: (P, ctx) => {
    const sc = P.scale();
    const la = P.get('L', 'ankle', 0.35), ra = P.get('R', 'ankle', 0.35);
    if (!la || !ra || !Number.isFinite(sc)) return null;
    const kl = kneeOf(P, ctx, 'L'), kr = kneeOf(P, ctx, 'R');
    if (Math.abs(la.y - ra.y) / sc < 0.25) {
      const c = [kl, kr].filter(Boolean).sort((a, b) => b.v - a.v)[0];
      return c ? { ...c, src: 'diz (ayaklar aynı hizada)' } : null;
    }
    const r = la.y < ra.y ? kl : kr;
    return r && { ...r, src: 'basamaktaki diz' };
  },
  /** Bacak–gövde açısı (omuz-kalça-ayak bileği): yatarak bacak kaldırmada 180 = düz, 90 = dik. */
  legTorso: (P, ctx, s) => {
    const r = P.joint(s, 'shoulder', 'hip', 'ankle', '2d');
    return r && { ...r, src: 'omuz-kalça-bilek' };
  },
  /** Uyluğun dikeyden sapması (derece). */
  thighTilt: (P, ctx, s) => {
    const H = P.get(s, 'hip'), K = P.get(s, 'knee');
    if (!H || !K) return null;
    return { v: angle2(sub(H, K), { x: 0, y: -1 }), conf: Math.min(H.v, K.v), src: 'uyluk dikeyliği' };
  },
  /** Uyluğun gövdeye göre geriye açılması (kickback; + = geride). */
  thighExt: (P, ctx, s) => {
    const T = P.torso(), a = P.anterior(), H = P.get(s, 'hip'), K = P.get(s, 'knee');
    if (!T || !a || !H || !K || T.src !== 'kalça') return null;
    const u = norm2(sub(K, H));
    return { v: Math.atan2(-dot2(u, a), dot2(u, T.down)) * DEG, conf: Math.min(H.v, K.v, T.conf), src: 'uyluk-gövde' };
  },
  /** Dirseğin omuz altında olması (plank): kol–gövde açısının 90'dan sapması. */
  elbowUnderShoulder: (P, ctx, s) => {
    const a = P.arm(s);
    return a ? { v: Math.abs(a.elev - 90), conf: a.confIn, src: 'kol-gövde açısı' } : null;
  },
  /** Kürek: bacaklar açılmadan kolların bükülmesi (1 = hata). */
  armsEarly: (P, ctx, s) => {
    const k = kneeOf(P, ctx, s), e = P.joint(s, 'shoulder', 'elbow', 'wrist', ctx.angleMode, [1, -1]);
    if (!k || !e) return null;
    return { v: k.v < 135 && e.v < 140 ? 1 : 0, conf: Math.min(k.conf, e.conf), src: 'diz + dirsek sırası' };
  },
});

Object.assign(M, {
  /**
   * Üst kolun kamera eksenine dönme açısı (derece, işaretsiz): kemiğin ekranda kısalmasından.
   * Önden çekimde dirseklerin gövdenin ÖNÜNE gelmesini yakalar (press'te dirsekler yanda olmalı).
   */
  armFrontalDev: (P, ctx, s) => {
    // üst kolun gövdenin ön düzleminden (omuz hattı düzlemi) öne sapması; kol baş üstündeyken de anlamlı.
    // Önden: kemiğin kameraya doğru kısalmasından; yandan: doğrudan görüntüden.
    const a = P.arm(s);
    if (!a) return null;
    const v = Math.asin(Math.min(1, Math.abs(a.aa))) * DEG;
    return { v, conf: P.view === 'side' ? a.confIn : Math.min(1, a.confIn * 0.9), src: `üst kol ${P.view === 'side' ? 'yan görüntü' : 'kısalması'}` };
  },
  /**
   * Gövdenin yana eğimi (derece, işaretsiz, önden). Kalça → ayak bilekleri → omuz hattı eğimi yedekli.
   */
  sideLean: (P) => {
    if (P.view === 'side') return null;
    const ls = P.get('L', 'shoulder'), rs = P.get('R', 'shoulder');
    if (!ls || !rs) return null;
    const sm = mid(ls, rs);
    const tilt = (lower, src, conf) => {
      const v = sub(sm, lower);
      return { v: Math.abs(Math.atan2(v.x, -v.y) * DEG), conf, src };
    };
    const lh = P.get('L', 'hip'), rh = P.get('R', 'hip');
    if (lh && rh) return tilt(mid(lh, rh), 'kalça-omuz', Math.min(lh.v, rh.v, ls.v, rs.v));
    const la = P.get('L', 'ankle'), ra = P.get('R', 'ankle');
    if (la && ra) return tilt(mid(la, ra), 'ayak-omuz', Math.min(la.v, ra.v) * 0.9);
    // omuz hattı eğimi: gövde yana yattıkça omuz hattı da eğilir
    const d = sub(rs, ls);
    let a = Math.abs(Math.atan2(d.y, d.x) * DEG);
    if (a > 90) a = 180 - a;
    return { v: a, conf: Math.min(ls.v, rs.v) * 0.7, src: 'omuz hattı eğimi' };
  },
});

Object.assign(M, {
  /**
   * Omuz silkme (shrug ile aynı ölçek) + yandan çekimde taraf değişimine dayanıklı: ölçülen tarafın
   * kalibrasyonu yoksa (yakın taraf değişti) diğer tarafın kalibrasyonu kullanılır.
   * Yana dambıl açış (referans hareket) değişmesin diye orada eski 'shrug' kalır.
   */
  shrugX: (P, ctx, s) => {
    // Ölçek kalibrasyonda SABİTLENİR (gövde boyu/1.6 ≈ üst kol boyu; gövde yoksa o anki vücut ölçeği).
    // Kişi kameraya yaklaşır/uzaklaşırsa gövde boyu oranıyla düzeltilir. Birim 'shrug' ile aynı.
    const c = ctx.calib;
    const cur = P.headShoulderPx();
    if (!c?.hsdPx || !cur || !cur.sides[s]) return null;
    let base = c.hsdPx[s];
    let cross = false;
    if (!base) { base = c.hsdPx[s === 'L' ? 'R' : 'L']; cross = true; }
    if (!base) return null;
    const S0 = Number.isFinite(c.torsoLen0) ? c.torsoLen0 / 1.6 : c.scale0;
    if (!Number.isFinite(S0) || S0 <= 0) return null;
    const k = Number.isFinite(c.torsoLen0) && Number.isFinite(cur.torsoLen) && cur.torsoLen > 0 ? c.torsoLen0 / cur.torsoLen : 1;
    const vals = [];
    for (const name of ['kulak', 'göz', 'ağız', 'burun']) {
      const cv = cur.sides[s][name], b = base[name];
      if (Number.isFinite(cv) && Number.isFinite(b) && b / S0 > 0.1) vals.push({ name, v: (b - cv * k) / S0 });
    }
    if (!vals.length) return null;
    const [p1, p2] = vals;
    let conf = p1.name === 'burun' ? 0.6 : 0.9;
    if (p2 && Math.abs(p1.v - p2.v) > 0.08) conf *= 0.7;
    if (cross) conf *= 0.95;
    return { v: p1.v, conf, src: `omuz–${p1.name}${p2 ? ` (+${p2.name})` : ''}${cross ? ' · diğer taraf kalibrasyonu' : ''}` };
  },
  /** Dirsekler arası mesafe / omuz genişliği (önden). Press'te dirsekler yanda olmalı (geniş). */
  elbowSpread: (P) => {
    if (P.view === 'side') return null;
    const le = P.get('L', 'elbow'), re = P.get('R', 'elbow'), ls = P.get('L', 'shoulder'), rs = P.get('R', 'shoulder');
    if (!le || !re || !ls || !rs) return null;
    const sw = len2(sub(ls, rs));
    if (sw < 5) return null;
    return { v: Math.abs(le.x - re.x) / sw, conf: Math.min(le.v, re.v, ls.v, rs.v), src: 'dirsek aralığı / omuz genişliği' };
  },
  /**
   * Önden çekimde öne/arkaya eğilme: gövdenin ekrandaki boyu / omuz genişliği. Gövde kameraya doğru
   * veya geriye yattıkça kısalır (cos). Kalibrasyona göre kullanılır.
   */
  torsoLenRatio: (P) => {
    if (P.view === 'side') return null;
    const ls = P.get('L', 'shoulder'), rs = P.get('R', 'shoulder'), lh = P.get('L', 'hip'), rh = P.get('R', 'hip');
    if (!ls || !rs || !lh || !rh) return null;
    const sw = len2(sub(ls, rs));
    if (sw < 5) return null;
    return { v: len2(sub(mid(ls, rs), mid(lh, rh))) / sw, conf: Math.min(ls.v, rs.v, lh.v, rh.v), src: 'gövde boyu / omuz genişliği' };
  },
});

/** Ölçüm açıklamaları (UI hata ayıklama paneli için). */
export const MEASURE_UNITS = {
  elbowAngle: '°', kneeAngle: '°', hipAngle: '°', armElev: '°', armFlex: '°', armAbd: '°', armPlane: '°',
  shrug: '%', torsoPitch: '°', torsoLean: '°', torsoRoll: '°', forearmTilt: '°', footAngle: '°', neckFlex: '°',
  torsoFromVertical: '°', thighBelowHorizontal: '°',
};
