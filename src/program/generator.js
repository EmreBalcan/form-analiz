// Kişiye özel antrenman programı üretici.
// Girdi: kullanıcı bilgileri (cinsiyet, yaş, boy, kilo, deneyim, haftalık gün, amaç) + antrenman geçmişi.
// Çıktı: haftalık gün planı (hareket, set, tekrar, dinlenme). 5 amaç × 6 seviye × 2 cinsiyet = 60 temel şablon;
// her blokta (≈1 ay) hareket varyantları döner, formu zorlanan hareket daha kolay varyantla değişir.
// Dayanaklar docs/PROGRAMLAR.md'de (ACSM 2009/2026, Schoenfeld 2016-2018, Baz-Valle 2022, WHO 2020 …).
import { byId } from '../exercises/catalog.js';

export const GOALS = {
  kas: { tr: 'Kas kazanımı', short: 'Kas' },
  kaskilo: { tr: 'Kas + kilo kazanımı', short: 'Kas + kilo' },
  kilo: { tr: 'Kilo alımı', short: 'Kilo alımı' },
  yag: { tr: 'Yağ yakımı', short: 'Yağ yakımı' },
  sikila: { tr: 'Sıkılaşma / genel form', short: 'Genel form' },
};

export const LEVELS = [null,
  { tr: 'Başlangıç', desc: 'Hareketleri öğrenme, makine ve temel serbest ağırlık' },
  { tr: 'Temel', desc: 'Düzenli tüm vücut, set sayısı artıyor' },
  { tr: 'Gelişen', desc: 'Bölünmüş program, serbest ağırlık ağırlıkta' },
  { tr: 'Orta', desc: 'Haftada 4 gün, kas başına daha çok set' },
  { tr: 'İleri', desc: 'Haftada 5 gün, yüksek hacim, planlı hafif hafta' },
  { tr: 'Uzman', desc: 'Haftada 5-6 gün, en yüksek hacim ve zor varyantlar' },
];

export const EXPERIENCE = [
  { id: 'none', tr: 'Hiç yapmadım / 1 aydan az', level: 1 },
  { id: 'lt6', tr: '1-6 ay', level: 2 },
  { id: '6to12', tr: '6-12 ay', level: 3 },
  { id: '1to2', tr: '1-2 yıl', level: 4 },
  { id: '2to4', tr: '2-4 yıl', level: 5 },
  { id: 'gt4', tr: '4 yıldan fazla', level: 6 },
];

// Hareket havuzları: [id, en düşük seviye, en yüksek seviye (opsiyonel)]. Aynı kalıbı çalıştıran alternatifler.
const POOLS = {
  chest: [['chest-press', 1, 3], ['bench-press', 2], ['incline-dumbbell-press', 2], ['incline-barbell-press', 3], ['decline-bench-press', 4]],
  chest2: [['incline-dumbbell-press', 1], ['chest-press', 1, 4], ['incline-barbell-press', 3], ['push-up', 1, 3], ['decline-push-up', 4]],
  chestIso: [['pec-deck-fly', 1], ['cable-fly-high-low', 2], ['dumbbell-fly', 2], ['cable-fly-low-high', 3]],
  vpull: [['lat-pulldown', 1], ['assisted-pull-up', 1, 4], ['chin-up', 4], ['pull-up', 4]],
  hpull: [['seated-cable-row', 1], ['chest-supported-row', 1], ['one-arm-dumbbell-row', 2], ['barbell-row', 3], ['t-bar-row', 4]],
  ohp: [['shoulder-press', 1]],
  lateral: [['lateral-raise', 1], ['cable-lateral-raise', 2], ['leaning-lateral-raise', 4]],
  rear: [['face-pull', 1], ['reverse-pec-deck', 1], ['rear-delt-fly', 2]],
  biceps: [['dumbbell-curl', 1], ['cable-curl', 1], ['hammer-curl', 1], ['barbell-curl', 2], ['preacher-curl', 2], ['incline-dumbbell-curl', 3], ['bayesian-cable-curl', 3], ['spider-curl', 4], ['concentration-curl', 2]],
  triceps: [['cable-pushdown', 1], ['rope-pushdown', 1], ['overhead-cable-extension', 2], ['overhead-triceps-extension', 2], ['single-arm-cable-pushdown', 2], ['lying-triceps-extension', 3], ['close-grip-bench-press', 3], ['parallel-bar-dip', 4]],
  squat: [['leg-press', 1], ['goblet-squat', 1, 3], ['squat', 2], ['hack-squat', 3]],
  hinge: [['romanian-deadlift', 2], ['hip-thrust', 1], ['glute-bridge', 1, 2]],
  uni: [['step-up', 1], ['walking-lunge', 2], ['bulgarian-split-squat', 3]],
  quad: [['leg-extension', 1]],
  ham: [['leg-curl', 1], ['seated-leg-curl', 1], ['lying-leg-curl', 1]],
  glute: [['hip-thrust', 1], ['glute-bridge', 1, 3], ['cable-kickback', 2]],
  calf: [['calf-raise', 1]],
  core: [['crunch', 1], ['plank', 1], ['leg-raise', 2], ['cable-crunch', 2]],
  cardio: [['treadmill', 1], ['elliptical', 1], ['stationary-bike', 1], ['rowing-machine', 2]],
  cardioLow: [['stationary-bike', 1], ['elliptical', 1], ['rowing-machine', 2]],
  cond: [['jumping-jack', 1], ['burpee', 3]],
};
// tek taraflı yapılan hareketler: tekrar sayısı her taraf için (sayaç iki tarafı toplar)
export const PER_SIDE = new Set(['one-arm-dumbbell-row', 'concentration-curl', 'single-arm-cable-pushdown', 'bulgarian-split-squat', 'cable-kickback', 'walking-lunge', 'step-up', 'leaning-lateral-raise', 'cable-lateral-raise']);
const COMPOUND = new Set(['chest', 'chest2', 'vpull', 'hpull', 'ohp', 'squat', 'hinge', 'uni']);
const DUMBBELL_OK = new Set(['goblet-squat', 'incline-dumbbell-press', 'one-arm-dumbbell-row', 'chest-supported-row', 'shoulder-press', 'romanian-deadlift', 'step-up', 'walking-lunge', 'bulgarian-split-squat', 'lateral-raise', 'dumbbell-curl', 'hammer-curl', 'push-up', 'crunch', 'plank', 'leg-raise', 'glute-bridge', 'hip-thrust', 'overhead-triceps-extension', 'bench-dip', 'dumbbell-fly', 'rear-delt-fly', 'concentration-curl', 'calf-raise', 'jumping-jack', 'burpee', 'treadmill']);

// Gün şablonları: slot listesi önem sırasına göre (sondakiler az hareketli seviyelerde düşer).
const DAYS = {
  fbA: { tr: 'Tüm vücut A', slots: ['squat', 'chest', 'hpull', 'ohp', 'ham', 'biceps', 'triceps', 'core'] },
  fbB: { tr: 'Tüm vücut B', slots: ['hinge', 'vpull', 'chest2', 'uni', 'lateral', 'triceps', 'biceps', 'core'] },
  fbC: { tr: 'Tüm vücut C', slots: ['squat', 'vpull', 'chest', 'hpull', 'rear', 'calf', 'core', 'biceps'] },
  upper: { tr: 'Üst vücut', slots: ['chest', 'hpull', 'vpull', 'ohp', 'lateral', 'biceps', 'triceps', 'chestIso', 'rear'] },
  lower: { tr: 'Alt vücut', slots: ['squat', 'hinge', 'uni', 'quad', 'ham', 'calf', 'core', 'glute'] },
  push: { tr: 'İtiş (göğüs-omuz-triceps)', slots: ['chest', 'ohp', 'chest2', 'lateral', 'chestIso', 'triceps', 'triceps'] },
  pull: { tr: 'Çekiş (sırt-arka omuz-biceps)', slots: ['vpull', 'hpull', 'hpull', 'rear', 'biceps', 'biceps', 'core'] },
  legs: { tr: 'Bacak', slots: ['squat', 'hinge', 'uni', 'ham', 'quad', 'calf', 'core', 'glute'] },
};
const SPLITS = {
  2: { tr: 'Haftada 2 gün tüm vücut', days: ['fbA', 'fbB'] },
  3: { tr: 'Haftada 3 gün tüm vücut', days: ['fbA', 'fbB', 'fbC'] },
  4: { tr: 'Üst / alt vücut (4 gün)', days: ['upper', 'lower', 'upper', 'lower'] },
  5: { tr: 'Üst / alt + itiş / çekiş / bacak (5 gün)', days: ['upper', 'lower', 'push', 'pull', 'legs'] },
  6: { tr: 'İtiş / çekiş / bacak ×2 (6 gün)', days: ['push', 'pull', 'legs', 'push', 'pull', 'legs'] },
};

// Amaca göre tekrar, dinlenme (sn), kardiyo
const GOAL_P = {
  kas: { comp: 10, iso: 12, restC: 120, restI: 75, cardio: [0, 0, 10, 10, 10, 10], cardioDays: 2, maxEx: 99 },
  kaskilo: { comp: 8, iso: 10, restC: 150, restI: 90, cardio: [0, 0, 0, 0, 0, 0], cardioDays: 0, maxEx: 99 },
  kilo: { comp: 6, iso: 10, restC: 180, restI: 90, cardio: [0, 0, 0, 0, 0, 0], cardioDays: 0, maxEx: 5 },
  yag: { comp: 12, iso: 15, restC: 75, restI: 45, cardio: [15, 20, 20, 25, 25, 30], cardioDays: 9, maxEx: 99, cond: true },
  sikila: { comp: 12, iso: 15, restC: 60, restI: 45, cardio: [10, 15, 15, 20, 20, 20], cardioDays: 9, maxEx: 99, cond: true },
};
const LEVEL_P = [null,
  { ex: 5, setsC: 2, setsI: 2, days: 3, repAdd: 2 },
  { ex: 6, setsC: 3, setsI: 2, days: 3, repAdd: 0 },
  { ex: 6, setsC: 3, setsI: 3, days: 4, repAdd: 0 },
  { ex: 7, setsC: 4, setsI: 3, days: 4, repAdd: 0, deload: true },
  { ex: 7, setsC: 4, setsI: 3, days: 5, repAdd: -1, deload: true },
  { ex: 8, setsC: 4, setsI: 4, days: 6, repAdd: -2, deload: true },
];
// seviye atlama için o seviyede geçirilmesi gereken süre (hafta) — 1. aydan sonra program ağırlaşır
const WEEKS_TO_NEXT = [null, 4, 4, 6, 8, 12];

export function bmiOf(u) { const h = (u.height || 0) / 100; return h > 0 && u.weight > 0 ? u.weight / (h * h) : null; }

/** Amaç seçilmediyse sistemin önerdiği amaç ve gerekçesi. */
export function suggestGoal(u) {
  const bmi = bmiOf(u);
  if (!bmi) return { goal: 'sikila', why: 'Boy/kilo girilmediği için genel form programı önerildi.' };
  const b = bmi.toFixed(1);
  if (bmi < 18.5) return { goal: 'kaskilo', why: `Vücut kitle indeksin ${b} (zayıf, < 18,5): kilo ve kas kazanımı öncelikli.` };
  if (bmi >= 30) return { goal: 'yag', why: `Vücut kitle indeksin ${b} (≥ 30): yağ yakımı öncelikli; eklemleri yormayan kardiyo seçildi.` };
  if (bmi >= 25) return { goal: 'yag', why: `Vücut kitle indeksin ${b} (25-30): yağ yakımı + kası koruma öncelikli.` };
  if ((u.age || 0) >= 55) return { goal: 'sikila', why: `Kilon normal (VKİ ${b}); ${u.age} yaşında güç ve kondisyonu birlikte geliştiren genel form programı önerildi.` };
  if (bmi < 21 && u.sex === 'm') return { goal: 'kaskilo', why: `Vücut kitle indeksin ${b} (normalin alt kısmı): kas + kilo kazanımı önerildi.` };
  return { goal: 'kas', why: `Vücut kitle indeksin ${b} (normal): kas kazanımı önerildi.` };
}

export function startLevel(u) { return EXPERIENCE.find((e) => e.id === u.experience)?.level || 1; }

const DAY_MS = 86400000;
export const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/**
 * Seviye durumunu geçmişe göre güncelle (saf fonksiyon; yeni durum döner).
 * state: {level, levelSince}. history: [{date, exerciseId, sets:[...]}]
 * Kural: seviyede WEEKS_TO_NEXT hafta geçirildiyse ve bu sürede planlanan günlerin ≥ %60'ı yapıldıysa seviye atlar.
 * 4 haftadan uzun ara verildiyse bir seviye düşer (kondisyon kaybı).
 */
export function evolveLevel(u, state, history, now = Date.now()) {
  let { level, levelSince } = state;
  const events = [];
  const days = [...new Set(history.map((h) => h.date))].sort();
  const lastDay = days.length ? new Date(days[days.length - 1]).getTime() : null;
  if (lastDay && now - lastDay > 28 * DAY_MS && level > 1 && now - levelSince > 28 * DAY_MS) {
    level -= 1; levelSince = now;
    events.push({ type: 'down', text: `4 haftadan uzun ara verdiğin için program bir seviye hafifletildi (${LEVELS[level].tr}).` });
  }
  for (let guard = 0; guard < 6 && level < 6; guard++) {
    const need = WEEKS_TO_NEXT[level];
    const end = levelSince + need * 7 * DAY_MS;
    if (now < end) break;
    const planned = Math.min(u.days || LEVEL_P[level].days, 6) * need;
    const done = days.filter((d) => { const t = new Date(d).getTime(); return t >= levelSince - DAY_MS && t < end; }).length;
    if (done < planned * 0.6) break;
    level += 1; levelSince = end;
    events.push({ type: 'up', text: `${need} haftadır düzenli antrenman yaptın (${done} gün) — program ağırlaştı: ${LEVELS[level].tr} (${level}/6).` });
  }
  return { level, levelSince, events };
}

function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Formu zorlanan hareketler: son 30 günde ≥ 6 denemede reddedilen oranı ≥ %40. */
export function formTrouble(history, now = Date.now()) {
  const agg = new Map();
  for (const h of history) {
    if (now - (h.t || 0) > 30 * DAY_MS) continue;
    const a = agg.get(h.exerciseId) || { ok: 0, bad: 0 };
    for (const s of h.sets || []) { a.ok += s.accepted || 0; a.bad += s.rejected || 0; }
    agg.set(h.exerciseId, a);
  }
  const out = new Set();
  for (const [id, a] of agg) if (a.ok + a.bad >= 6 && a.bad / (a.ok + a.bad) >= 0.4) out.add(id);
  return out;
}

/**
 * Program üret.
 * u: {sex:'m'|'f', age, height, weight, experience, days, goal ('auto' | GOALS anahtarı), seed}
 * st: {level, levelSince, createdAt}
 */
export function generateProgram(u, st, history = [], now = Date.now()) {
  const auto = !u.goal || u.goal === 'auto';
  const sg = auto ? suggestGoal(u) : { goal: u.goal, why: 'Senin seçtiğin amaç.' };
  const goal = sg.goal;
  const level = Math.max(1, Math.min(6, st.level || 1));
  const G = GOAL_P[goal], L = LEVEL_P[level];
  const bmi = bmiOf(u);
  const age = u.age || 25;
  const female = u.sex === 'f';
  const lowImpact = (bmi && bmi >= 30) || age >= 50;
  const notes = [];

  // haftalık gün: kullanıcı seçimi (yoksa seviyenin önerisi); kilo alımında en çok 4 gün (toparlanma + enerji)
  let days = Math.max(2, Math.min(6, u.days || L.days));
  if (goal === 'kilo' && days > 4) { days = 4; notes.push('Kilo alımında haftada en çok 4 gün: enerji kas yapımına kalsın.'); }
  if (level <= 2 && days > 3) { days = 3; notes.push('İlk aylarda haftada 3 tüm vücut günü yeterli; her kas haftada 3 kez çalışır.'); }
  const split = SPLITS[days];

  // blok: ~4 haftalık dönem. Hafta içindeki sıra ilerlemeyi, blok numarası hareket varyantını belirler.
  const since = st.levelSince || now;
  const weekIdx = Math.max(0, Math.floor((now - since) / (7 * DAY_MS)));
  const week = (weekIdx % 4) + 1;
  const block = Math.floor((now - (st.createdAt || since)) / (28 * DAY_MS));
  const seed = (u.seed ?? 1) + block * 7919;
  const deload = L.deload && week === 4;

  const trouble = formTrouble(history, now);
  const swaps = [];

  // tekrar: amaç + seviye; kadınlarda izolasyon +2 tekrar (yorgunluğa direnç), 50+ yaşta en az 10
  const reps = (comp) => {
    let r = (comp ? G.comp : G.iso) + L.repAdd + (female && !comp ? 2 : 0);
    r = Math.min(r, comp ? 12 : 15);
    if (age >= 50) r = Math.max(r, 10);
    if (age < 18) r = Math.max(r, 10);
    if (!deload && week === 2) r += 1;
    if (!deload && week === 3) r += 2;
    return Math.max(5, r);
  };
  // dinlenme: kadınlarda set arası toparlanma daha hızlı → %15 kısa
  const rest = (comp) => Math.round(((comp ? G.restC : G.restI) * (female ? 0.85 : 1)) / 15) * 15;
  const setsOf = (comp, slot) => {
    let s = comp ? L.setsC : L.setsI;
    if (!deload && week === 3 && comp && level >= 2) s += 1; // 3. hafta: ana hareketlerde +1 set
    if (deload) s = Math.max(2, s - 1);
    if (goal === 'kilo' && !comp) s = Math.min(s, 2);
    if (slot === 'core') s = Math.min(s, 3);
    return s;
  };

  const pick = (slot, used, dayNo) => {
    const pool = (POOLS[slot] || []).filter(([id, lo, hi]) => level >= lo && level <= (hi ?? 6) && !used.has(id));
    if (!pool.length) return null;
    let cands = pool;
    if (u.equipment === 'dumbbell') cands = pool.filter(([id]) => DUMBBELL_OK.has(id));
    if (!cands.length) return null;
    const i = (seed + hashStr(slot) + dayNo * 3) % cands.length;
    let id = cands[i][0];
    if (trouble.has(id)) {
      // formu zorlanan hareket → aynı kalıbın daha kolay (en düşük seviyeli) başka varyantı
      const alt = cands.filter(([x]) => x !== id && !trouble.has(x)).sort((a, b) => a[1] - b[1])[0];
      if (alt) { swaps.push([id, alt[0]]); id = alt[0]; }
    }
    return id;
  };

  const dayList = split.days.map((key, dayNo) => {
    const D = DAYS[key];
    let slots = [...D.slots];
    // kadın: alt vücut/tüm vücut günlerinde kalça vurgusu öne alınır; erkek: üst gün sonunda kol hacmi
    if (female && (key.startsWith('fb') || key === 'lower' || key === 'legs')) slots = ['glute', ...slots.filter((s) => s !== 'glute')].slice(0, slots.length);
    if (female && (key === 'lower' || key === 'legs')) slots.splice(2, 0, 'glute');
    const nEx = Math.min(L.ex + (female && (key === 'lower' || key === 'legs') ? 1 : 0), G.maxEx, slots.length);
    const used = new Set();
    const items = [];
    for (const slot of slots) {
      if (items.length >= nEx) break;
      const id = pick(slot, used, dayNo);
      if (!id) continue;
      used.add(id);
      const comp = COMPOUND.has(slot);
      if (id === 'plank') { items.push({ id, sets: setsOf(false, 'core'), hold: Math.min(60, 20 + level * 7), rest: 45, slot }); continue; }
      items.push({ id, sets: setsOf(comp, slot), reps: reps(comp), rest: rest(comp), perSide: PER_SIDE.has(id), slot });
    }
    // kondisyon hareketi (yağ yakımı / genel form, seviye 2+, eklem dostu değilse)
    if (G.cond && level >= 2 && !lowImpact && dayNo % 2 === 0) {
      const id = pick('cond', used, dayNo);
      if (id) items.push({ id, sets: 2 + (level >= 4 ? 1 : 0), reps: id === 'burpee' ? 8 + level : 20 + level * 3, rest: 45, slot: 'cond' });
    }
    // kardiyo (gün sonunda)
    const cmin = G.cardio[level - 1];
    if (cmin && (G.cardioDays >= 9 || dayNo < G.cardioDays)) {
      const id = pick(lowImpact ? 'cardioLow' : 'cardio', used, dayNo);
      if (id) items.push({ id, minutes: deload ? Math.round(cmin * 0.6) : cmin, slot: 'cardio' });
    }
    return { key, name: D.tr, items };
  });

  // açıklamalar
  if (deload) notes.push('Bu hafta hafif hafta (deload): set sayısı azaltıldı, toparlan.');
  else if (week === 2) notes.push('2. hafta: tekrarlar 1 arttı (aynı ağırlıkla daha çok tekrar).');
  else if (week === 3) notes.push('3. hafta: tekrarlar 2 arttı, ana hareketlere 1 set eklendi.');
  else notes.push('1. hafta: hedef tekrarı temiz formla tamamlayabildiğin ağırlığı seç. Hedefin üstüne rahat çıkınca ağırlığı artır.');
  if (lowImpact) notes.push('Eklemleri korumak için zıplama/koşu yerine bisiklet, eliptik veya kürek seçildi.');
  if (age < 18) notes.push('18 yaş altı: ağır yük yerine teknik ve kontrollü tekrar önceliklidir.');
  for (const [a, b] of swaps) notes.push(`Son antrenmanlarda "${byId(a)?.tr || a}" hareketinde tekrarların çoğu sayılmadı → daha kolay varyant "${byId(b)?.tr || b}" konuldu.`);
  const diet = {
    kas: 'Beslenme: günlük kaloriyi koruma düzeyinde veya hafif fazla (+200 kcal) tut; protein ≈ 1,6-2,2 g/kg.',
    kaskilo: 'Beslenme: günde yaklaşık +300-500 kcal fazla; haftada 0,25-0,5 kg artış hedefle. Protein ≈ 1,6-2,2 g/kg.',
    kilo: 'Beslenme: günde yaklaşık +500 kcal fazla; tartıyı haftalık izle, artış yoksa kaloriyi artır.',
    yag: 'Beslenme: günde yaklaşık 300-500 kcal açık; kası korumak için protein ≈ 1,6-2,2 g/kg.',
    sikila: 'Beslenme: dengeli, koruma kalorisi; protein ≈ 1,2-1,6 g/kg.',
  }[goal];
  notes.push(diet);

  return {
    goal, goalAuto: auto, goalWhy: sg.why, level, levelName: LEVELS[level].tr, levelDesc: LEVELS[level].desc,
    split: split.tr, daysPerWeek: days, week, block, deload, days: dayList, notes, bmi,
    template: `${goal}-${level}-${female ? 'k' : 'e'}`,
  };
}

/** Sıradaki antrenman günü: son yapılan program gününden bir sonraki (takvime değil sıraya bağlı). */
export function nextDayIndex(program, lastDone) {
  if (lastDone == null) return 0;
  return (lastDone + 1) % program.days.length;
}
