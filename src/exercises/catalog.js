// 72 hareketin analiz tanımları.
// metric: tekrarı sayan ana ölçüm. start = başlangıç pozisyonu değeri, target = tekrarın geçerli
// sayılması için ulaşılması gereken değer (hedefe ulaşılmazsa ve başlangıca dönülmezse tekrar REDDEDİLİR).
// Kaynaklar ve eşiklerin gerekçesi: docs/KURALLAR.md
import { R } from './rules.js';
import { M } from '../core/measures.js';

const ex = (no, id, tr, en, group, img, spec) => ({
  no, id, tr, en, group, img: `assets/exercises/${img}`,
  mode: 'rep', sides: 'both', plane: 'sagittal', posture: 'upright', view: 'side',
  ...spec,
  rules: (spec.rules || []).flat().map((r) => {
    if (!r || r.measure !== 'shrug') return r;
    if (spec.useProfile) return { ...r, measure: 'shrugP', phase: 'always', rejectConf: 0.55 }; // kalıcı vücut ölçümüne göre + set başına göre (burun yedeği de reddedebilir)
    return SHRUG_REFERENCE.includes(id) ? r : { ...r, measure: 'shrugX' };
  }),
});
// Dirsek/gövde kurallarını her kamera açısında reddedebilir yap (kullanıcı tercihi: katı > toleranslı).
// Görüntü düzlemi dışındaki ölçümlerde güven daha düşük olduğu için reddetme güveni 0.5'e iner.
const strict = (r, rejectConf = 0.5) => ({ ...r, bestView: undefined, rejectConf });
// Kameranın kuralı derinlikten (kemik kısalmasından) ölçtüğü açı için ikinci kural: aynı metin, daha yüksek eşik,
// 5 karelik ortanca süzgeç. Asıl açıda (bestView) katı kural, diğer açıda bu kural reddeder.
const offView = (r, add = [10, 12]) => ({
  ...r, id: `${r.id}-off`, warn: r.warn + add[0], reject: r.reject + add[1], bestView: undefined, rejectConf: 0.5, smooth: 5,
  views: r.bestView === 'side' ? ['front', 'oblique'] : ['side', 'oblique'],
});
const bothViews = (r, add) => [r, offView(r, add)];
// Yana dambıl açış (kullanıcının referans hareketi, değiştirilmeyecek) ve onunla birebir aynı olması istenen kablo yan açış
// orijinal silkme ölçümünü kullanır; diğer hareketler yandan çekimde taraf değişimine dayanıklı 'shrugX' kullanır.
const SHRUG_REFERENCE = ['lateral-raise', 'cable-lateral-raise'];

// ---------------------------------------------------------------- ortak gruplar
const curlRules = ({ forward = true, flare = true, sway = true, drift = [12, 20] } = {}) => [
  drift && bothViews(R.elbowDrift({ warn: drift[0], reject: drift[1] }), [14, 16]),
  forward && bothViews(R.elbowForward({ warn: 18, reject: 30 }), [12, 12]),
  flare && bothViews(R.elbowFlare({ warn: 18, reject: 30 }), [10, 10]),
  sway && R.sway({ warn: 5, reject: 10, rejectConf: 0.5, text: 'Gövde geriye/öne sallandı — ağırlık bel ve kalçadan kaldırıldı' }),
  sway && R.leanDrift({ warn: 7, reject: 12, text: 'Gövde başlangıçtaki dik duruştan öne/arkaya eğildi' }),
  R.shrug({ warn: 0.1, reject: 0.17 }),
].filter(Boolean);

const curlMetric = (target = 70) => ({
  fn: 'elbowAngle', start: 150, target, label: 'Dirsek açısı',
  romText: 'Ağırlık yeterince kaldırılmadı — kolu tam bük',
  returnText: 'Kol altta tam açılmadı — her tekrarda kolu uzat',
});
const curlTempo = { minOutMs: 350, outText: 'Ağırlık savrularak kaldırıldı — kontrollü kaldır', minBackMs: 600, backText: 'Ağırlık hızlı bırakıldı — en az 1 sn’de indir' };

const pushdownRules = () => [
  bothViews(R.elbowDrift({ warn: 10, reject: 18, text: 'Dirsek sabit kalmadı — üst kol gövdenin yanında kilitli olmalı' }), [14, 16]),
  bothViews(R.elbowForward({ warn: 20, reject: 32, text: 'Dirsekler öne kaçtı — omuz ve sırt devreye girdi' }), [12, 12]),
  bothViews(R.elbowFlare({ warn: 20, reject: 32, text: 'Dirsekler yana açıldı — gövdene yakın tut' }), [10, 10]),
  R.leanMax({ warn: 25, reject: 40, text: 'Öne fazla eğildin — gövde en fazla hafif (10-20°) eğik olmalı', label: 'Öne eğilme (en fazla ~20°)' }),
  R.sway({ warn: 6, reject: 11, rejectConf: 0.5, text: 'Gövdeyle bastırıldı — vücut ağırlığı kullanıldı' }),
  R.leanDrift({ warn: 8, reject: 14, text: 'Gövde başlangıç duruşundan öne/arkaya eğildi' }),
  R.shrug({ warn: 0.1, reject: 0.17 }),
];
const pushdownMetric = (target = 160) => ({
  fn: 'elbowAngle', start: 85, target, label: 'Dirsek açısı',
  romText: 'Kollar altta tam kilitlenmedi — dirseği tamamen aç',
  returnText: 'Yukarıda ön kol yere paralel olana kadar dönülmedi',
});

const benchRules = ({ flare = [75, 85], tuck = 20, lowBar = [0.1, 1.25] } = {}) => [
  {
    id: 'bench-flare', measure: 'armElev', op: '>', warn: flare[0], reject: flare[1], phase: ['peak'], bestView: 'side', minMs: 150,
    label: 'Dirsek açısı (gövdeyle 45-75°)', text: 'Dirsekler gövdeye 90° açıldı — 45-75° arasında tut (omuz sıkışır)', cue: 'Dirseklerini biraz içeri al',
  },
  tuck && {
    id: 'bench-tuck', measure: 'armElev', op: '<', warn: tuck, phase: ['peak'], bestView: 'side', minMs: 200,
    label: 'Dirseklerin aşırı kapanması', text: 'Dirsekler gövdeye fazla yapışık', cue: 'Dirseklerini biraz aç',
  },
  {
    id: 'forearm-vertical', measure: 'forearmTilt', op: '>', warn: 20, reject: 35, phase: ['peak', 'back'], views: ['side'], minMs: 200,
    label: 'Bilek dirseğin üstünde (ön kol dik)', text: 'Bilekler dirseklerin üstünde değil — ön kol dik olmalı', cue: 'Bileklerini dirseğinin üstüne getir',
  },
  {
    id: 'bar-high', measure: 'wristDrop', op: '<', warn: lowBar[0], phase: ['peak'], views: ['side'], minMs: 200,
    label: 'Barın indiği nokta (çok yüksek)', text: 'Bar boyuna/üst göğse iniyor — meme ucu hizasına indir', cue: 'Barı göğsün ortasına indir',
  },
  {
    id: 'bar-low', measure: 'wristDrop', op: '>', warn: lowBar[1], phase: ['peak'], views: ['side'], minMs: 200,
    label: 'Barın indiği nokta (çok aşağı)', text: 'Bar karına doğru iniyor — göğüs ortasına indir', cue: 'Barı biraz yukarı indir',
  },
  R.hipLift(),
  R.shrug({ warn: 0.11, reject: 0.18, text: 'Omuzlar kulağa kaydı — kürek kemiklerini geri ve aşağı sabitle' }),
  R.shoulderRoll({ warn: 0.18 }),
].filter(Boolean);
const benchMetric = (target = 0.6) => ({
  fn: 'wristAnt', start: 1.6, target, label: 'Bar/bilek yüksekliği',
  romText: 'Bar göğse kadar indirilmedi',
  returnText: 'Kollar yukarıda tam açılmadı (kilitlenmedi)',
});
const benchTempo = { minOutMs: 650, outText: 'Bar hızlı indirildi / göğüste sektirildi — kontrollü indir' };

const rowRules = ({ hinge = false, supported = false } = {}) => [
  R.sway(supported
    ? { warn: 5, reject: 10, rejectConf: 0.55, text: 'Göğüs pedden kalktı — gövdeyle çekildi' }
    : { warn: 6, reject: 11, rejectConf: 0.5, text: 'Gövde öne-arkaya sallanarak çekildi — momentum kullanıldı' }),
  R.leanDrift(supported ? { warn: 7, reject: 12, text: 'Göğüs pedden ayrıldı / gövde başlangıç duruşundan çıktı' } : hinge ? { warn: 8, reject: 13, text: 'Gövdenin eğim açısı değişti — sırtı aynı açıda sabit tut' } : { warn: 7, reject: 12, text: 'Gövde başlangıçtaki dik duruştan öne/arkaya eğildi' }),
  // dirseklerin gövdeye yakınlığı (yana açılma): eğilerek kürekte biraz daha geniş serbest
  strict({ ...R.elbowFlare(hinge ? { warn: 55, reject: 70 } : { warn: 35, reject: 50, text: 'Dirsekler yana açıldı — dirsekler gövdeye yakın geriye çekilmeli' }), id: 'row-flare' }),
  hinge && R.leanMin({ warn: 35, text: 'Gövde fazla dik — kalçadan öne eğil (gövde yere yakın)' }),
  !hinge && !supported && R.leanMax({ warn: 20, reject: 30, phase: 'active', text: 'Gövde öne eğildi — dik otur, çekişi sırtla yap', label: 'Dik oturma (öne eğilmeme)' }),
  !hinge && !supported && {
    id: 'lean-back', measure: 'torsoLean', op: '<', warn: -12, reject: -22, phase: ['peak', 'back'], bestView: 'side', minMs: 200,
    label: 'Geriye yaslanma', text: 'Çekişin sonunda geriye fazla yaslandın', cue: 'Gövdeni dik tut',
  },
  {
    id: 'elbow-back', measure: 'armFlex', op: '>', agg: 'extreme', warn: -5, phase: ['peak'], views: ['side'],
    label: 'Dirseğin gövde arkasına gelmesi', text: 'Dirsekler gövdenin arkasına kadar çekilmedi — kürek kemiklerini sık', cue: 'Dirseklerini geriye sür',
  },
  R.shrug({ warn: 0.1, reject: 0.17, text: 'Çekerken omuzlar kulağa kalktı — kürek kemiklerini aşağı ve geri çek' }),
  hinge && {
    id: 'knee-bend', measure: 'kneeAngle', op: '<', warn: 120, phase: 'active', views: ['side'], minMs: 300,
    label: 'Diz bükülmesi', text: 'Dizler fazla bükülü — dizler hafif bükük, kalça geride', cue: 'Dizlerini biraz aç',
  },
].filter(Boolean);
const rowMetric = (target = 95) => ({
  fn: 'elbowAngle', start: 155, target, label: 'Dirsek açısı',
  romText: 'Ağırlık gövdeye kadar çekilmedi',
  returnText: 'Kollar önde tam açılmadı',
});

// Varsayılanlar kabloyla yan açış (59) ve yana eğilerek açış (61) için ayarlanmış değerlerdir — değiştirme.
// Hareket bazlı gevşetmeler parametreyle verilir (kullanıcı geri bildirimi 2026-11-05).
const raiseRules = ({
  side = 'lateral', sway = true, roll = true,
  elbowMin = [140, 115], // dirsek açısı alt sınırı [uyarı, ret]
  elbowFixed = [20, 35], // tekrar içinde dirsek açısı değişimi [uyarı, ret]
  swayLimits = [6, 12],  // gövde ileri-geri salınımı [uyarı, ret]
  shrugOpts = {},        // silkme kuralına ek ayar (ör. allSides)
  tooHigh = [100],       // kol yüksekliği üst sınırı [uyarı, ret?]
  frontPlane = [45],     // öne kaldırışta kolun yana açılma sınırı [uyarı, ret?]
  frontPlanePhase = ['peak'],
} = {}) => [
  {
    id: 'too-high', measure: 'armElev', op: '>', warn: tooHigh[0], ...(tooHigh[1] !== undefined ? { reject: tooHigh[1] } : {}), phase: ['peak'], minMs: 150,
    label: 'Kol yüksekliği (omuz seviyesi)', text: 'Kollar omuz seviyesinin üstüne çıktı', cue: 'Omuz hizasında dur',
  },
  {
    id: 'elbow-bent', measure: 'elbowAngle', op: '<', warn: elbowMin[0], reject: elbowMin[1], minMs: 200,
    label: 'Dirsek hafif bükük (bükülü kaldırma değil)', text: 'Dirsekler fazla büküldü — kollar hafif bükük ve sabit olmalı', cue: 'Kollarını uzat, hafif bük',
  },
  R.elbowAngleFixed({ warn: elbowFixed[0], reject: elbowFixed[1] }),
  R.shrug({ warn: 0.1, reject: 0.17, raiseAllowance: 0.07, text: 'Omuzlar kulağa kalktı — trapez devreye girdi', ...shrugOpts }),
  sway && R.sway({ warn: swayLimits[0], reject: swayLimits[1], text: 'Gövde sallanarak kaldırıldı — momentum kullanıldı' }),
  roll && R.swayLateral({ warn: 6, reject: 11 }),
  R.kneeDip(),
  R.bounce(),
  side === 'lateral'
    ? { id: 'arm-plane', measure: 'armPlane', op: '<', warn: 40, phase: ['peak'], minMs: 250, label: 'Kol düzlemi (yana)', text: 'Kollar yana değil öne doğru kalkıyor', cue: 'Kollarını yana aç' }
    : { id: 'arm-plane', measure: 'armPlane', op: '>', warn: frontPlane[0], ...(frontPlane[1] !== undefined ? { reject: frontPlane[1] } : {}), phase: frontPlanePhase, minMs: 250, label: 'Kol düzlemi (öne)', text: 'Kollar öne değil yana doğru kalkıyor — kollar gövdenin önünden kalkmalı', cue: 'Kollarını tam öne kaldır' },
  side === 'lateral' && {
    id: 'wrist-high', measure: 'wristOverElbow', op: '>', warn: 0.3, phase: ['peak'], views: ['front'], minMs: 250,
    label: 'Bilek dirsekten yukarıda değil', text: 'Bilekler dirseklerden yukarı çıktı — hareketi dirsekle yönet', cue: 'Dirsekle yönet',
  },
].filter(Boolean);
const raiseMetric = () => ({
  fn: 'armElev', start: 20, target: 75, label: 'Kol-gövde açısı',
  romText: 'Kollar omuz hizasına kadar kaldırılmadı',
  returnText: 'Kollar aşağıya tam indirilmedi',
});
const raiseTempo = { minOutMs: 450, outText: 'Kollar savrularak kaldırıldı — yavaş ve kontrollü kaldır', minBackMs: 600, backText: 'Kollar hızlı bırakıldı — kontrollü indir' };

// Kabloyla yan açış ve yana dambıl açış TEK tanımdan üretilir: tüm kontroller birebir aynı.
// Tek fark: dambılda iki kol birden istenir — tekrar, en yükseğe kalkan kola göre sayılır; bir kol geride
// kalırsa veya tek kol kaldırılırsa tekrar SAYILIR ama 'iki kolu birden kaldır' uyarısı verilir.
const sideRaiseDef = (bothArms) => ({
  plane: 'frontal', view: 'front', sides: bothArms ? 'both' : 'single', required: ['shoulder', 'elbow', 'wrist'],
  metric: bothArms ? { ...raiseMetric(), agg: 'maxProgress' } : raiseMetric(),
  tempo: raiseTempo, useProfile: true, shrugGate: 0.06,
  rules: [
    ...raiseRules({ elbowMin: [125, 100], elbowFixed: [30, 50], shrugOpts: { allSides: true, warn: 0.07, reject: 0.12, raiseAllowance: 0.06 } }),
    ...(bothArms ? [{
      id: 'both-arms', measure: 'armElevDiff', op: '>', warn: 15, minMs: 250, views: ['front', 'oblique'],
      label: 'İki kol birlikte', text: 'İki kolu birden kaldır — kollar aynı yükseklikte kalkmalı', cue: 'İki kolu birden kaldır',
    }] : []),
  ],
});
const squatRules = ({ leanWarn = 50, leanReject = 65, torso = true, heel = true } = {}) => [
  torso && R.leanMax({ warn: leanWarn, reject: leanReject, phase: ['peak', 'back'], text: 'Gövde fazla öne eğildi — göğsünü dik tut' }),
  torso && {
    id: 'hips-first', measure: 'torsoFromVertical', relative: 'rep', op: '>', warn: 15, reject: 25, phase: ['back'], bestView: 'side', minMs: 150,
    label: 'Kalkışta kalça-göğüs uyumu', text: 'Kalkarken kalça önden yükseldi, göğüs düştü', cue: 'Göğsünle birlikte kalk',
  },
  heel && R.heelLift(),
  R.valgus(),
  R.stance(),
  R.feetLevel(),
  R.swayLateral({ warn: 6, reject: 10, text: 'Gövde bir tarafa kaydı — ağırlığı iki bacağa eşit dağıt' }),
  R.kneeOverToe(),
].filter(Boolean);
const squatMetric = (target = 100) => ({
  fn: 'kneeAngle', start: 165, target, label: 'Diz açısı',
  romText: 'Yeterince derine inilmedi — uyluk yere paralel olmalı',
  returnText: 'Tam ayağa kalkılmadı — kalça ve diz kilitlenmeli',
});

const lungeRules = ({ leanWarn = 20, leanReject = 35 } = {}) => [
  R.leanMax({ warn: leanWarn, reject: leanReject, text: 'Gövde öne eğildi — dik dur' }),
  {
    id: 'back-knee', measure: 'backKnee', global: true, op: '>', agg: 'extreme', warn: 120, phase: ['peak'],
    label: 'Arka dizin yere yaklaşması', text: 'Arka diz yere yaklaşmadı — daha derine in', cue: 'Arka dizini yere yaklaştır',
  },
  { ...R.kneeOverToe({ warn: 0.7 }), measure: 'frontKneeOverToe', global: true },
  R.valgus({ warn: 0.14, reject: 0.24 }),
];

const sw = (spec) => spec;

// Pec deck ana ölçümü: görüşe göre (yan/çapraz → bilek öne uzanması, önden → eller arası mesafe 2.3→0.9 aynı ölçeğe)
function pecMetric(P, ctx) {
  if (P.view !== 'front') {
    // yalnızca kameraya yakın kol (uzak kol çaprazda gövdenin arkasında kalır ve yanlış okunur)
    const sides = P.near && P.hasSide(P.near, ['shoulder', 'wrist']) ? [P.near] : P.sidesFor(['shoulder', 'wrist']);
    const vals = sides.map((s) => M.wristAnt(P, ctx, s)).filter((r) => r && r.conf >= 0.35);
    if (vals.length) return { v: Math.max(...vals.map((r) => r.v)), conf: Math.max(...vals.map((r) => r.conf)), src: 'bilek öne uzanması' };
  }
  const w = M.wristSpread(P);
  return w ? { v: 0.5 + (2.3 - w.v) * (0.65 / 1.4), conf: w.conf, src: 'eller arası mesafe' } : null;
}

// ---------------------------------------------------------------- 72 hareket
export const EXERCISES = [
  // ======================= GÖĞÜS
  ex(1, 'bench-press', 'Düz Bench Press', 'Bench Press', 'Göğüs', 'bench-press.webp', {
    posture: 'lying', plane: 'transverse', view: 'side', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamerayı sehpanın yanına, sehpa yüksekliğine koy. Baştan kalçaya kadar tüm vücut görünsün.',
    startText: 'kollar yukarıda düz', metric: benchMetric(0.6), tempo: benchTempo, rules: benchRules(),
  }),
  ex(2, 'incline-dumbbell-press', 'Eğimli Dambıl Press', 'Incline Dumbbell Press', 'Göğüs', 'incline-dumbbell-press.webp', {
    posture: 'lying', plane: 'transverse', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda, sehpa hizasında. Omuz, dirsek, bilek ve kalça görünmeli.',
    startText: 'dambıllar yukarıda, kollar düz', metric: { ...benchMetric(0.8), start: 1.3, romText: 'Dambıllar yeterince indirilmedi' }, tempo: benchTempo, rules: benchRules({ lowBar: [0.05, 1.2] }),
  }),
  ex(3, 'chest-press', 'Göğüs Press Makinesi', 'Chest Press', 'Göğüs', 'chest-press.webp', {
    posture: 'seated', plane: 'transverse', required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı makinenin yanına, omuz hizasına koy.',
    startText: 'tutamaklar göğüs hizasında',
    metric: { fn: 'wristAnt', start: 0.6, target: 1.55, label: 'Kol uzanması', romText: 'Kollar tam uzatılmadı', returnText: 'Tutamaklar göğüs hizasına kadar geri gelmedi' },
    tempo: { minBackMs: 650, backText: 'Ağırlık hızlı bırakıldı — kontrollü geri gel' },
    rules: [
      R.sway({ warn: 4, reject: 8, rejectConf: 0.5, text: 'Sırt pedden ayrıldı — gövdeyle itildi' }),
      R.leanDrift({ warn: 5, reject: 9, rejectConf: 0.5, text: 'Sırt pedden ayrılıp öne geldi — sırtını pede yasla' }),
      { id: 'upright', measure: 'torsoLean', op: '>', warn: 8, reject: 15, bestView: 'side', minMs: 250, label: 'Dik oturma (sırt pedde)', text: 'Gövde öne eğik — dik otur, sırtını pede yasla', cue: 'Dik otur' },
      { id: 'recline', measure: 'torsoLean', op: '<', warn: -25, minMs: 300, label: 'Aşırı geriye yaslanma', text: 'Gövde fazla geriye yatık', cue: 'Dik otur' },
      R.shrug({ warn: 0.07, reject: 0.12, text: 'Omuzlar kulağa kalktı — omuzları aşağıda ve geride tut' }),
      R.shoulderRoll({ warn: 0.18, phase: ['peak'] }),
      { id: 'elbow-high', measure: 'elbowDrop', op: '<', warn: -0.15, reject: -0.35, minMs: 200, label: 'Dirsek yüksekliği', text: 'Dirsekler omuz hizasının üstüne çıktı', cue: 'Dirseklerini omuzun biraz altında tut' },
      { id: 'forearm-line', measure: 'forearmTilt', op: '<', warn: 55, phase: ['out', 'back'], views: ['side'], minMs: 300, label: 'Ön kol itiş yönünde', text: 'Ön kollar itiş yönünde değil — bilek dirsekle aynı hizada olmalı', cue: 'Bileklerini dirsek hizasında tut' },
    ],
  }),
  ex(4, 'pec-deck-fly', 'Pec Deck Açış', 'Pec Deck Fly', 'Göğüs', 'pec-deck-fly.webp', {
    useProfile: true,
    posture: 'seated', plane: 'transverse', view: 'side', viewAlt: ['oblique'], required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı yanına veya hafif yan çaprazına (~30°), omuz hizasına koy. Göğüs, gövde ve omuz her ikisinde de ölçülür; dirsek açısı yan çaprazdan tekrarı reddedebilir, tam yandan yalnızca uyarır (dirsek o açıda derinlikte bükülür).',
    startText: 'kollar yanlarda açık, göğüs önde',
    // yandan/çaprazdan: bileğin öne uzanması; önden görülürse: eller arası mesafe aynı ölçeğe çevrilir
    metric: { fn: pecMetric, global: true, start: 0.5, target: 1.15, label: 'Kolların önde birleşmesi', romText: 'Kollar önde birleştirilmedi', returnText: 'Kollar başlangıca kadar açılmadı' },
    tempo: { minBackMs: 700, backText: 'Kollar hızlı açıldı — kontrollü aç' },
    rules: [
      // kollar yandayken kameraya dönük (açı güvenilmez) → değişim kuralı yalnız güvenilir karelerde reddeder;
      // bükülme kolların önde birleştiği noktada (kol kamera düzleminde, ölçüm kesin) ayrıca kontrol edilir
      // tam yandan dirsek yatay düzlemde (derinlikte) bükülür → güvenilmez; yan çaprazdan (~45°) ret, tam yandan yalnız uyarı
      { ...R.elbowAngleFixed({ warn: 25, reject: 40, text: 'Dirsek açısı değişti — hareket press’e döndü' }), rangeMinConf: 0.65, bestView: 'oblique', smooth: 5 },
      { id: 'elbow-bent', measure: 'elbowAngle', op: '<', warn: 125, reject: 110, phase: ['peak'], minMs: 150, label: 'Dirsek hafif bükük (önde birleşirken)', text: 'Dirsekler fazla büküldü — hareket press’e döndü', cue: 'Kollarını hafif bükük sabit tut' },
      { id: 'elbow-high', measure: 'elbowDrop', op: '<', warn: -0.15, reject: -0.3, minMs: 200, label: 'Kol hizası (dirsek omuz üstüne çıkmasın)', text: 'Dirsekler omuz seviyesinin üstüne çıktı', cue: 'Dirseklerini göğüs-omuz hizasında tut' },
      { id: 'elbow-low', measure: 'elbowDrop', op: '>', warn: 0.4, reject: 0.6, minMs: 250, label: 'Kol hizası (dirsek göğüs altına düşmesin)', text: 'Dirsekler göğüs hizasının altına düştü', cue: 'Dirseklerini kaldır' },
      { ...R.shoulderRoll({ warn: 0.08 }), reject: 0.15, views: ['side', 'oblique'], label: 'Göğüs önde (omuzlar öne yuvarlanmıyor)' },
      { id: 'upright', measure: 'torsoLean', op: '>', warn: 8, reject: 15, minMs: 250, label: 'Dik oturma (sırt pedde)', text: 'Gövde öne eğik — dik otur, sırtını pede yasla', cue: 'Dik otur' },
      R.leanDepthFront({ warn: -0.07, reject: -0.12 }),
      R.shrug({ warn: 0.08, reject: 0.14, raiseAllowance: 0.05, allowanceCap: 1, text: 'Omuzlar kulağa kalktı — omuzları aşağıda ve geride tut' }),
      R.sway({ warn: 5, reject: 9, rejectConf: 0.4, text: 'Gövde öne-arkaya sallandı — sırtını pedde sabit tut' }),
      R.leanDrift({ warn: 6, reject: 10, rejectConf: 0.4, text: 'Sırt pedden ayrıldı / gövde öne eğildi' }),
    ],
  }),
  ex(5, 'push-up', 'Şınav', 'Push-up', 'Göğüs', 'push-up.webp', {
    posture: 'prone', required: ['shoulder', 'elbow', 'wrist', 'hip', 'ankle'],
    setup: 'Kamerayı yere yakın, vücudunun yanına koy. Baştan ayağa kadar tüm vücut görünsün.',
    startText: 'kollar düz, plank pozisyonu',
    metric: { fn: 'shoulderOverWrist', start: 1.4, target: 1.0, label: 'Omuz yüksekliği', romText: 'Yeterince inilmedi — göğsünü yere biraz daha yaklaştır', returnText: 'Kollar yukarıda tam açılmadı' },
    tempo: { minOutMs: 300, outText: 'Hızlı inildi — kontrollü in' },
    rules: [
      R.bodyLine({ sagWarn: 15, sagReject: 26, pikeWarn: 20, pikeReject: 34 }),
      { id: 'pushup-flare', measure: 'armElev', op: '>', warn: 80, reject: 95, phase: ['peak'], bestView: 'side', minMs: 150, label: 'Dirsek açılması', text: 'Dirsekler gövdeye 90° açıldı — 45° civarında tut', cue: 'Dirseklerini gövdene yaklaştır' },
      R.neck({ warn: 45 }),
      R.shrug({ warn: 0.15, reject: 0.25, text: 'Omuzlar kulağa doğru kalktı — kürek kemiklerini aşağı tut' }),
    ],
  }),
  ex(44, 'decline-bench-press', 'Göğüs Aşağı Eğimli Bench Press', 'Decline Bench Press', 'Göğüs', 'decline-bench-press.png', {
    posture: 'lying', plane: 'transverse', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda, sehpa hizasında. Omuzdan kalçaya kadar görünmeli.',
    startText: 'kollar yukarıda düz', metric: benchMetric(0.6), tempo: benchTempo, rules: benchRules({ lowBar: [0.25, 1.35] }),
  }),
  ex(45, 'incline-barbell-press', 'Üst Göğüs Bar Press', 'Incline Barbell Press', 'Göğüs', 'incline-barbell-press.png', {
    posture: 'lying', plane: 'transverse', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda, sehpa hizasında.',
    startText: 'kollar yukarıda düz', metric: { ...benchMetric(0.6), start: 1.3 }, tempo: benchTempo, rules: benchRules({ lowBar: [0.0, 1.0] }),
  }),
  ex(46, 'cable-fly-low-high', 'Aşağıdan Yukarı Kablo Açışı', 'Low to High Cable Fly', 'Göğüs', 'cable-fly-low-high.png', {
    useProfile: true,
    plane: 'transverse', view: 'front', required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı karşına koy; kollar açıkken eller kadrajda kalmalı.',
    startText: 'kollar aşağıda ve yanlarda açık',
    metric: { fn: 'wristSpread', global: true, start: 1.85, target: 0.9, label: 'Eller arası mesafe', romText: 'Eller önde birleştirilmedi', returnText: 'Kollar başlangıca kadar açılmadı' },
    tempo: { minBackMs: 650 },
    rules: [
      R.elbowAngleFixed({ warn: 28, reject: 45 }),
      { id: 'finish-height', measure: 'wristDrop', op: '>', agg: 'extreme', warn: 1.1, phase: ['peak'], label: 'Bitiş yüksekliği (üst göğüs)', text: 'Eller üst göğüs hizasına kadar kaldırılmadı', cue: 'Ellerini göğüs üstüne getir' },
      R.shrug({ warn: 0.1, reject: 0.17, raiseAllowance: 0.06 }),
      R.sway({ warn: 6, reject: 11, rejectConf: 0.55, text: 'Gövde öne-arkaya sallandı — momentum kullanıldı' }),
      R.leanDrift({ warn: 8, reject: 14, text: 'Gövde başlangıç duruşundan öne/arkaya eğildi' }),
      R.leanDepthFront({ warn: -0.07, reject: -0.13 }),
      R.swayLateral({ warn: 5, reject: 10 }),
      R.kneeDip({ warn: 10, reject: 18 }),
      R.bounce({ warn: 0.1, reject: 0.18 }),
      R.symmetryWrist(),
    ],
  }),
  ex(47, 'cable-fly-high-low', 'Yukarıdan Aşağı Kablo Açışı', 'High to Low Cable Fly', 'Göğüs', 'cable-fly-high-low.png', {
    useProfile: true,
    plane: 'transverse', view: 'front', required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı karşına koy; kollar yukarıda açıkken eller kadrajda kalmalı.',
    startText: 'kollar yukarıda ve yanlarda açık',
    metric: { fn: 'wristSpread', global: true, start: 1.85, target: 0.9, label: 'Eller arası mesafe', romText: 'Eller önde birleştirilmedi', returnText: 'Kollar başlangıca kadar açılmadı' },
    tempo: { minBackMs: 650 },
    rules: [
      R.elbowAngleFixed({ warn: 20, reject: 35 }),
      { id: 'finish-height', measure: 'wristDrop', op: '<', agg: 'extreme', warn: 0.9, phase: ['peak'], label: 'Bitiş yüksekliği (alt göğüs)', text: 'Eller alt göğüs/göbek hizasına kadar indirilmedi', cue: 'Ellerini aşağı ve öne getir' },
      R.shrug({ warn: 0.1, reject: 0.17 }),
      R.sway({ warn: 8, reject: 15 }),
      R.symmetryWrist(),
    ],
  }),
  ex(48, 'dumbbell-fly', 'Dambıl Göğüs Açışı', 'Dumbbell Fly', 'Göğüs', 'dumbbell-fly.png', {
    posture: 'lying', plane: 'transverse', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda, sehpa hizasında.',
    startText: 'dambıllar göğüs üstünde',
    metric: { fn: 'wristAnt', start: 1.55, target: 0.45, label: 'Dambıl yüksekliği', romText: 'Kollar yeterince açılmadı (göğüs gerilmedi)', returnText: 'Dambıllar göğüs üstünde birleştirilmedi' },
    tempo: { minOutMs: 700, outText: 'Dambıllar hızlı indirildi — kontrollü aç' },
    rules: [
      R.elbowAngleFixed({ warn: 20, reject: 35, text: 'Dirsekler büküldü — hareket press’e döndü' }),
      { id: 'elbow-min', measure: 'elbowAngle', op: '<', warn: 125, reject: 105, minMs: 200, label: 'Dirsek hafif bükük', text: 'Dirsekler fazla bükük', cue: 'Kollarını biraz aç' },
      { id: 'overstretch', measure: 'wristAnt', op: '<', warn: -0.15, reject: -0.4, phase: ['peak'], minMs: 150, label: 'Aşırı gerilme', text: 'Dambıllar omuz seviyesinin altına indi — omuz zorlanır', cue: 'Bu kadar aşağı inme' },
      R.hipLift(),
      R.shrug({ warn: 0.11, reject: 0.18 }),
    ],
  }),
  ex(49, 'decline-push-up', 'Ayak Yükseltilmiş Şınav', 'Decline Push-Up', 'Göğüs', 'decline-push-up.png', {
    posture: 'prone', required: ['shoulder', 'elbow', 'wrist', 'hip', 'ankle'],
    setup: 'Kamera yere yakın, yanda. Baştan ayağa görünmeli.',
    startText: 'kollar düz, ayaklar yüksekte',
    metric: { fn: 'shoulderOverWrist', start: 1.35, target: 0.95, label: 'Omuz yüksekliği', romText: 'Yeterince inilmedi — göğsünü biraz daha indir', returnText: 'Kollar yukarıda tam açılmadı' },
    tempo: { minOutMs: 300 },
    rules: [
      R.bodyLine({ sagWarn: 15, sagReject: 26, pikeWarn: 20, pikeReject: 34 }),
      { id: 'pushup-flare', measure: 'armElev', op: '>', warn: 80, reject: 95, phase: ['peak'], bestView: 'side', minMs: 150, label: 'Dirsek açılması', text: 'Dirsekler gövdeye 90° açıldı', cue: 'Dirseklerini gövdene yaklaştır' },
      R.neck({ warn: 45 }),
      R.shrug({ warn: 0.15, reject: 0.25, text: 'Omuzlar kulağa doğru kalktı — kürek kemiklerini aşağı tut' }),
    ],
  }),

  // ======================= SIRT
  ex(6, 'lat-pulldown', 'Lat Çekiş', 'Lat Pulldown', 'Sırt', 'lat-pulldown.webp', {
    posture: 'seated', plane: 'frontal', view: 'side', viewAlt: ['front'], required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı karşına, yukarıdaki bar da görünecek şekilde koy.',
    startText: 'kollar yukarıda düz',
    metric: { fn: 'wristDrop', start: -1.5, target: -0.4, label: 'Bar yüksekliği', romText: 'Bar üst göğse (çene altına) kadar çekilmedi', returnText: 'Kollar yukarıda tam açılmadı' },
    tempo: { minBackMs: 700, backText: 'Bar hızlı bırakıldı — kontrollü yukarı bırak' },
    rules: [
      R.sway({ warn: 6, reject: 11, rejectConf: 0.5, text: 'Gövde öne-arkaya sallanarak çekildi — momentum kullanıldı' }),
      { id: 'elbows-down', measure: 'elbowDrop', op: '<', agg: 'extreme', warn: 0.45, reject: 0.25, phase: ['peak'], label: 'Dirsekler gövdeye doğru aşağı', text: 'Dirsekler gövdeye doğru aşağı çekilmedi', cue: 'Dirseklerini gövdene doğru aşağı çek' },
      R.leanDrift({ warn: 8, reject: 13, text: 'Gövde başlangıç duruşundan öne/arkaya eğildi' }),
      R.leanDepthFront(),
      { id: 'lean-back', measure: 'torsoLean', op: '<', warn: -18, reject: -28, bestView: 'side', minMs: 250, label: 'Geriye yaslanma (en fazla ~15-20°)', text: 'Geriye fazla yaslandın', cue: 'Gövdeni dikleştir' },
      R.shrug({ warn: 0.06, reject: 0.14, text: 'Çekişte omuzlar kulağa kalktı — kürek kemiklerini aşağı indir' }),
      R.symmetryWrist({ warn: 0.3, reject: 0.5 }),
      R.swayLateral(),
    ],
  }),
  ex(7, 'seated-cable-row', 'Oturarak Kablo Kürek', 'Seated Cable Row', 'Sırt', 'seated-cable-row.webp', {
    useProfile: true,
    posture: 'seated', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamerayı yanına, omuz hizasına koy.',
    startText: 'kollar önde düz, gövde dik', metric: rowMetric(95), tempo: { minBackMs: 650 }, rules: rowRules(),
  }),
  ex(8, 'barbell-row', 'Barla Eğilerek Kürek', 'Barbell Row', 'Sırt', 'barbell-row.webp', {
    posture: 'hinge', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda, bel hizasında. Baştan dizlere kadar görünmeli.',
    startText: 'öne eğilmiş, kollar aşağıda düz', metric: rowMetric(100), tempo: { minBackMs: 600 }, rules: rowRules({ hinge: true }),
  }),
  ex(9, 'one-arm-dumbbell-row', 'Tek Kol Dambıl Kürek', 'One Arm Dumbbell Row', 'Sırt', 'one-arm-dumbbell-row.webp', {
    posture: 'hinge', sides: 'single', allSides: true, required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda; çalışan kol kameraya yakın taraf olsun.',
    startText: 'kol aşağıda düz', metric: rowMetric(100), tempo: { minBackMs: 600 }, rules: rowRules({ hinge: true }),
  }),
  ex(10, 'assisted-pull-up', 'Destekli Barfiks', 'Assisted Pull-up', 'Sırt', 'assisted-pull-up.webp', {
    plane: 'frontal', view: 'front', required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı karşına, bar ve eller görünecek şekilde koy.',
    startText: 'kollar yukarıda düz asılı',
    metric: { fn: 'chinOverHands', global: true, start: -1.8, target: 0.0, label: 'Çene–bar', romText: 'Çene barın üstüne çıkmadı', returnText: 'Altta kollar tam açılmadı' },
    tempo: { minBackMs: 700 },
    rules: [
      { id: 'kip', measure: 'hipAngle', relative: 'range', op: '>', warn: 25, reject: 40, minMs: 150, label: 'Bacak savurma', text: 'Bacaklar/kalça savrularak çekildi', cue: 'Bacaklarını sabit tut' },
      R.sway({ warn: 7, reject: 13, rejectConf: 0.5, text: 'Vücut öne-arkaya sallanarak çekildi' }),
      R.leanDrift({ warn: 10, reject: 17, text: 'Gövde öne/arkaya eğildi — vücut dik asılı kalmalı' }),
      R.leanDepthFront(),
      R.swayLateral({ warn: 8, reject: 14, text: 'Vücut bir yana eğildi — iki kolla eşit çek' }),
      R.shrug({ warn: 0.06, reject: 0.14, text: 'Çekerken omuzlar kulağa kalktı — kürek kemiklerini aşağı çek' }),
    ],
  }),
  ex(55, 'pull-up', 'Barfiks', 'Pull-Up', 'Sırt', 'pull-up.png', {
    plane: 'frontal', view: 'front', required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı karşına, bar ve eller görünecek şekilde koy.',
    startText: 'kollar yukarıda düz asılı',
    metric: { fn: 'chinOverHands', global: true, start: -1.8, target: 0.0, label: 'Çene–bar', romText: 'Çene barın üstüne çıkmadı', returnText: 'Altta kollar tam açılmadı (ölü asılma)' },
    tempo: { minBackMs: 700 },
    rules: [
      { id: 'kip', measure: 'hipAngle', relative: 'range', op: '>', warn: 25, reject: 40, minMs: 150, label: 'Bacak savurma (kipping)', text: 'Bacaklar/kalça savrularak çekildi (kipping)', cue: 'Bacaklarını sabit tut' },
      R.sway({ warn: 7, reject: 13, rejectConf: 0.5, text: 'Vücut öne-arkaya sallanarak çekildi' }),
      R.leanDrift({ warn: 10, reject: 17, text: 'Gövde öne/arkaya eğildi — vücut dik asılı kalmalı' }),
      R.leanDepthFront(),
      R.swayLateral({ warn: 8, reject: 14, text: 'Vücut bir yana eğildi — iki kolla eşit çek' }),
      R.shrug({ warn: 0.06, reject: 0.14, text: 'Çekerken omuzlar kulağa kalktı — kürek kemiklerini aşağı çek' }),
    ],
  }),
  ex(56, 'chin-up', 'Ters Tutuş Barfiks', 'Chin-Up', 'Sırt', 'chin-up.png', {
    plane: 'frontal', view: 'front', required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı karşına, bar ve eller görünecek şekilde koy.',
    startText: 'kollar yukarıda düz asılı',
    metric: { fn: 'chinOverHands', global: true, start: -1.8, target: 0.0, label: 'Çene–bar', romText: 'Çene barın üstüne çıkmadı', returnText: 'Altta kollar tam açılmadı' },
    tempo: { minBackMs: 700 },
    rules: [
      { id: 'kip', measure: 'hipAngle', relative: 'range', op: '>', warn: 25, reject: 40, minMs: 150, label: 'Bacak savurma', text: 'Bacaklar/kalça savrularak çekildi', cue: 'Bacaklarını sabit tut' },
      R.sway({ warn: 7, reject: 13, rejectConf: 0.5, text: 'Vücut öne-arkaya sallanarak çekildi' }),
      R.leanDrift({ warn: 10, reject: 17, text: 'Gövde öne/arkaya eğildi — vücut dik asılı kalmalı' }),
      R.leanDepthFront(),
      R.swayLateral({ warn: 8, reject: 14 }),
      R.shrug({ warn: 0.06, reject: 0.14, text: 'Çekerken omuzlar kulağa kalktı — kürek kemiklerini aşağı çek' }),
    ],
  }),
  ex(57, 'chest-supported-row', 'Göğüs Destekli Dambıl Row', 'Chest Supported Row', 'Sırt', 'chest-supported-row.png', {
    posture: 'prone', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda, sehpa hizasında.',
    startText: 'göğüs pedde, kollar aşağıda düz', metric: rowMetric(100), tempo: { minBackMs: 600 }, rules: rowRules({ supported: true }),
  }),
  ex(58, 't-bar-row', 'T-Bar Row', 'T-Bar Row', 'Sırt', 't-bar-row.png', {
    posture: 'hinge', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda, bel hizasında.',
    startText: 'öne eğilmiş, kollar aşağıda düz', metric: rowMetric(100), tempo: { minBackMs: 600 }, rules: rowRules({ hinge: true }),
  }),

  // ======================= OMUZ
  ex(11, 'shoulder-press', 'Omuz Press', 'Shoulder Press', 'Omuz', 'shoulder-press.webp', {
    plane: 'frontal', view: 'front', required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı tam karşına koy; kollar yukarıdayken eller kadrajda kalmalı.',
    startText: 'dambıllar omuz hizasında, dirsekler bükülü',
    metric: { fn: 'elbowAngle', start: 90, target: 155, label: 'Dirsek açısı', romText: 'Kollar yukarıda tam açılmadı', returnText: 'Ağırlık omuz hizasına kadar indirilmedi' },
    tempo: { minBackMs: 600, backText: 'Ağırlık hızlı indirildi — kontrollü indir' },
    rules: [
      R.symmetryWrist({ warn: 0.35, reject: 0.6 }),
      { id: 'forearm-vertical', measure: 'forearmTilt', op: '>', warn: 20, reject: 35, views: ['front'], minMs: 200, label: 'Ön kol dik (bilek dirseğin üstünde)', text: 'Bilekler dirseklerin üstünde değil — ön kollar dik olmalı', cue: 'Bileklerini dirseğinin üstüne al' },
      // dirseklerin gövdenin önüne gelmesi (önden: üst kolun kameraya doğru kısalması; yandan: doğrudan).
      // Doğru press'te dirsekler omuz hattından en fazla ~20-30° öndedir.
      {
        id: 'elbows-front', measure: 'armFrontalDev', op: '>', warn: 38, reject: 50, minMs: 200,
        label: 'Dirsekler yanda (gövdenin önünde değil)', text: 'Dirsekler gövdenin önüne geldi — dirsekler yanda, omuz hizasında olmalı', cue: 'Dirseklerini yana aç',
      },
      {
        id: 'press-overhead', measure: 'armElev', op: '<', agg: 'extreme', warn: 155, reject: 145, phase: ['peak'],
        label: 'Kollar tam baş üstünde', text: 'Kollar başın üstüne değil öne doğru uzatıldı', cue: 'Ağırlığı tam başının üstüne it',
      },
      { id: 'arch', measure: 'torsoPitch', relative: 'rep', op: '<', warn: -7, reject: -13, bestView: 'side', minMs: 150, label: 'Bel kavisi / geriye yaslanma', text: 'Belini büküp geriye yaslandın', cue: 'Karnını sık, geriye yaslanma' },
      R.kneeDip({ warn: 12, reject: 22 }),
      R.swayLateral(),
      // yana dambıl açış referansı, çok az daha toleranslı (baş üstünde doğal omuz yükselmesi için pay)
      R.shrug({ warn: 0.13, reject: 0.22, raiseAllowance: 0.091, allowanceCap: 1, text: 'Omuzlar kulağa kalktı — omuzları aşağıda tut' }),
      // dirseklerin birbirine yaklaşması = kolların gövdenin önünden kalkması
      {
        id: 'elbows-close', measure: 'elbowSpread', op: '<', warn: 1.45, reject: 1.25, phase: ['out', 'back'], views: ['front', 'oblique'], bestView: 'front', minMs: 200,
        label: 'Dirsekler birbirinden uzak (yanda)', text: 'Dirsekler birbirine yaklaştı — kollar gövdenin önünden kalkıyor, dirsekleri yana aç', cue: 'Dirseklerini yana aç',
      },
    ],
  }),
  ex(12, 'lateral-raise', 'Yana Dambıl Açış', 'Dumbbell Lateral Raise', 'Omuz', 'lateral-raise.webp', {
    ...sideRaiseDef(true),
    setup: 'Kamerayı tam karşına koy; kollar yandayken eller kadrajda kalmalı.',
    startText: 'kollar yanda aşağıda',
  }),
  ex(13, 'front-raise', 'Öne Dambıl Kaldırış', 'Front Raise', 'Omuz', 'front-raise.webp', {
    plane: 'sagittal', view: 'side', viewAlt: ['front'], required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı yanına koy (önden de çalışır ama salınım yandan daha iyi ölçülür).',
    startText: 'kollar önde aşağıda', metric: raiseMetric(), tempo: raiseTempo,
    // salınım/kayma ve dirsek açısı biraz gevşetildi
    // omuz üstüne çıkma artık ret; kolların yana açılması (gövde önünden değil) ret
    rules: raiseRules({
      side: 'front', swayLimits: [10, 18], elbowMin: [132, 108], elbowFixed: [25, 40],
      tooHigh: [100, 118], frontPlane: [30, 45], frontPlanePhase: ['out', 'peak'],
    }),
  }),
  ex(14, 'reverse-pec-deck', 'Ters Pec Deck', 'Reverse Pec Deck', 'Omuz', 'reverse-pec-deck.webp', {
    useProfile: true,
    posture: 'seated', plane: 'transverse', required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı yanına, omuz hizasına koy.',
    startText: 'kollar önde, tutamaklarda',
    metric: { fn: 'wristAnt', start: 1.5, target: 0.35, label: 'Kol açılması', romText: 'Kollar yanlara kadar açılmadı', returnText: 'Kollar öne tam dönmedi' },
    tempo: { minBackMs: 650 },
    rules: [
      { id: 'arm-height-low', measure: 'elbowDrop', op: '>', warn: 0.45, reject: 0.7, minMs: 200, label: 'Kol yüksekliği (omuz hizası)', text: 'Kollar omuz hizasının altına düştü', cue: 'Kollarını omuz hizasında tut' },
      { id: 'arm-height-high', measure: 'elbowDrop', op: '<', warn: -0.4, minMs: 200, label: 'Kol yüksekliği (fazla yukarı)', text: 'Kollar omuzun üstüne çıktı', cue: 'Kollarını omuz hizasına indir' },
      R.sway({ warn: 6, reject: 11, rejectConf: 0.55, text: 'Gövde öne-arkaya sallandı — göğsünü pedden ayırma' }),
      R.leanDrift({ warn: 8, reject: 13, text: 'Gövde öne eğildi / geriye yattı — göğüs pedde sabit kalmalı' }),
      R.shrug({ warn: 0.1, reject: 0.17, raiseAllowance: 0.07, allowanceCap: 1, text: 'Omuzlar kulağa kalktı — trapez devreye girdi' }),
    ],
  }),
  ex(15, 'face-pull', 'Yüze Kablo Çekiş', 'Face Pull', 'Omuz', 'face-pull.webp', {
    useProfile: true,
    plane: 'transverse', view: 'side', viewAlt: ['front'], required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı yanına, omuz hizasına koy.',
    startText: 'kollar önde düz, ip yüz hizasında',
    metric: { fn: 'elbowAngle', start: 155, target: 95, label: 'Dirsek açısı', romText: 'İp yüze kadar çekilmedi', returnText: 'Kollar önde tam açılmadı' },
    tempo: { minBackMs: 600 },
    rules: [
      { id: 'elbow-high', measure: 'elbowDrop', op: '>', warn: 0.3, reject: 0.55, phase: ['peak'], minMs: 150, label: 'Dirsekler yüksekte', text: 'Dirsekler omuz hizasının altına düştü — dirsekler yüksek olmalı', cue: 'Dirseklerini kaldır' },
      { id: 'ext-rot', measure: 'wristOverElbow', op: '<', warn: 0.1, agg: 'extreme', phase: ['peak'], label: 'Eller dirseğin üstünde (dış rotasyon)', text: 'Eller kulak hizasına açılmadı — dış rotasyon eksik', cue: 'Ellerini kulaklarına doğru aç' },
      R.sway({ warn: 6, reject: 11, rejectConf: 0.55, text: 'Gövde öne-arkaya sallanarak çekildi' }),
      R.leanDrift({ warn: 8, reject: 13, text: 'Gövde başlangıç duruşundan öne/arkaya eğildi' }),
      { id: 'upright', measure: 'torsoLean', op: '>', abs: true, warn: 15, reject: 25, bestView: 'side', minMs: 300, label: 'Gövde dik', text: 'Gövde öne/arkaya eğik — dik dur', cue: 'Dik dur' },
      R.shrug({ warn: 0.08, reject: 0.15, raiseAllowance: 0.03, allowanceCap: 1, text: 'Omuzlar kulağa kalktı — trapez devreye girdi' }),
    ],
  }),
  ex(59, 'cable-lateral-raise', 'Kabloyla Yan Omuz Açış', 'Cable Lateral Raise', 'Omuz', 'cable-lateral-raise.png', {
    ...sideRaiseDef(false),
    setup: 'Kamerayı tam karşına koy.',
    startText: 'çalışan kol aşağıda',
  }),
  ex(60, 'rear-delt-fly', 'Öne Eğilerek Arka Omuz Açış', 'Bent Over Rear Delt Fly', 'Omuz', 'rear-delt-fly.png', {
    posture: 'hinge', plane: 'transverse', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda, bel hizasında.',
    startText: 'öne eğilmiş, kollar aşağıda',
    metric: { fn: 'wristAnt', start: 1.5, target: 0.4, label: 'Kol açılması', romText: 'Kollar yanlara omuz hizasına kadar açılmadı', returnText: 'Kollar aşağı tam inmedi' },
    tempo: { minOutMs: 400, minBackMs: 600 },
    rules: [
      R.leanMin({ warn: 45, text: 'Gövde fazla dik — öne daha çok eğil (yere yakın paralel)' }),
      R.sway({ warn: 8, reject: 15, text: 'Gövde kaldırılarak/sallanarak açıldı' }),
      R.elbowAngleFixed({ warn: 20, reject: 35 }),
      R.shrug({ warn: 0.1, reject: 0.17 }),
    ],
  }),
  ex(61, 'leaning-lateral-raise', 'Yana Eğilerek Omuz Açış', 'Leaning Lateral Raise', 'Omuz', 'leaning-lateral-raise.png', {
    plane: 'frontal', view: 'front', sides: 'single', required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı tam karşına koy; ayaklar ve kalça da görünsün (eğim açısı buradan ölçülür). Bir elinle direğe tutun, gövdeni 15-30° yana (çalışan kol tarafına) yatır.',
    startText: 'gövde yana eğik (15-30°), çalışan kol aşağıda',
    // Kol açısı gövdeye göre ölçülür; yana eğik gövdede kol sarkarken bile gövdeyle ~eğim kadar açı yapar.
    // Bu yüzden başlangıç 30°, hedef 85° (gövdeye göre omuz hizası), üst sınır 115°.
    metric: { ...raiseMetric(), start: 30, target: 85 },
    tempo: raiseTempo,
    rules: [
      // yana dambıl açış referansı (dirsek toleransı ve silkme aynı); gövde yana eğik olduğu için yana kayma kuralı yerine eğim kuralları
      ...raiseRules({ roll: false, elbowMin: [125, 100], elbowFixed: [30, 50], tooHigh: [115], shrugOpts: { warn: 0.075, reject: 0.09 } }),
      {
        id: 'lean-required', measure: 'sideLean', op: '<', warn: 13, reject: 8, phase: 'active', views: ['front', 'oblique'], bestView: 'front', minMs: 300,
        label: 'Gövdenin yana eğik olması (≥ ~15°)', text: 'Gövde yana eğilmedi — hareketin amacı gövdeyi yana yatırarak yapmak', cue: 'Gövdeni yana yatır',
      },
      {
        id: 'lean-too-much', measure: 'sideLean', op: '>', warn: 40, phase: 'active', views: ['front', 'oblique'], minMs: 300,
        label: 'Aşırı yana eğilme', text: 'Gövde fazla yana yatırıldı (15-30° yeterli)', cue: 'Biraz dikleş',
      },
      {
        id: 'lean-stable', measure: 'sideLean', relative: 'range', op: '>', warn: 8, reject: 14, views: ['front', 'oblique'], bestView: 'front', minMs: 150,
        label: 'Eğim açısının sabit kalması', text: 'Eğim açısı tekrar sırasında değişti — gövdeyle sallanarak kaldırıldı', cue: 'Gövdeni sabit tut',
      },
    ],
  }),

  // ======================= BICEPS
  ex(16, 'dumbbell-curl', 'Dambıl Biceps Kıvırma', 'Dumbbell Curl', 'Biceps', 'dumbbell-curl.webp', {
    useProfile: true,
    viewAlt: ['front'], required: ['shoulder', 'elbow', 'wrist'],
    setup: 'En iyi: kamera yanda (dirsek ve salınım). Önden: dirseğin yana açılması ve omuz silkme.',
    startText: 'kollar aşağıda düz', metric: curlMetric(70), tempo: curlTempo, rules: curlRules(),
  }),
  ex(17, 'barbell-curl', 'Barla Biceps Kıvırma', 'Barbell Curl', 'Biceps', 'barbell-curl.webp', {
    useProfile: true,
    viewAlt: ['front'], required: ['shoulder', 'elbow', 'wrist'],
    setup: 'En iyi: kamera yanda. Önden: dirsek açılması ve simetri.',
    startText: 'bar aşağıda, kollar düz', metric: curlMetric(70), tempo: curlTempo, rules: [...curlRules(), R.symmetryWrist({ warn: 0.3, reject: 0.5 })],
  }),
  ex(18, 'hammer-curl', 'Çekiç Kıvırma', 'Hammer Curl', 'Biceps', 'hammer-curl.webp', {
    useProfile: true,
    viewAlt: ['front'], required: ['shoulder', 'elbow', 'wrist'],
    setup: 'En iyi: kamera yanda.',
    startText: 'kollar aşağıda düz', metric: curlMetric(75), tempo: curlTempo, rules: curlRules(),
  }),
  ex(19, 'cable-curl', 'Kablo Biceps Kıvırma', 'Cable Curl', 'Biceps', 'cable-curl.webp', {
    useProfile: true,
    viewAlt: ['front'], required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamera yanda.',
    startText: 'kollar aşağıda düz', metric: curlMetric(70), tempo: curlTempo, rules: curlRules(),
  }),
  ex(62, 'preacher-curl', 'Preacher Biceps Curl', 'Preacher Curl', 'Biceps', 'preacher-curl.png', {
    useProfile: true,
    posture: 'seated', required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamera yanda, sehpa hizasında.',
    startText: 'kollar pedde, neredeyse düz',
    metric: { ...curlMetric(65), start: 145 },
    tempo: curlTempo,
    rules: [
      strict(R.elbowDrift({ warn: 10, reject: 17, text: 'Üst kol pedden kalktı / omuz öne itildi' })),
      R.sway({ warn: 8, reject: 14, text: 'Gövdeyle çekildi' }),
      R.shrug({ warn: 0.1, reject: 0.17 }),
    ],
  }),
  ex(63, 'incline-dumbbell-curl', 'Eğimli Sehpa Biceps Curl', 'Incline Dumbbell Curl', 'Biceps', 'incline-dumbbell-curl.png', {
    posture: 'lying', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda, sehpa hizasında.',
    startText: 'kollar aşağı sarkık, düz', metric: curlMetric(75), tempo: curlTempo,
    rules: [
      strict(R.elbowDrift({ warn: 10, reject: 18, text: 'Dirsek öne geldi — üst kol yere dik sarkık kalmalı' })),
      R.sway({ warn: 7, reject: 13, text: 'Sırt sehpadan kalktı' }),
      R.shrug({ warn: 0.12, reject: 0.2 }),
    ],
  }),
  ex(64, 'concentration-curl', 'Konsantrasyon Biceps Curl', 'Concentration Curl', 'Biceps', 'concentration-curl.png', {
    useProfile: true,
    posture: 'seated', sides: 'single', allSides: true, required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamera yanda; çalışan kol kameraya yakın olsun.',
    startText: 'dirsek uylukta, kol düz', metric: curlMetric(70), tempo: curlTempo,
    rules: [
      strict(R.elbowDrift({ warn: 8, reject: 15, text: 'Dirsek uyluktan kaydı — dirsek sabit kalmalı' })),
      R.sway({ warn: 8, reject: 15, text: 'Gövde kaldırılarak çekildi' }),
      R.shrug({ warn: 0.1, reject: 0.17 }),
    ],
  }),
  ex(65, 'bayesian-cable-curl', 'Arkadan Kablo Biceps Curl', 'Bayesian Cable Curl', 'Biceps', 'bayesian-cable-curl.png', {
    useProfile: true,
    sides: 'single', allSides: true, required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamera yanda; çalışan kol kameraya yakın olsun.',
    startText: 'kol gövdenin arkasında düz', metric: curlMetric(75), tempo: curlTempo,
    rules: [
      strict(R.elbowDrift({ warn: 10, reject: 18, text: 'Dirsek öne geldi — kol gövdenin arkasında sabit kalmalı' })),
      { id: 'arm-behind', measure: 'armFlex', op: '>', warn: 5, reject: 20, bestView: 'side', minMs: 200, label: 'Kol gövdenin arkasında', text: 'Üst kol gövdenin önüne geçti', cue: 'Dirseğini geride tut' },
      R.sway({ warn: 7, reject: 13 }),
      R.shrug({ warn: 0.1, reject: 0.17 }),
    ],
  }),
  ex(66, 'spider-curl', 'Spider Biceps Curl', 'Spider Curl', 'Biceps', 'spider-curl.png', {
    posture: 'prone', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda, sehpa hizasında.',
    startText: 'göğüs pedde, kollar aşağı sarkık', metric: curlMetric(70), tempo: curlTempo,
    rules: [
      strict(R.elbowDrift({ warn: 10, reject: 18, text: 'Dirsek hareket etti — üst kol yere dik kalmalı' })),
      R.sway({ warn: 6, reject: 12, text: 'Göğüs pedden kalktı' }),
      R.shrug({ warn: 0.12, reject: 0.2 }),
    ],
  }),

  // ======================= TRICEPS
  ex(20, 'cable-pushdown', 'Kablo Triceps İtiş', 'Cable Pushdown', 'Triceps', 'cable-pushdown.webp', {
    useProfile: true,
    viewAlt: ['front'], required: ['shoulder', 'elbow', 'wrist'],
    setup: 'En iyi: kamera yanda (dirsek sabitliği ve gövde eğimi). Önden: dirseklerin açılması.',
    startText: 'dirsekler 90° bükülü, ön kol yere paralel', metric: pushdownMetric(160),
    tempo: { minBackMs: 600, backText: 'Ağırlık hızlı yukarı bırakıldı — kontrollü dön' }, rules: pushdownRules(),
  }),
  ex(21, 'overhead-triceps-extension', 'Baş Üstü Triceps Açış', 'Overhead Triceps Extension', 'Triceps', 'overhead-triceps-extension.webp', {
    viewAlt: ['front'], required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamera yanda; kollar yukarıdayken eller kadrajda kalmalı.',
    startText: 'kollar baş üstünde düz',
    metric: { fn: 'elbowAngle', start: 160, target: 90, label: 'Dirsek açısı', romText: 'Ağırlık başın arkasına yeterince indirilmedi (dirsek ~90°)', returnText: 'Kollar yukarıda tam açılmadı' },
    tempo: { minOutMs: 600, outText: 'Ağırlık hızlı indirildi — kontrollü indir' },
    rules: [
      { id: 'upper-arm-vertical', measure: 'armElev', op: '<', warn: 145, reject: 130, minMs: 200, label: 'Üst kol başın yanında dik', text: 'Dirsekler öne düştü — üst kol başın yanında dik kalmalı', cue: 'Dirseklerini tavana doğru tut' },
      strict(R.elbowDrift({ warn: 10, reject: 18 })),
      { id: 'elbow-wide', measure: 'elbowOut', op: '>', warn: 0.35, reject: 0.55, views: ['front'], minMs: 200, label: 'Dirseklerin yana açılması', text: 'Dirsekler yana açıldı — başına yakın tut', cue: 'Dirseklerini içeride tut' },
      { id: 'arch', measure: 'torsoPitch', relative: 'rep', op: '<', warn: -7, reject: -13, bestView: 'side', minMs: 150, label: 'Bel kavisi', text: 'Bel aşırı büküldü — karnını sık', cue: 'Karnını sık' },
      R.shrug({ warn: 0.12, reject: 0.2 }),
    ],
  }),
  ex(22, 'bench-dip', 'Sehpa Dip', 'Bench Dip', 'Triceps', 'bench-dip.webp', {
    posture: 'seated', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda.',
    startText: 'kollar düz, eller sehpada',
    metric: { fn: 'elbowAngle', start: 160, target: 95, label: 'Dirsek açısı', romText: 'Yeterince inilmedi — dirsekler 90° bükülmeli', returnText: 'Kollar yukarıda tam açılmadı' },
    tempo: { minOutMs: 500 },
    rules: [
      { id: 'too-deep', measure: 'elbowAngle', op: '<', warn: 75, reject: 60, phase: ['peak'], minMs: 150, label: 'Aşırı derinlik', text: 'Çok derine inildi — omuz önü zorlanır', cue: 'Bu kadar inme' },
      R.leanMax({ warn: 25, reject: 40, text: 'Gövde öne eğildi — sırtın sehpaya yakın ve dik olmalı' }),
      R.shrug({ warn: 0.13, reject: 0.21, phase: ['peak', 'back'], text: 'Altta omuzlar kulağa çöktü' }),
      { id: 'hips-away', measure: 'barDistance', op: '<', warn: -0.8, views: ['side'], minMs: 300, label: 'Kalçanın sehpaya yakınlığı', text: 'Kalça sehpadan uzaklaştı — vücudunu sehpaya yakın tut', cue: 'Sırtını sehpaya yaklaştır' },
    ],
  }),
  ex(23, 'close-grip-bench-press', 'Dar Tutuş Bench Press', 'Close Grip Bench Press', 'Triceps', 'close-grip-bench-press.webp', {
    posture: 'lying', plane: 'transverse', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda, sehpa hizasında.',
    startText: 'kollar yukarıda düz', metric: benchMetric(0.6), tempo: benchTempo,
    rules: benchRules({ flare: [50, 65], tuck: false }).map((r) => (r.id === 'bench-flare'
      ? { ...r, label: 'Dirsekler gövdeye yakın (≤45°)', text: 'Dirsekler açıldı — dar tutuşta dirsekler gövdeye yakın olmalı', cue: 'Dirseklerini gövdene yapıştır' } : r)),
  }),
  ex(50, 'rope-pushdown', 'İple Triceps İtiş', 'Rope Pushdown', 'Triceps', 'rope-pushdown.png', {
    useProfile: true,
    viewAlt: ['front'], required: ['shoulder', 'elbow', 'wrist'],
    setup: 'En iyi: kamera yanda.',
    startText: 'dirsekler 90° bükülü', metric: pushdownMetric(162), tempo: { minBackMs: 600 }, rules: pushdownRules(),
  }),
  ex(51, 'single-arm-cable-pushdown', 'Tek Kol Kablo Triceps İtiş', 'Single Arm Cable Pushdown', 'Triceps', 'single-arm-cable-pushdown.png', {
    useProfile: true,
    sides: 'single', allSides: true, viewAlt: ['front'], required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamera yanda; çalışan kol kameraya yakın olsun.',
    startText: 'dirsek 90° bükülü', metric: pushdownMetric(160), tempo: { minBackMs: 600 }, rules: pushdownRules(),
  }),
  ex(52, 'lying-triceps-extension', 'Yatarak Triceps Açış', 'Lying Triceps Extension', 'Triceps', 'skull-crusher.png', {
    posture: 'lying', required: ['shoulder', 'elbow', 'wrist', 'hip'],
    setup: 'Kamera yanda, sehpa hizasında.',
    startText: 'kollar yukarıda düz',
    metric: { fn: 'elbowAngle', start: 160, target: 85, label: 'Dirsek açısı', romText: 'Ağırlık alna/başa kadar indirilmedi', returnText: 'Kollar yukarıda tam açılmadı' },
    tempo: { minOutMs: 600 },
    rules: [
      strict(R.elbowDrift({ warn: 10, reject: 18, text: 'Üst kol hareket etti — dirsekler tavana bakarak sabit kalmalı' })),
      { id: 'elbow-toward-feet', measure: 'armElev', op: '<', warn: 65, reject: 50, minMs: 200, label: 'Üst kol açısı', text: 'Dirsekler ayaklara doğru kaydı — hareket press’e döndü', cue: 'Dirseklerini geride tut' },
      R.hipLift(),
      R.shrug({ warn: 0.12, reject: 0.2 }),
    ],
  }),
  ex(53, 'overhead-cable-extension', 'Baş Üstü Kablo Triceps', 'Overhead Cable Extension', 'Triceps', 'overhead-cable-extension.png', {
    viewAlt: ['front'], required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamera yanda.',
    startText: 'dirsekler bükülü, eller başın arkasında',
    metric: { fn: 'elbowAngle', start: 75, target: 155, label: 'Dirsek açısı', romText: 'Kollar tam açılmadı', returnText: 'Eller başın arkasına kadar geri gelmedi' },
    tempo: { minBackMs: 600 },
    rules: [
      { id: 'upper-arm-vertical', measure: 'armElev', op: '<', warn: 130, reject: 115, minMs: 200, label: 'Üst kol başın yanında', text: 'Dirsekler aşağı düştü — üst kol başın yanında kalmalı', cue: 'Dirseklerini yukarıda tut' },
      strict(R.elbowDrift({ warn: 10, reject: 18 })),
      { id: 'elbow-wide', measure: 'elbowOut', op: '>', warn: 0.35, reject: 0.55, views: ['front'], minMs: 200, label: 'Dirseklerin açılması', text: 'Dirsekler yana açıldı', cue: 'Dirseklerini içeride tut' },
      R.sway({ warn: 8, reject: 15 }),
      R.shrug({ warn: 0.12, reject: 0.2 }),
    ],
  }),
  ex(54, 'parallel-bar-dip', 'Paralel Bar Dip', 'Parallel Bar Dip', 'Triceps', 'parallel-bar-dip.png', {
    required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamera yanda; alt pozisyonda da dirsekler görünmeli.',
    startText: 'kollar düz, vücut barların üstünde',
    metric: { fn: 'elbowAngle', start: 160, target: 95, label: 'Dirsek açısı', romText: 'Yeterince inilmedi — üst kol yere paralel olmalı', returnText: 'Kollar yukarıda tam açılmadı' },
    tempo: { minOutMs: 500 },
    rules: [
      { id: 'too-deep', measure: 'elbowAngle', op: '<', warn: 70, phase: ['peak'], minMs: 150, label: 'Aşırı derinlik', text: 'Çok derine inildi — omuz önü zorlanır', cue: 'Bu kadar inme' },
      R.shrug({ warn: 0.13, reject: 0.21, phase: ['peak', 'back'], text: 'Altta omuzlar kulağa çöktü' }),
      { id: 'leg-swing', measure: 'kneeSwing', relative: 'range', op: '>', warn: 0.5, reject: 0.9, minMs: 150, label: 'Bacak savurma', text: 'Bacaklar savrularak itildi', cue: 'Bacaklarını sabit tut' },
      R.leanMax({ warn: 45, text: 'Gövde fazla öne eğik (triceps yerine göğüs çalışıyor)' }),
    ],
  }),

  // ======================= BACAK
  ex(24, 'squat', 'Çömelme', 'Squat', 'Bacak', 'squat.webp', {
    viewAlt: ['front'], required: ['hip', 'knee', 'ankle'],
    setup: 'Kamerayı yanına, diz hizasına koy; baştan ayağa görünsün. Önden: dizlerin içe kaçması ve ayak aralığı.',
    startText: 'dik dur', metric: squatMetric(100),
    tempo: { minOutMs: 600, outText: 'Hızlı çöküldü — kontrollü in' }, rules: squatRules(),
  }),
  ex(25, 'leg-press', 'Bacak Press', 'Leg Press', 'Bacak', 'leg-press.webp', {
    posture: 'seated', viewAlt: ['front'], required: ['hip', 'knee', 'ankle'],
    setup: 'Kamerayı makinenin yanına koy; kalça, diz ve ayak görünsün.',
    startText: 'bacaklar açık (kilitlemeden)',
    metric: { fn: 'kneeAngle', start: 155, target: 95, label: 'Diz açısı', romText: 'Ağırlık yeterince indirilmedi — dizler 90°', returnText: 'Bacaklar tam açılmadı' },
    tempo: { minOutMs: 650, outText: 'Ağırlık hızlı indirildi' },
    rules: [
      { id: 'lockout', measure: 'kneeAngle', op: '>', warn: 177, minMs: 250, views: ['side'], label: 'Dizleri kilitlememe', text: 'Dizler tamamen kilitlendi — hafif bükük bırak', cue: 'Dizlerini kilitleme' },
      { id: 'butt-lift', measure: 'hipAngle', op: '<', warn: 55, reject: 45, phase: ['peak'], views: ['side'], minMs: 150, label: 'Kalçanın pedde kalması', text: 'Çok derine inildi — kalça/bel pedden kalkıyor', cue: 'Bu kadar inme' },
      R.valgus(),
      R.feetLevel(),
    ],
  }),
  ex(26, 'leg-extension', 'Bacak Açma', 'Leg Extension', 'Bacak', 'leg-extension.webp', {
    posture: 'seated', required: ['hip', 'knee', 'ankle'],
    setup: 'Kamera yanda, diz hizasında.',
    startText: 'dizler 90° bükülü',
    metric: { fn: 'kneeAngle', start: 95, target: 160, label: 'Diz açısı', romText: 'Bacak tam uzatılmadı', returnText: 'Ağırlık başlangıca kadar indirilmedi' },
    tempo: { minOutMs: 400, minBackMs: 700, backText: 'Ağırlık hızlı bırakıldı' },
    rules: [
      { id: 'hip-lift', measure: 'hipAngle', relative: 'range', op: '>', warn: 12, reject: 20, minMs: 150, label: 'Kalçanın koltukta kalması', text: 'Kalça koltuktan kalktı', cue: 'Kalçanı koltukta tut' },
      R.sway({ warn: 8, reject: 15, text: 'Gövdeyle sallanarak kaldırıldı' }),
    ],
  }),
  ex(27, 'leg-curl', 'Bacak Bükme', 'Leg Curl', 'Bacak', 'leg-curl.webp', {
    posture: 'prone', required: ['hip', 'knee', 'ankle'],
    setup: 'Kamera yanda, makine hizasında.',
    startText: 'bacaklar düz',
    metric: { fn: 'kneeAngle', start: 160, target: 85, label: 'Diz açısı', romText: 'Topuklar kalçaya yeterince yaklaşmadı', returnText: 'Bacaklar tam açılmadı' },
    tempo: { minBackMs: 700 },
    rules: [
      { id: 'hip-up', measure: 'hipAngle', relative: 'range', op: '>', warn: 12, reject: 20, minMs: 150, label: 'Kalçanın pedde kalması', text: 'Kalça pedden kalktı', cue: 'Kalçanı pede bastır' },
    ],
  }),
  ex(28, 'calf-raise', 'Baldır Yükseltme', 'Calf Raise', 'Bacak', 'calf-raise.webp', {
    required: ['knee', 'ankle', 'heel', 'toe'],
    setup: 'Kamera yanda, yere yakın; ayaklar net görünsün.',
    startText: 'topuklar aşağıda',
    metric: { fn: 'heelRise', start: 0.02, target: 0.2, label: 'Topuk yüksekliği', romText: 'Topuklar yeterince yükseltilmedi', returnText: 'Topuklar tam indirilmedi' },
    tempo: { minPeakMs: 250, peakText: 'Tepede kısa bir an bekle', minBackMs: 500 },
    rules: [
      { id: 'knee-straight', measure: 'kneeAngle', op: '<', warn: 155, reject: 140, minMs: 200, label: 'Dizler düz', text: 'Dizler bükülerek yaylanıldı — itiş baldırdan olmalı', cue: 'Dizlerini düz tut' },
      R.sway({ warn: 8, reject: 15 }),
    ],
  }),
  ex(29, 'walking-lunge', 'Yürüyen Hamle', 'Walking Lunge', 'Bacak', 'walking-lunge.webp', {
    allSides: true, required: ['hip', 'knee', 'ankle'],
    setup: 'Kamerayı yanına uzağa koy; yürüme alanı boyunca baştan ayağa görünsün.',
    startText: 'dik dur',
    metric: { fn: 'frontKnee', global: true, start: 160, target: 100, label: 'Öndeki diz açısı', romText: 'Yeterince inilmedi — öndeki diz 90° olmalı', returnText: 'Adım sonunda tam dikleşilmedi' },
    tempo: { minOutMs: 500 }, rules: lungeRules(),
  }),
  ex(67, 'goblet-squat', 'Goblet Squat', 'Goblet Squat', 'Bacak', 'goblet-squat.png', {
    viewAlt: ['front'], required: ['hip', 'knee', 'ankle'],
    setup: 'Kamera yanda, diz hizasında; baştan ayağa görünsün.',
    startText: 'dik dur, ağırlık göğüste', metric: squatMetric(95), tempo: { minOutMs: 600 }, rules: squatRules({ leanWarn: 40, leanReject: 55 }),
  }),
  ex(68, 'bulgarian-split-squat', 'Bulgar Split Squat', 'Bulgarian Split Squat', 'Bacak', 'bulgarian-split-squat.png', {
    allSides: true, required: ['hip', 'knee', 'ankle'],
    setup: 'Kamera yanda; iki bacak ve sehpa görünsün.',
    startText: 'arka ayak sehpada, dik dur',
    metric: { fn: 'frontKnee', global: true, start: 155, target: 100, label: 'Öndeki diz açısı', romText: 'Yeterince inilmedi — öndeki uyluk yere paralel olmalı', returnText: 'Tam dikleşilmedi' },
    tempo: { minOutMs: 550 }, rules: lungeRules({ leanWarn: 35, leanReject: 50 }),
  }),
  ex(69, 'hack-squat', 'Hack Squat Makinesi', 'Hack Squat', 'Bacak', 'hack-squat.png', {
    viewAlt: ['front'], required: ['hip', 'knee', 'ankle'],
    setup: 'Kamera makinenin yanında, diz hizasında.',
    startText: 'bacaklar açık (kilitlemeden)', metric: squatMetric(95), tempo: { minOutMs: 650 }, rules: squatRules({ torso: false }),
  }),
  ex(70, 'lying-leg-curl', 'Yatarak Bacak Kıvırma', 'Lying Leg Curl', 'Bacak', 'lying-leg-curl.png', {
    posture: 'prone', required: ['hip', 'knee', 'ankle'],
    setup: 'Kamera yanda, makine hizasında.',
    startText: 'bacaklar düz',
    metric: { fn: 'kneeAngle', start: 160, target: 85, label: 'Diz açısı', romText: 'Topuklar kalçaya yeterince yaklaşmadı', returnText: 'Bacaklar tam açılmadı' },
    tempo: { minBackMs: 700 },
    rules: [
      { id: 'hip-up', measure: 'hipAngle', relative: 'range', op: '>', warn: 12, reject: 20, minMs: 150, label: 'Kalçanın pedde kalması', text: 'Kalça pedden kalktı', cue: 'Kalçanı pede bastır' },
    ],
  }),
  ex(71, 'seated-leg-curl', 'Oturarak Bacak Kıvırma', 'Seated Leg Curl', 'Bacak', 'seated-leg-curl.png', {
    posture: 'seated', required: ['hip', 'knee', 'ankle'],
    setup: 'Kamera yanda, diz hizasında.',
    startText: 'bacaklar önde düz',
    metric: { fn: 'kneeAngle', start: 155, target: 80, label: 'Diz açısı', romText: 'Bacak yeterince bükülmedi', returnText: 'Bacaklar tam açılmadı' },
    tempo: { minBackMs: 700 },
    rules: [
      { id: 'hip-up', measure: 'hipAngle', relative: 'range', op: '>', warn: 12, reject: 20, minMs: 150, label: 'Kalçanın koltukta kalması', text: 'Kalça koltuktan kalktı', cue: 'Kalçanı koltukta tut' },
      R.sway({ warn: 8, reject: 15 }),
    ],
  }),
  ex(72, 'step-up', 'Sehpaya Adım Çıkma', 'Step-Up', 'Bacak', 'step-up.png', {
    allSides: true, required: ['hip', 'knee', 'ankle'],
    setup: 'Kamera yanda; sehpa ve iki bacak görünsün.',
    startText: 'bir ayak sehpada',
    metric: { fn: 'stepKnee', global: true, start: 100, target: 162, label: 'Çalışan diz açısı', romText: 'Sehpanın üstünde tam dikleşilmedi', returnText: 'Aşağı tam inilmedi' },
    tempo: { minBackMs: 600, backText: 'Kontrolsüz inildi' },
    rules: [
      R.leanMax({ warn: 25, reject: 40, text: 'Gövde öne eğildi — dik çık' }),
      R.valgus({ warn: 0.14, reject: 0.24, phase: 'active' }),
    ],
  }),

  // ======================= KARIN
  ex(30, 'crunch', 'Mekik Kıvırma', 'Crunch', 'Karın', 'crunch.webp', {
    posture: 'lying', required: ['shoulder', 'hip', 'knee'],
    setup: 'Kamera yanda, yere yakın.',
    startText: 'sırt yerde',
    metric: { fn: 'torsoFromVertical', global: true, start: 85, target: 62, label: 'Gövde kalkışı', romText: 'Omuzlar yerden yeterince kaldırılmadı', returnText: 'Sırt yere tam inmedi' },
    tempo: { minBackMs: 600 },
    rules: [
      { id: 'neck-pull', measure: 'neckFlex', op: '>', warn: 40, reject: 55, minMs: 200, label: 'Boyun çekme', text: 'Başını elinle çektin — çene ile göğüs arasında yumruk mesafesi bırak', cue: 'Boynunu çekme' },
      { id: 'legs-still', measure: 'kneeSwing', relative: 'range', op: '>', warn: 0.35, minMs: 200, label: 'Bacakların sabit kalması', text: 'Bacaklar hareket etti', cue: 'Ayaklarını sabit tut' },
    ],
  }),
  ex(31, 'plank', 'Ön Plank', 'Plank', 'Karın', 'plank.webp', {
    mode: 'hold', posture: 'prone', required: ['shoulder', 'elbow', 'hip', 'ankle'],
    setup: 'Kamera yere yakın, yanda; baştan ayağa görünsün.',
    startText: 'plank pozisyonu',
    metric: { fn: (P, ctx, s) => P.bodyLine(s, 'ankle'), start: 0, target: 30, label: 'Vücut hattı' },
    rules: [
      ...R.bodyLine({ sagWarn: 8, sagReject: 15, pikeWarn: 12, pikeReject: 22, phase: 'always' }),
      { id: 'elbow-under', measure: 'elbowUnderShoulder', op: '>', warn: 25, phase: 'always', minMs: 600, label: 'Dirsekler omuz altında', text: 'Dirsekler omuzların altında değil', cue: 'Dirseklerini omuzlarının altına al' },
      { ...R.neck({ warn: 30 }), phase: 'always' },
      R.shrug({ warn: 0.12, reject: 0.2, phase: 'always', text: 'Omuzlar kulağa doğru kalktı — omuzlarını kulaklarından uzaklaştır' }),
    ],
  }),
  ex(32, 'leg-raise', 'Bacak Kaldırma', 'Leg Raise', 'Karın', 'leg-raise.webp', {
    posture: 'lying', required: ['shoulder', 'hip', 'ankle'],
    setup: 'Kamera yanda, yere yakın.',
    startText: 'bacaklar yerde düz',
    metric: { fn: 'legTorso', start: 165, target: 100, label: 'Bacak-gövde açısı', romText: 'Bacaklar yeterince kaldırılmadı (dik olmalı)', returnText: 'Bacaklar aşağı tam indirilmedi' },
    tempo: { minBackMs: 800, backText: 'Bacaklar kontrolsüz indirildi' },
    rules: [
      { id: 'knee-straight', measure: 'kneeAngle', op: '<', warn: 145, reject: 120, minMs: 250, label: 'Dizler düz', text: 'Dizler fazla bükülüyor', cue: 'Bacaklarını düz tut' },
      { id: 'torso-still', measure: 'torsoFromVertical', relative: 'range', op: '>', warn: 10, reject: 18, minMs: 200, label: 'Sırtın yerde kalması', text: 'Gövde/sırt yerden kalktı — bel yere bastırılmalı', cue: 'Belini yere bastır' },
      R.shrug({ warn: 0.12, reject: 0.2 }),
    ],
  }),
  ex(33, 'cable-crunch', 'Kabloyla Karın Kıvırma', 'Cable Crunch', 'Karın', 'cable-crunch.webp', {
    required: ['shoulder', 'hip', 'knee'],
    setup: 'Kamera yanda; dizler, kalça ve baş görünsün.',
    startText: 'dizler yerde, gövde dik',
    metric: { fn: 'torsoFromVertical', global: true, start: 25, target: 60, label: 'Gövde kıvrılması', romText: 'Gövde yeterince kıvrılmadı', returnText: 'Başlangıca tam dönülmedi' },
    tempo: { minBackMs: 600 },
    rules: [
      { id: 'hips-still', measure: 'thighTilt', relative: 'range', op: '>', warn: 12, reject: 20, minMs: 150, label: 'Kalçanın sabit kalması', text: 'Kalça geriye/aşağı oturdu — hareketi karınla yap', cue: 'Kalçanı sabit tut' },
    ],
  }),

  // ======================= KALÇA
  ex(34, 'hip-thrust', 'Kalça İtişi', 'Hip Thrust', 'Kalça', 'hip-thrust.webp', {
    posture: 'lying', required: ['shoulder', 'hip', 'knee'], lineEnd: 'knee',
    setup: 'Kamera yanda, kalça hizasında.',
    startText: 'kalça aşağıda',
    metric: { fn: 'hipAngle', start: 115, target: 165, label: 'Kalça açısı', romText: 'Kalça tam kilitlenmedi — omuz-kalça-diz düz olmalı', returnText: 'Kalça yeterince indirilmedi' },
    tempo: { minPeakMs: 300, peakText: 'Tepede 1 sn sık', minBackMs: 500 },
    rules: [
      { id: 'hyperext', measure: 'bodyLine', op: '>', warn: 12, reject: 20, phase: ['peak'], bestView: 'side', minMs: 150, label: 'Belin aşırı bükülmesi', text: 'Tepede bel aşırı büküldü — kalçayı sık, kaburgaları indir', cue: 'Belini bükme' },
      { id: 'shin-vertical-low', measure: 'kneeAngle', op: '<', warn: 70, phase: ['peak'], views: ['side'], minMs: 200, label: 'Tepede diz ~90°', text: 'Ayaklar kalçaya çok yakın — tepede diz 90° olmalı', cue: 'Ayaklarını biraz ileri al' },
      { id: 'shin-vertical-high', measure: 'kneeAngle', op: '>', warn: 115, phase: ['peak'], views: ['side'], minMs: 200, label: 'Tepede diz ~90°', text: 'Ayaklar çok önde — tepede diz 90° olmalı', cue: 'Ayaklarını biraz geri al' },
      R.valgus({ warn: 0.14, reject: 0.24, phase: 'active' }),
    ],
  }),
  ex(35, 'glute-bridge', 'Kalça Köprüsü', 'Glute Bridge', 'Kalça', 'glute-bridge.webp', {
    posture: 'lying', required: ['shoulder', 'hip', 'knee'], lineEnd: 'knee',
    setup: 'Kamera yanda, yere yakın.',
    startText: 'sırt yerde, dizler bükülü',
    metric: { fn: 'hipAngle', start: 125, target: 162, label: 'Kalça açısı', romText: 'Kalça yeterince kaldırılmadı', returnText: 'Kalça yere indirilmedi' },
    tempo: { minPeakMs: 300, peakText: 'Tepede 1 sn sık', minBackMs: 500 },
    rules: [
      { id: 'hyperext', measure: 'bodyLine', op: '>', warn: 12, reject: 20, phase: ['peak'], bestView: 'side', minMs: 150, label: 'Belin aşırı bükülmesi', text: 'Bel aşırı büküldü — hareketi kalçayla yap', cue: 'Belini bükme' },
      R.valgus({ warn: 0.14, reject: 0.24, phase: 'active' }),
    ],
  }),
  ex(36, 'cable-kickback', 'Kabloyla Kalça İtişi', 'Cable Kickback', 'Kalça', 'cable-kickback.webp', {
    sides: 'single', allSides: true, required: ['shoulder', 'hip', 'knee'],
    setup: 'Kamera yanda; çalışan bacak kameraya yakın.',
    startText: 'bacak aşağıda',
    metric: { fn: 'thighExt', start: 0, target: 25, label: 'Bacağın geriye açılması', romText: 'Bacak yeterince geriye itilmedi', returnText: 'Bacak başlangıca dönmedi' },
    tempo: { minOutMs: 350, minBackMs: 500 },
    rules: [
      R.sway({ warn: 8, reject: 14, text: 'Gövde/bel hareket etti — bacak gövde sallanmadan itilmeli' }),
      { id: 'knee-fixed', measure: 'kneeAngle', relative: 'range', op: '>', warn: 25, minMs: 200, label: 'Diz açısı sabit', text: 'Diz açısı değişti', cue: 'Dizini sabit tut' },
    ],
  }),
  ex(37, 'romanian-deadlift', 'Romen Deadlift', 'Romanian Deadlift', 'Kalça', 'romanian-deadlift.webp', {
    required: ['shoulder', 'hip', 'knee'],
    setup: 'Kamera yanda, kalça hizasında; baştan ayağa görünsün.',
    startText: 'dik dur, bar uyluk önünde',
    metric: { fn: 'hipAngle', start: 165, target: 110, label: 'Kalça açısı', romText: 'Yeterince eğilinmedi — kalçayı geriye it', returnText: 'Tam dikleşilmedi — kalçayı kilitle' },
    tempo: { minOutMs: 700, outText: 'Hızlı inildi — kontrollü in' },
    rules: [
      { id: 'knee-bend', measure: 'kneeAngle', op: '<', warn: 140, reject: 125, minMs: 200, views: ['side'], label: 'Dizler hafif bükük (squat değil)', text: 'Dizler fazla büküldü — hareket squat’a döndü', cue: 'Dizlerini daha az bük' },
      { id: 'bar-close', measure: 'barDistance', op: '>', warn: 0.6, reject: 0.9, phase: ['peak', 'back'], views: ['side'], minMs: 200, label: 'Barın bacağa yakınlığı', text: 'Bar bacaklardan uzaklaştı — bacaklara sürterek in', cue: 'Barı bacağına yaklaştır' },
      { id: 'hips-back', measure: 'hipShift', relative: 'rep', op: '>', agg: 'extreme', warn: -0.15, phase: ['peak'], label: 'Kalçanın geriye gitmesi', text: 'Kalça geriye itilmedi — yalnızca öne eğildin', cue: 'Kalçanı geriye it' },
      R.neck({ warn: 40 }),
    ],
  }),

  // ======================= KARDİYO
  ex(38, 'treadmill', 'Koşu Bandı', 'Treadmill', 'Kardiyo', 'treadmill.webp', {
    allSides: true, required: ['hip', 'knee', 'ankle'], counterLabel: 'Adım döngüsü',
    setup: 'Kamera bandın yanında; baştan ayağa görünsün.',
    startText: 'yürü/koş',
    metric: { fn: 'ankleSplit', global: true, start: -0.3, target: 0.3, label: 'Adım', romCritical: false },
    rules: [
      { ...R.leanMax({ warn: 15, text: 'Öne fazla eğiliyorsun — dik koş' }), phase: 'always' },
      { id: 'overstride', measure: 'footAhead', op: '>', warn: 0.5, phase: 'always', minMs: 150, label: 'Aşırı uzun adım', text: 'Ayak kalçanın çok önüne basıyor — adımını kısalt', cue: 'Adımını kısalt' },
    ],
  }),
  ex(39, 'elliptical', 'Eliptik Bisiklet', 'Elliptical Trainer', 'Kardiyo', 'elliptical.webp', {
    required: ['hip', 'knee', 'ankle'], counterLabel: 'Pedal döngüsü',
    setup: 'Kamera yanda; baştan ayağa görünsün.',
    startText: 'pedal çevir',
    metric: { fn: 'kneeAngle', start: 150, target: 125, label: 'Diz açısı', romCritical: false },
    rules: [{ ...R.leanMax({ warn: 15, text: 'Öne eğiliyorsun — dik dur' }), phase: 'always' }],
  }),
  ex(40, 'stationary-bike', 'Kondisyon Bisikleti', 'Stationary Bike', 'Kardiyo', 'stationary-bike.webp', {
    posture: 'seated', required: ['hip', 'knee', 'ankle'], counterLabel: 'Pedal turu',
    setup: 'Kamera bisikletin yanında; kalça, diz ve ayak görünsün.',
    startText: 'pedal çevir',
    metric: { fn: 'kneeAngle', start: 135, target: 95, label: 'Diz açısı', romCritical: false },
    rules: [
      { id: 'saddle-high', measure: 'kneeAngle', op: '>', warn: 160, phase: 'always', views: ['side'], minMs: 150, label: 'Sele yüksekliği', text: 'Sele yüksek — alt noktada diz hafif (25-35°) bükülü kalmalı', cue: 'Seleyi biraz indir' },
      { ...R.leanMax({ warn: 50, text: 'Gövde fazla öne eğik' }), phase: 'always' },
    ],
  }),
  ex(41, 'rowing-machine', 'Kürek Makinesi', 'Rowing Machine', 'Kardiyo', 'rowing-machine.webp', {
    posture: 'seated', required: ['shoulder', 'elbow', 'hip', 'knee', 'ankle'], counterLabel: 'Çekiş',
    setup: 'Kamera makinenin yanında; tüm vücut görünsün.',
    startText: 'dizler bükülü, kollar önde (catch)',
    metric: { fn: 'kneeAngle', start: 75, target: 155, label: 'Diz açısı', romText: 'Bacaklar tam itilmedi', returnText: 'Başlangıç pozisyonuna (catch) dönülmedi' },
    rules: [
      { id: 'over-lean', measure: 'torsoLean', op: '<', warn: -35, phase: ['peak'], bestView: 'side', minMs: 200, label: 'Bitişte geriye yatma', text: 'Bitişte fazla geriye yattın (saat 11 yeterli)', cue: 'Bu kadar geriye yatma' },
      { id: 'arms-early', measure: 'armsEarly', op: '>', warn: 0.5, phase: ['out'], minMs: 150, label: 'Sıralama: bacak → gövde → kol', text: 'Kollar bacaklar açılmadan bükülmeye başladı', cue: 'Önce bacaklarla it' },
    ],
  }),

  // ======================= TÜM VÜCUT
  ex(42, 'burpee', 'Burpee', 'Burpee', 'Tüm vücut', 'burpee.webp', {
    required: ['shoulder', 'hip', 'knee'], posture: 'any',
    setup: 'Kamera yanda, uzakta; ayakta ve yerde tüm vücut görünsün.',
    startText: 'dik dur',
    metric: { fn: 'torsoFromVertical', global: true, start: 15, target: 65, label: 'Gövde yatıklığı', romText: 'Plank pozisyonuna inilmedi', returnText: 'Tam ayağa kalkılmadı' },
    rules: [...R.bodyLine({ sagWarn: 12, sagReject: 22, pikeWarn: 25, pikeReject: 40, phase: ['peak'] })],
  }),
  ex(43, 'jumping-jack', 'Aç-Kapa Sıçrama', 'Jumping Jack', 'Tüm vücut', 'jumping-jack.webp', {
    plane: 'frontal', view: 'front', required: ['shoulder', 'elbow', 'wrist'],
    setup: 'Kamerayı karşına, uzağa koy; kollar yukarıda ve bacaklar açıkken tüm vücut görünsün.',
    startText: 'kollar yanda, ayaklar bitişik',
    metric: { fn: 'armElev', start: 25, target: 140, label: 'Kol açısı', romText: 'Kollar baş üstüne kadar kalkmadı', returnText: 'Kollar yanlara tam inmedi' },
    rules: [
      { id: 'legs-open', measure: 'stanceWidth', op: '<', agg: 'extreme', warn: 1.35, reject: 1.05, phase: ['peak'], label: 'Bacakların açılması', text: 'Bacaklar yeterince açılmadı', cue: 'Bacaklarını omuzdan geniş aç' },
      R.symmetryArm({ warn: 20, reject: 35 }),
    ],
  }),
];

EXERCISES.sort((a, b) => a.no - b.no);
export const GROUPS = [...new Set(EXERCISES.map((e) => e.group))];
export const byId = (id) => EXERCISES.find((e) => e.id === id);
