// Tekrar kullanılabilir kural kalıpları. Her kural:
//   measure: ölçüm adı (measures.js) | op: '>' veya '<' | warn: uyarı eşiği | reject: tekrarı reddetme eşiği
//   relative: 'rep' (tekrar başındaki değere göre değişim) | 'calib' (kalibrasyona göre) | abs: mutlak değer
//   phase: 'active' | 'out' (başlangıç→hedef) | 'peak' | 'back' (dönüş) | 'always'
//   bestView: bu kuralın tekrarı REDDEDEBİLDİĞİ kamera açısı (diğer açılarda yalnızca uyarır)
//   views: kural yalnızca bu açılarda ölçülür
//   agg: 'extreme' → fazdaki en iyi değer eşikle karşılaştırılır (tepe/dip kontrolü)
import { clamp } from '../core/geometry.js';

const armElevAllowance = (k) => (P, ctx, s) => {
  const a = P.arm(s);
  return a ? k * clamp(a.elev / 90, 0, 1.3) : 0;
};

export const R = {
  shrug: ({ warn = 0.1, reject = 0.17, phase = 'active', raiseAllowance = 0, text, cue } = {}) => {
    const al = raiseAllowance ? armElevAllowance(raiseAllowance) : null;
    return {
      id: 'shrug', measure: 'shrug', op: '>', phase, minMs: 250,
      warn: al ? (P, c, s) => warn + al(P, c, s) : warn,
      reject: reject === null ? undefined : al ? (P, c, s) => reject + al(P, c, s) : reject,
      label: 'Omuz silkme (omuz–kulak mesafesi)',
      text: text || 'Omuzlar kulağa doğru kalktı (omuz silkme)',
      cue: cue || 'Omuzlarını indir',
    };
  },
  sway: ({ warn = 7, reject = 14, phase = 'active', text, cue } = {}) => ({
    id: 'sway', measure: 'torsoPitch', relative: 'range', op: '>', warn, reject: reject ?? undefined, phase, bestView: 'side', minMs: 150,
    label: 'Gövde salınımı (ileri-geri)',
    text: text || 'Gövde ileri-geri sallandı — momentum kullanıldı',
    cue: cue || 'Gövdeni sabit tut',
  }),
  swayLateral: ({ warn = 6, reject = 11, text } = {}) => ({
    id: 'sway-lat', measure: 'torsoRoll', relative: 'range', op: '>', warn, reject: reject ?? undefined, views: ['front'], minMs: 200,
    label: 'Gövdenin yana kayması',
    text: text || 'Gövde yana doğru kaydı/eğildi',
    cue: 'Gövdeni ortada tut',
  }),
  kneeDip: ({ warn = 12, reject = 22 } = {}) => ({
    id: 'knee-dip', measure: 'kneeAngle', relative: 'range', op: '>', warn, reject, minMs: 150,
    label: 'Dizlerle yaylanma',
    text: 'Dizler bükülerek yaylanıldı — bacaktan momentum alındı',
    cue: 'Dizlerini sabit tut',
  }),
  bounce: ({ warn = 0.12, reject = 0.22 } = {}) => ({
    id: 'bounce', measure: 'headHeight', relative: 'range', op: '>', warn, reject, minMs: 150,
    label: 'Vücudun aşağı-yukarı yaylanması',
    text: 'Vücut aşağı-yukarı yaylandı — momentum kullanıldı',
    cue: 'Vücudunu sabit tut',
  }),
  elbowDrift: ({ warn = 15, reject = 25, text } = {}) => ({
    id: 'elbow-drift', measure: 'armFlex', relative: 'range', op: '>', warn, reject, bestView: 'side', minMs: 150,
    label: 'Dirsek sabitliği (üst kolun hareketi)',
    text: text || 'Dirsek sabit kalmadı — üst kol öne/arkaya hareket etti',
    cue: 'Dirseğini sabitle',
  }),
  elbowForward: ({ warn = 22, reject = 35, text } = {}) => ({
    id: 'elbow-forward', measure: 'armFlex', op: '>', warn, reject, bestView: 'side', minMs: 150,
    label: 'Dirseğin öne kaçması',
    text: text || 'Dirsek öne kaçtı — üst kol gövdenin yanında kalmalı',
    cue: 'Dirseğini geri al, gövdene yapıştır',
  }),
  elbowFlare: ({ warn = 25, reject = 38, text } = {}) => ({
    id: 'elbow-flare', measure: 'armAbd', op: '>', warn, reject, bestView: 'front', minMs: 150,
    label: 'Dirseğin gövdeden açılması (yana)',
    text: text || 'Dirsek gövdeden uzaklaştı — kol vücudun yanında olmalı',
    cue: 'Dirseklerini gövdene yakın tut',
  }),
  elbowAngleFixed: ({ warn = 20, reject = 35, text } = {}) => ({
    id: 'elbow-fixed', measure: 'elbowAngle', relative: 'range', op: '>', warn, reject, minMs: 200,
    label: 'Dirsek açısının sabit kalması',
    text: text || 'Dirsek açısı değişti — kollar hafif bükülü sabit kalmalı',
    cue: 'Dirsek açını sabit tut',
  }),
  leanMax: ({ warn, reject, phase = 'active', text, cue, label } = {}) => ({
    id: 'lean-max', measure: 'torsoFromVertical', op: '>', warn, reject, phase, bestView: 'side', minMs: 250,
    label: label || 'Gövdenin öne eğimi',
    text: text || 'Gövde fazla öne eğildi',
    cue: cue || 'Göğsünü kaldır, gövdeni dikleştir',
  }),
  leanMin: ({ warn, reject, phase = 'active', text, cue, label } = {}) => ({
    id: 'lean-min', measure: 'torsoFromVertical', op: '<', warn, reject, phase, bestView: 'side', minMs: 300,
    label: label || 'Yeterli öne eğilme',
    text: text || 'Gövde fazla dik — öne daha çok eğil',
    cue: cue || 'Kalçadan öne eğil',
  }),
  valgus: ({ warn = 0.12, reject = 0.22, phase = ['peak', 'back'] } = {}) => [
    {
      id: 'valgus', measure: 'kneeValgus', op: '>', warn, reject, phase, bestView: 'front', views: ['front', 'oblique'], minMs: 150,
      label: 'Dizlerin içe kaçması',
      text: 'Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı',
      cue: 'Dizlerini dışarı it',
    },
    {
      id: 'valgus-ratio', measure: 'kneeSpreadRatio', op: '<', warn: 0.85, reject: 0.72, phase, bestView: 'front', views: ['front', 'oblique'], minMs: 150,
      label: 'Dizlerin içe kaçması',
      text: 'Dizler içe kaçtı — dizler ayak uçlarıyla aynı yöne bakmalı',
      cue: 'Dizlerini dışarı it',
    },
  ],
  heelLift: ({ warn = 8, reject = 15 } = {}) => ({
    id: 'heel-lift', measure: 'footAngle', relative: 'calib', abs: true, op: '>', warn, reject, bestView: 'side', views: ['side', 'oblique'], minMs: 200,
    label: 'Topukların yerde kalması',
    text: 'Topuklar yerden kalktı — ağırlık topuk ve orta ayakta olmalı',
    cue: 'Topuklarına bas',
  }),
  stance: ({ min = 0.8, max = 2.1 } = {}) => [
    {
      id: 'stance-narrow', measure: 'stanceWidth', op: '<', warn: min, phase: 'always', views: ['front'], minMs: 600,
      label: 'Ayak aralığı (dar)', text: 'Ayaklar fazla bitişik — omuz genişliğinde aç', cue: 'Ayaklarını omuz genişliğinde aç',
    },
    {
      id: 'stance-wide', measure: 'stanceWidth', op: '>', warn: max, phase: 'always', views: ['front'], minMs: 600,
      label: 'Ayak aralığı (geniş)', text: 'Ayaklar fazla açık', cue: 'Ayaklarını biraz topla',
    },
  ],
  feetLevel: () => ({
    id: 'feet-level', measure: 'footLevel', op: '>', warn: 0.3, phase: 'always', views: ['front'], minMs: 600,
    label: 'Ayakların yan yana olması', text: 'Ayaklar aynı hizada değil — bir ayak önde/geride', cue: 'Ayaklarını aynı hizaya getir',
  }),
  symmetryWrist: ({ warn = 0.35, reject = 0.6 } = {}) => ({
    id: 'sym-wrist', measure: 'wristLevel', op: '>', warn, reject, views: ['front'], bestView: 'front', minMs: 250,
    label: 'Sağ-sol simetri', text: 'Kollar eşit hareket etmiyor — bir taraf geride kaldı', cue: 'İki kolu eşit hareket ettir',
  }),
  symmetryArm: ({ warn = 15, reject = 28 } = {}) => ({
    id: 'sym-arm', measure: 'armElevDiff', op: '>', warn, reject, views: ['front'], bestView: 'front', minMs: 250,
    label: 'Sağ-sol kol yüksekliği', text: 'Kollar aynı yükseklikte değil', cue: 'İki kolu eşit kaldır',
  }),
  bodyLine: ({ sagWarn = 10, sagReject = 18, pikeWarn = 14, pikeReject = 24, phase = 'active' } = {}) => [
    {
      id: 'hip-sag', measure: 'bodyLine', op: '>', warn: sagWarn, reject: sagReject, phase, bestView: 'side', minMs: 250,
      label: 'Kalça çökmesi', text: 'Kalça çöktü — omuz, kalça ve ayak bileği düz bir çizgide olmalı', cue: 'Karnını sık, kalçanı kaldır',
    },
    {
      id: 'hip-pike', measure: 'bodyLine', op: '<', warn: -pikeWarn, reject: -pikeReject, phase, bestView: 'side', minMs: 250,
      label: 'Kalçanın fazla yükselmesi', text: 'Kalça fazla yukarıda — vücudu düz tut', cue: 'Kalçanı indir',
    },
  ],
  neck: ({ warn = 35 } = {}) => ({
    id: 'neck', measure: 'neckFlex', op: '>', warn, minMs: 400, bestView: 'side',
    label: 'Baş-boyun hizası', text: 'Baş gövde hizasından çıktı — boynunu nötr tut', cue: 'Başını gövdenle hizala',
  }),
  hipLift: ({ warn = 0.25, reject = 0.4 } = {}) => ({
    id: 'hip-lift', measure: 'hipLift', relative: 'rep', op: '>', warn, reject, bestView: 'side', minMs: 200,
    label: 'Kalçanın sehpada kalması', text: 'Kalça sehpadan kalktı', cue: 'Kalçanı sehpada tut',
  }),
  shoulderRoll: ({ warn = 0.15, phase = 'active' } = {}) => ({
    id: 'shoulder-roll', measure: 'shoulderForward', relative: 'calib', op: '>', warn, phase, views: ['side'], minMs: 300,
    label: 'Göğüs önde / omuzlar geride', text: 'Omuzlar öne yuvarlandı — göğsünü öne çıkar, kürek kemiklerini geri al', cue: 'Göğsünü öne çıkar',
  }),
  kneeOverToe: ({ warn = 0.6 } = {}) => ({
    id: 'knee-toe', measure: 'kneeOverToe', op: '>', warn, phase: ['peak'], views: ['side'], minMs: 250,
    label: 'Dizin ayak ucunu geçmesi', text: 'Diz ayak ucunun çok önüne geçti — kalçayı geriye gönder', cue: 'Kalçanı geriye gönder',
  }),
};
