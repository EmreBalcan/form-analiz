// Analiz motoru testleri (sentetik iskeletlerle). Çalıştır: npm test
import { BodyTracker } from '../src/core/body.js';
import { FormEngine } from '../src/core/engine.js';
import { EXERCISES, byId } from '../src/exercises/catalog.js';
import { sequence, lerp, skeleton, project, mulberry } from './synth.mjs';
import { ProfileCapture } from '../src/core/profile.js';

let failed = 0, passed = 0;
const results = [];
function check(name, cond, info = '') {
  if (cond) { passed++; results.push(`  ✓ ${name}`); } else { failed++; results.push(`  ✗ ${name}  ${info}`); }
}

function run(exId, frames, opts = {}) {
  const def = byId(exId);
  const tr = new BodyTracker();
  const events = [];
  const eng = new FormEngine(def, (e) => events.push(e), { profile: opts.profile });
  let last;
  for (const f of frames) {
    const P = tr.process({ ...f, posture: def.posture, allSides: def.allSides });
    last = eng.update(P);
  }
  const reps = eng.reps;
  return { reps, ok: reps.filter((r) => r.ok).length, bad: reps.filter((r) => !r.ok).length, events, last, eng };
}
const reasons = (r) => r.reps.flatMap((x) => x.reasons).join(' | ');
const warns = (r) => r.reps.flatMap((x) => x.warnings).join(' | ');
const has = (r, s) => reasons(r).toLocaleLowerCase('tr').includes(s.toLocaleLowerCase('tr'));
const hasW = (r, s) => warns(r).toLocaleLowerCase('tr').includes(s.toLocaleLowerCase('tr'));
const desc = (r) => `ok=${r.ok} bad=${r.bad} ret=[${reasons(r)}] uyarı=[${warns(r)}] durum=${r.last?.state} msg=${r.last?.message}`;

// ---------------------------------------------------------------- BICEPS CURL
const curl = (o = {}) => (u) => ({
  torsoPitch: o.sway ? lerp(0, o.sway, u) : 0,
  shrug: o.shrug ? lerp(0, o.shrug, u) : 0,
  arms: { both: { elbow: lerp(165, o.top ?? 45, u), flex: o.drift ? lerp(5, o.drift, u) : lerp(4, 10, u), abd: o.flare ? lerp(8, o.flare, u) : 8, bend: 'fwd' } },
});

{
  results.push('Dambıl curl');
  let r = run('dumbbell-curl', sequence({ specAt: curl(), reps: 5, view: 'side' }));
  check('yandan doğru form: 5 geçerli', r.ok === 5 && r.bad === 0, desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl(), reps: 4, view: 'front' }));
  check('önden doğru form: 4 geçerli (3B dirsek açısı)', r.ok === 4 && r.bad === 0, desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl({ drift: 50 }), reps: 3, view: 'side' }));
  check('yandan dirsek öne kaçıyor → ret', r.bad === 3 && has(r, 'dirsek'), desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl({ sway: -18 }), reps: 3, view: 'side' }));
  check('yandan gövde salınımı → ret', r.bad === 3 && has(r, 'sallandı'), desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl({ sway: -18 }), reps: 3, view: 'side', hide: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32] }));
  check('kalça görünmezken salınım (omuz kayması yedeği) → uyarı', (r.ok + r.bad) === 3 && (hasW(r, 'sallandı') || has(r, 'sallandı')), desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl({ flare: 50 }), reps: 3, view: 'front' }));
  check('önden dirsek yana açılıyor → ret', r.bad === 3 && has(r, 'uzaklaştı'), desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl({ shrug: 0.065 }), reps: 3, view: 'front' }));
  check('önden omuz silkme (kulak) → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl({ shrug: 0.065 }), reps: 3, view: 'front', hide: [7, 8] }));
  check('kulaklar görünmüyor: silkme gözden ölçülür → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl({ shrug: 0.065 }), reps: 3, view: 'front', hide: [1, 2, 3, 4, 5, 6, 7, 8] }));
  check('kulak+göz görünmüyor: ağızdan ölçülür → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl({ shrug: 0.065 }), reps: 3, view: 'front', hide: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }));
  check('yalnız burun: silkme yine yakalanır (uyarı/ret)', (has(r, 'kulağa') || hasW(r, 'kulağa')), desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl(), reps: 3, view: 'front', hide: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32] }));
  check('önden yakın çekim (kalça yok) doğru form: 3 geçerli', r.ok === 3, desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl({ top: 105 }), reps: 3, view: 'side' }));
  check('yarım tekrar → ret (açıklık)', r.bad === 3 && has(r, 'yeterince'), desc(r));
  r = run('dumbbell-curl', sequence({ specAt: (u) => ({ ...curl()(u), headPitch: lerp(0, 25, u) }), reps: 3, view: 'front' }));
  check('başı öne eğmek omuz silkme sayılmaz', !has(r, 'kulağa'), desc(r));
}

// ---------------------------------------------------------------- YANA AÇIŞ
const lat = (o = {}) => (u) => ({
  torsoPitch: o.sway ? Math.sin(u * Math.PI) * o.sway : 0,
  shrug: o.shrug ? lerp(0, o.shrug, u) : 0,
  arms: { both: { abd: lerp(12, o.top ?? 88, u), flex: 15, elbow: o.bent ? lerp(165, 100, u) : o.bendTo ? lerp(165, o.bendTo, u) : o.bendFixed ?? 165, bend: 'fwd' } },
});
{
  results.push('Yana dambıl açış');
  let r = run('lateral-raise', sequence({ specAt: lat(), reps: 4, view: 'front' }));
  check('doğru form: 4 geçerli', r.ok === 4 && r.bad === 0, desc(r));
  r = run('lateral-raise', sequence({ specAt: lat({ top: 55 }), reps: 3, view: 'front' }));
  check('omuz hizasına kalkmıyor → ret', r.bad === 3 && has(r, 'omuz hizasına'), desc(r));
  r = run('lateral-raise', sequence({ specAt: lat({ shrug: 0.085 }), reps: 3, view: 'front' }));
  check('omuz silkme → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));
  r = run('lateral-raise', sequence({ specAt: lat({ shrug: 0.02 }), reps: 3, view: 'front' }));
  check('küçük doğal omuz yükselmesi ret sebebi değil', r.ok === 3, desc(r));
  r = run('lateral-raise', sequence({ specAt: lat({ bent: true }), reps: 3, view: 'front' }));
  check('dirsek çok bükülüyor (100°) → ret', r.bad === 3 && has(r, 'dirsek'), desc(r));
  r = run('lateral-raise', sequence({ specAt: lat({ bendTo: 128 }), reps: 3, view: 'front' }));
  check('hafif fazla bükük dirsek (128°) artık kabul (tolerans)', r.ok === 3, desc(r));
  r = run('lateral-raise', sequence({ specAt: lat({ bendFixed: 110 }), reps: 3, view: 'front' }));
  check('sabit 110° bükük dirsek yana açışta kabul (uyarıyla)', r.ok === 3 && hasW(r, 'büküldü'), desc(r));
  r = run('cable-lateral-raise', sequence({ specAt: lat({ bendFixed: 110 }), reps: 3, view: 'front' }));
  check('kablo yan açış = yana açış: 110° bükük dirsek kabul (uyarıyla)', r.ok === 3 && hasW(r, 'büküldü'), desc(r));
  r = run('lateral-raise', sequence({ specAt: lat({ top: 125 }), reps: 3, view: 'front' }));
  check('omuz üstüne çıkıyor → uyarı', hasW(r, 'üstüne'), desc(r));
  r = run('lateral-raise', sequence({ specAt: lat(), reps: 3, view: 'front', hide: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 7, 8] }));
  check('kalça ve kulak görünmüyor, doğru form: 3 geçerli', r.ok === 3, desc(r));
  r = run('lateral-raise', sequence({ specAt: lat({ shrug: 0.085 }), reps: 3, view: 'front', hide: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 7, 8] }));
  check('kalça+kulak yok, silkme yine ret', r.bad === 3 && has(r, 'kulağa'), desc(r));
}

// ---------------------------------------------------------------- SQUAT
const squat = (o = {}) => (u) => {
  const fl = lerp(4, o.depth === 'shallow' ? 50 : 88, u);
  const kn = lerp(178, o.depth === 'shallow' ? 125 : 82, u);
  const knr = (180 - kn) * Math.PI / 180, flr = fl * Math.PI / 180;
  const hipY = 0.06 + 0.45 * Math.cos(flr) + 0.43 * Math.cos(flr - knr);
  const hipZ = -(0.45 * Math.sin(flr) + 0.43 * Math.sin(flr - knr));
  return { hipY, hipZ, torsoPitch: lerp(0, o.lean ?? 38, u), arms: { both: { flex: 70, elbow: 170 } }, legs: { both: { flex: fl, knee: kn, valgus: o.valgus ? lerp(0, o.valgus, u) : 0, heel: o.heel ? lerp(0, o.heel, u) : 0 } } };
};
{
  results.push('Squat');
  let r = run('squat', sequence({ specAt: squat(), reps: 4, view: 'side' }));
  check('yandan doğru form: 4 geçerli', r.ok === 4 && r.bad === 0, desc(r));
  r = run('squat', sequence({ specAt: squat({ depth: 'shallow' }), reps: 3, view: 'side' }));
  check('sığ squat → ret', r.bad === 3 && has(r, 'derine'), desc(r));
  r = run('squat', sequence({ specAt: squat({ lean: 75 }), reps: 3, view: 'side' }));
  check('aşırı öne eğilme → ret', r.bad === 3 && has(r, 'öne eğildi'), desc(r));
  r = run('squat', sequence({ specAt: squat({ heel: 25 }), reps: 3, view: 'side' }));
  check('topuk kalkıyor → ret', r.bad === 3 && has(r, 'topuk'), desc(r));
  r = run('squat', sequence({ specAt: squat(), reps: 3, view: 'front' }));
  check('önden doğru form: 3 geçerli', r.ok === 3, desc(r));
  r = run('squat', sequence({ specAt: squat({ valgus: 0.09 }), reps: 3, view: 'front' }));
  check('önden diz içe kaçıyor → ret', r.bad === 3 && has(r, 'içe'), desc(r));
}

// ---------------------------------------------------------------- BENCH PRESS
const bench = (o = {}) => (u) => {
  const a = (o.flare ?? 50) * Math.PI / 180;
  const bottom = [Math.sin(a) * 0.94, Math.cos(a) * 0.94, -0.35];
  const dir = [lerp(0, bottom[0], u), lerp(0, bottom[1], u), lerp(1, bottom[2], u)];
  return { rootPitch: -90, arms: { both: { dir, elbow: lerp(178, 70, u), bend: 'fwd' } }, legs: { both: { flex: 80, knee: 95 } }, shrug: o.shrug ? lerp(0, o.shrug, u) : 0 };
};
{
  results.push('Bench press');
  let r = run('bench-press', sequence({ specAt: bench(), reps: 4, view: 'side' }));
  check('doğru form (dirsek ~50°): 4 geçerli', r.ok === 4 && r.bad === 0, desc(r));
  r = run('bench-press', sequence({ specAt: bench({ flare: 90 }), reps: 3, view: 'side' }));
  check('dirsekler 90° açık → ret', r.bad === 3 && has(r, '90°'), desc(r));
  r = run('bench-press', sequence({ specAt: (u) => bench()(u * 0.75), reps: 3, view: 'side' }));
  check('bar göğse inmiyor → ret', r.bad === 3 && has(r, 'göğse'), desc(r));
}

// ---------------------------------------------------------------- TRICEPS PUSHDOWN
const pushdown = (o = {}) => (u) => ({
  torsoPitch: 12 + (o.sway ? Math.sin(u * Math.PI / 2) * o.sway : 0),
  arms: { both: { flex: o.drift ? lerp(8, o.drift, 1 - u) : 8, abd: 6, elbow: lerp(85, 170, u), bend: 'fwd' } },
});
{
  results.push('Kablo triceps itiş');
  let r = run('cable-pushdown', sequence({ specAt: pushdown(), reps: 4, view: 'side' }));
  check('doğru form: 4 geçerli', r.ok === 4 && r.bad === 0, desc(r));
  r = run('cable-pushdown', sequence({ specAt: pushdown({ drift: 45 }), reps: 3, view: 'side' }));
  check('dirsek öne-arkaya oynuyor → ret', r.bad === 3 && has(r, 'dirsek'), desc(r));
  r = run('cable-pushdown', sequence({ specAt: pushdown({ sway: 20 }), reps: 3, view: 'side' }));
  check('gövdeyle bastırma → ret', r.bad === 3 && has(r, 'gövde'), desc(r));
}

// ---------------------------------------------------------------- ŞINAV
const pushup = (o = {}) => (u) => ({
  rootPitch: 90, torsoPitch: o.sag ? o.sag : o.pike ? -o.pike : 0,
  arms: { both: { dir: [lerp(0.12, 0.5, u), lerp(0.05, 0.8, u), lerp(1, -0.1, u)], elbow: lerp(178, 80, u), bend: 'fwd' } },
  legs: { both: { flex: 0, knee: 178 } },
});
{
  results.push('Şınav');
  let r = run('push-up', sequence({ specAt: pushup(), reps: 3, view: 'side' }));
  check('doğru form: 3 geçerli', r.ok === 3 && r.bad === 0, desc(r));
  r = run('push-up', sequence({ specAt: pushup({ sag: 38 }), reps: 3, view: 'side' }));
  check('kalça belirgin çöküyor → ret', r.bad === 3 && has(r, 'çöktü'), desc(r));
  r = run('push-up', sequence({ specAt: pushup({ sag: 14 }), reps: 3, view: 'side' }));
  check('hafif kalça düşmesi artık kabul (tolerans)', r.ok === 3, desc(r));
  r = run('push-up', sequence({ specAt: (u) => pushup()(u * 0.9), reps: 3, view: 'side' }));
  check('biraz sığ şınav artık kabul (tolerans)', r.ok === 3, desc(r));
  r = run('push-up', sequence({ specAt: pushup({ pike: 38 }), reps: 3, view: 'side' }));
  check('kalça fazla yukarıda → ret', r.bad === 3 && has(r, 'yukarıda'), desc(r));
}

// ---------------------------------------------------------------- OMUZ PRESS
const press = (o = {}) => (u) => ({
  arms: {
    L: { abd: lerp(80, 165, u), flex: 10, elbow: lerp(85, 172, u), bend: 'up' },
    R: { abd: lerp(80, 165, u * (o.lag ?? 1)), flex: 10, elbow: lerp(85, 172, u * (o.lag ?? 1)), bend: 'up' },
  },
});
{
  results.push('Omuz press');
  let r = run('shoulder-press', sequence({ specAt: press(), reps: 3, view: 'front' }));
  check('doğru form: 3 geçerli', r.ok === 3 && r.bad === 0, desc(r));
  r = run('shoulder-press', sequence({ specAt: (u) => { const s = press()(u); s.arms.L.elbow = s.arms.R.elbow = lerp(85, 157, u); return s; }, reps: 3, view: 'front' }));
  check('yukarıda 157° açılma artık kabul (tolerans)', r.ok === 3, desc(r));
  r = run('shoulder-press', sequence({ specAt: press({ lag: 0.45 }), reps: 3, view: 'front' }));
  check('bir kol geride kalıyor → ret', r.bad === 3 && (has(r, 'eşit') || has(r, 'açılmadı')), desc(r));
}

// ---------------------------------------------------------------- OMUZ GÜNCELLEMESİ (2026-11-05)
{
  results.push('Omuz press — dirsek önde / silkme');
  const pressFwd = (u) => ({ arms: { both: { flex: lerp(70, 160, u), abd: 15, elbow: lerp(70, 172, u), bend: 'up' } } });
  let r = run('shoulder-press', sequence({ specAt: pressFwd, reps: 3, view: 'front' }));
  check('dirsekler gövdenin önünde (kollar önde açılıyor) → ret', r.bad === 3 && (has(r, 'önüne') || has(r, 'öne doğru')), desc(r));
  r = run('shoulder-press', sequence({ specAt: (u) => ({ ...press()(u), shrug: lerp(0, 0.09, u) }), reps: 3, view: 'front' }));
  check('press’te omuz silkme → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));
  r = run('shoulder-press', sequence({ specAt: (u) => ({ ...press()(u), shrug: lerp(0, 0.02, u) }), reps: 3, view: 'front' }));
  check('press’te küçük doğal omuz yükselmesi kabul', r.ok === 3, desc(r));
  r = run('shoulder-press', sequence({ specAt: press(), reps: 3, view: 'side' }));
  check('press yandan doğru form: 3 geçerli (baş üstünde sahte ‘dirsek öne’ yok)', r.ok === 3 && r.bad === 0 && !hasW(r, 'öne'), desc(r));
  r = run('shoulder-press', sequence({ specAt: pressFwd, reps: 3, view: 'side' }));
  check('press yandan dirsekler önde → ret', r.bad === 3 && (has(r, 'önüne') || has(r, 'öne doğru')), desc(r));
  r = run('shoulder-press', sequence({ specAt: press(), reps: 4, view: 'front', noise: 0.004, seed: 21 }));
  check('press doğru form, gürültülü: 4/4', r.ok === 4 && r.bad === 0, desc(r));

  results.push('Kabloyla yan açış — silkme iki omuzda');
  const cable = (o = {}) => (u) => ({
    shrug: o.shrug ? lerp(0, o.shrug, u) : 0, shrugL: o.shrugL ? lerp(0, o.shrugL, u) : 0,
    arms: { L: { abd: 8, elbow: 170 }, R: { abd: lerp(12, 88, u), flex: 15, elbow: 165 } },
  });
  r = run('cable-lateral-raise', sequence({ specAt: cable(), reps: 3, view: 'front' }));
  check('doğru form: 3 geçerli', r.ok === 3 && r.bad === 0, desc(r));
  r = run('cable-lateral-raise', sequence({ specAt: cable({ shrug: 0.085 }), reps: 3, view: 'front' }));
  check('iki omuz silkme → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));
  r = run('cable-lateral-raise', sequence({ specAt: cable({ shrugL: 0.07 }), reps: 3, view: 'front' }));
  check('çalışmayan taraftaki omuz kalkıyor → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));

  results.push('Yana eğilerek açış — eğim zorunlu');
  const lean = (o = {}) => (u) => ({
    torsoRoll: o.lean ?? -20, shrug: o.shrug ? lerp(0, o.shrug, u) : 0,
    arms: { L: { abd: 10, elbow: 170 }, R: { abd: lerp(o.lean === 0 ? 12 : 25, 92, u), flex: 15, elbow: 165 } },
  });
  r = run('leaning-lateral-raise', sequence({ specAt: lean(), reps: 3, view: 'front' }));
  check('20° yana eğik doğru form: 3 geçerli', r.ok === 3 && r.bad === 0, desc(r));
  r = run('leaning-lateral-raise', sequence({ specAt: lean({ lean: 0 }), reps: 3, view: 'front' }));
  check('dümdüz durarak yapınca → ret', r.bad === 3 && has(r, 'eğilmedi'), desc(r));
  r = run('leaning-lateral-raise', sequence({ specAt: lean({ lean: 0 }), reps: 3, view: 'front', hide: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32] }));
  check('kalça/ayak görünmezken de dümdüz duruş yakalanır', r.bad === 3 && has(r, 'eğilmedi'), desc(r));
  r = run('leaning-lateral-raise', sequence({ specAt: lean({ shrug: 0.085 }), reps: 3, view: 'front' }));
  check('eğik duruşta omuz silkme → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));

  results.push('Öne dambıl kaldırış — yükseklik / kol düzlemi / silkme');
  const fr = (o = {}) => (u) => {
    const e = lerp(5, o.top ?? 88, u) * Math.PI / 180, ph = (o.plane ?? 10) * Math.PI / 180;
    return { shrug: o.shrug ? lerp(0, o.shrug, u) : 0, arms: { both: { dir: [Math.sin(e) * Math.sin(ph), Math.cos(e), Math.sin(e) * Math.cos(ph)], elbow: 165 } } };
  };
  for (const view of ['side', 'front']) {
    r = run('front-raise', sequence({ specAt: fr(), reps: 3, view }));
    check(`${view === 'side' ? 'yandan' : 'önden'} doğru form: 3 geçerli`, r.ok === 3 && r.bad === 0, desc(r));
    r = run('front-raise', sequence({ specAt: fr({ top: 125 }), reps: 3, view }));
    check(`${view === 'side' ? 'yandan' : 'önden'} omuz hizası üstüne çıkınca → ret`, r.bad === 3 && has(r, 'üstüne'), desc(r));
    r = run('front-raise', sequence({ specAt: fr({ plane: 55 }), reps: 3, view }));
    check(`${view === 'side' ? 'yandan' : 'önden'} kollar yana açılarak kalkınca → ret`, r.bad === 3 && has(r, 'yana'), desc(r));
    r = run('front-raise', sequence({ specAt: fr({ shrug: 0.085 }), reps: 3, view }));
    check(`${view === 'side' ? 'yandan' : 'önden'} omuz silkme → ret`, r.bad === 3 && has(r, 'kulağa'), desc(r));
  }
}

{
  results.push('Baş üstü triceps (kol baş üstündeyken açı sürekliliği)');
  const ohe = (o = {}) => (u) => ({ shrug: o.shrug ? lerp(0, o.shrug, u) : 0, arms: { both: { flex: 172, abd: 8, elbow: lerp(165, 75, u), bend: 'back' } } });
  for (const view of ['side', 'front']) {
    const r = run('overhead-triceps-extension', sequence({ specAt: ohe(), reps: 3, view }));
    check(`${view === 'side' ? 'yandan' : 'önden'} doğru form: 3 geçerli`, r.ok === 3 && r.bad === 0, desc(r));
  }
  const r = run('overhead-triceps-extension', sequence({ specAt: ohe({ shrug: 0.09 }), reps: 3, view: 'front' }));
  check('omuz silkme → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));
}
{
  results.push('Güncelleme 3: press dirsek aralığı, yüze çekiş/ters pec deck/sırt gövde kontrolü');
  // omuz press — dirsekler birbirine yaklaşıyor (kollar önden kalkıyor)
  const pressIn = (u) => ({ arms: { both: { flex: lerp(55, 150, u), abd: 4, elbow: lerp(75, 172, u), bend: 'up' } } });
  let r = run('shoulder-press', sequence({ specAt: pressIn, reps: 3, view: 'front' }));
  check('press: dirsekler birbirine yaklaşıyor → ret', r.bad === 3 && has(r, 'birbirine'), desc(r));
  r = run('shoulder-press', sequence({ specAt: (u) => ({ ...press()(u), shrug: lerp(0, 0.11, u) }), reps: 3, view: 'front' }));
  check('press: belirgin silkme → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));

  // yana eğilerek açış: silkme yana açıştan bir tık katı
  const lean2 = (sh) => (u) => ({ torsoRoll: -20, shrug: lerp(0, sh, u), arms: { L: { abd: 10, elbow: 170 }, R: { abd: lerp(25, 92, u), flex: 15, elbow: 165 } } });
  r = run('leaning-lateral-raise', sequence({ specAt: lean2(0.08), reps: 3, view: 'front' }));
  check('yana eğilerek: silkme → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));

  // yüze kablo çekiş (yandan)
  const fp = (o = {}) => (u, k) => ({
    torsoPitch: (k >= 0 ? (o.lean ?? 0) : 0) + (o.sway ? Math.sin(u * Math.PI) * o.sway : 0), shrug: o.shrug ? lerp(0, o.shrug, u) : 0,
    arms: { both: { dir: [lerp(0.1, 0.9, u), lerp(0, -0.05, u), lerp(1, 0.1, u)], elbow: lerp(170, 85, u), bend: 'up' } },
  });
  r = run('face-pull', sequence({ specAt: fp(), reps: 3, view: 'side' }));
  check('yüze çekiş doğru form: 3 geçerli', r.ok === 3 && r.bad === 0, desc(r));
  r = run('face-pull', sequence({ specAt: fp({ sway: -14 }), reps: 3, view: 'side' }));
  check('yüze çekiş: geriye yaslanarak çekme → ret', r.bad === 3 && (has(r, 'sallan') || has(r, 'eğil')), desc(r));
  r = run('face-pull', sequence({ specAt: fp({ lean: -18 }), reps: 3, view: 'side' }));
  check('yüze çekiş: set boyunca geriye yatık → ret', r.bad === 3 && has(r, 'eğil'), desc(r));
  r = run('face-pull', sequence({ specAt: fp({ sway: -14 }), reps: 3, view: 'side', hide: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32] }));
  check('yüze çekiş: kalça görünmezken de salınım → ret', r.bad === 3, desc(r));
  r = run('face-pull', sequence({ specAt: fp({ shrug: 0.08 }), reps: 3, view: 'side' }));
  check('yüze çekiş: omuz silkme → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));

  // ters pec deck (yandan)
  const rpd = (o = {}) => (u, k) => ({
    torsoPitch: (k >= 0 ? (o.lean ?? 0) : 0) + (o.sway ? Math.sin(u * Math.PI) * o.sway : 0), shrug: o.shrug ? lerp(0, o.shrug, u) : 0,
    arms: { both: { dir: [lerp(0.05, 1, u), 0.05, lerp(1, -0.1, u)], elbow: o.bend ? lerp(165, o.bend, u) : 165, bend: 'in' } },
    legs: { both: { flex: 90, knee: 90 } }, hipY: 0.55,
  });
  r = run('reverse-pec-deck', sequence({ specAt: rpd(), reps: 3, view: 'side', repMs: 2600 }));
  check('ters pec deck doğru form: 3 geçerli', r.ok === 3 && r.bad === 0, desc(r));
  r = run('reverse-pec-deck', sequence({ specAt: rpd({ shrug: 0.09 }), reps: 3, view: 'side', repMs: 2600 }));
  check('ters pec deck: yandan omuz silkme → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));
  r = run('reverse-pec-deck', sequence({ specAt: rpd({ sway: -17 }), reps: 3, view: 'side', repMs: 2600 }));
  check('ters pec deck: geriye yatarak çekme → ret', r.bad === 3 && (has(r, 'sallan') || has(r, 'eğil') || has(r, 'yattı')), desc(r));
  r = run('reverse-pec-deck', sequence({ specAt: rpd({ lean: 14 }), reps: 3, view: 'side', repMs: 2600 }));
  check('ters pec deck: öne eğilmiş çalışma → ret', r.bad === 3, desc(r));
  r = run('reverse-pec-deck', sequence({ specAt: rpd({ bend: 110 }), reps: 3, view: 'side', repMs: 2600 }));
  check('ters pec deck: dirsek bükülmesi artık önemsiz (kabul)', r.ok === 3 && !has(r, 'dirsek'), desc(r));

  // sırt: oturarak kablo kürek ve lat çekiş (yandan)
  const row = (o = {}) => (u, k) => ({
    torsoPitch: (k >= 0 ? (o.lean ?? 0) : 0) + (o.sway ? Math.sin(u * Math.PI) * o.sway : 0),
    arms: { both: { dir: [lerp(0.05, 0.15, u), lerp(0.1, 0.6, u), lerp(1, -0.5, u)], elbow: lerp(170, 80, u), bend: 'fwd' } },
    legs: { both: { flex: 85, knee: 160 } }, hipY: 0.5,
  });
  r = run('seated-cable-row', sequence({ specAt: row(), reps: 3, view: 'side' }));
  check('kablo kürek doğru form: 3 geçerli', r.ok === 3 && r.bad === 0, desc(r));
  r = run('seated-cable-row', sequence({ specAt: row({ sway: -15 }), reps: 3, view: 'side' }));
  check('kablo kürek: geriye sallanarak çekme → ret', r.bad === 3, desc(r));
  r = run('seated-cable-row', sequence({ specAt: row({ lean: 16 }), reps: 3, view: 'side' }));
  check('kablo kürek: set boyunca öne eğik → ret', r.bad === 3 && has(r, 'eğil'), desc(r));
  r = run('seated-cable-row', sequence({ specAt: row({ sway: -15 }), reps: 3, view: 'side', hide: [25, 26, 27, 28, 29, 30, 31, 32] }));
  check('kablo kürek: bacaklar görünmezken (sırt+kalçadan) salınım → ret', r.bad === 3, desc(r));
  const pd = (o = {}) => (u, k) => ({
    torsoPitch: (k >= 0 ? (o.lean ?? 0) : 0) + (o.sway ? Math.sin(u * Math.PI) * o.sway : 0),
    arms: { both: { dir: [lerp(0.3, 0.6, u), lerp(-0.95, 0.75, u), lerp(0.1, -0.2, u)], elbow: lerp(170, 60, u), bend: 'up' } },
    legs: { both: { flex: 90, knee: 90 } }, hipY: 0.55,
  });
  for (const [id, spec, extra] of [['face-pull', fp(), {}], ['reverse-pec-deck', rpd(), { repMs: 2600 }], ['seated-cable-row', row(), {}], ['lat-pulldown', pd(), {}]]) {
    r = run(id, sequence({ specAt: spec, reps: 4, view: 'side', noise: 0.004, seed: 31, ...extra }));
    check(`${id} doğru form, gürültülü: 4/4 (yanlış alarm yok)`, r.ok === 4 && r.bad === 0, desc(r));
  }
  r = run('shoulder-press', sequence({ specAt: press(), reps: 4, view: 'front', noise: 0.004, seed: 32 }));
  check('shoulder-press doğru form, gürültülü: 4/4 (dirsek aralığı yanlış alarm yok)', r.ok === 4 && r.bad === 0, desc(r));
  r = run('lat-pulldown', sequence({ specAt: pd(), reps: 3, view: 'side' }));
  check('lat çekiş doğru form: 3 geçerli', r.ok === 3 && r.bad === 0, desc(r));
  r = run('lat-pulldown', sequence({ specAt: pd({ sway: -20 }), reps: 3, view: 'side' }));
  check('lat çekiş: geriye sallanarak çekme → ret', r.bad === 3, desc(r));
}
{
  results.push('Güncelleme 4: göğüs hareketleri');
  // pec deck yandan
  const pec = (o = {}) => (u, k) => ({
    torsoPitch: (k >= 0 ? (o.lean ?? 0) : 0) + (o.sway ? Math.sin(u * Math.PI) * o.sway : 0), shrug: o.shrug ? lerp(0, o.shrug, u) : 0,
    arms: { both: { dir: [lerp(1, 0.35, u), 0.15, lerp(-0.05, 1, u)], elbow: o.bend ? lerp(155, o.bend, u) : 155, bend: 'in' } },
    legs: { both: { flex: 90, knee: 90 } }, hipY: 0.55,
  });
  let r = run('pec-deck-fly', sequence({ specAt: pec(), reps: 3, view: 'side', repMs: 2600 }));
  check('pec deck yandan doğru form: 3 geçerli', r.ok === 3 && r.bad === 0, desc(r));
  r = run('pec-deck-fly', sequence({ specAt: pec(), reps: 4, view: 'side', repMs: 2600, noise: 0.004, seed: 41 }));
  check('pec deck gürültülü doğru form: 4/4', r.ok === 4 && r.bad === 0, desc(r));
  for (const yaw of [30]) {
    r = run('pec-deck-fly', sequence({ specAt: pec(), reps: 3, view: 'side', yaw, repMs: 2600 }));
    check(`pec deck yan çapraz (${yaw}°) doğru form: 3 geçerli`, r.ok === 3 && r.bad === 0, desc(r));
    r = run('pec-deck-fly', sequence({ specAt: pec({ bend: 90 }), reps: 3, view: 'side', yaw, repMs: 2600 }));
    check(`pec deck yan çapraz (${yaw}°): dirsek bükülüyor → ret`, r.bad >= 3 && has(r, 'dirsek'), desc(r));
    r = run('pec-deck-fly', sequence({ specAt: pec({ shrug: 0.08 }), reps: 3, view: 'side', yaw, repMs: 2600 }));
    check(`pec deck yan çapraz (${yaw}°): silkme → ret`, r.bad === 3 && has(r, 'kulağa'), desc(r));
  }
  r = run('pec-deck-fly', sequence({ specAt: pec({ shrug: 0.08 }), reps: 3, view: 'side', repMs: 2600 }));
  check('pec deck: omuz silkme → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));
  r = run('pec-deck-fly', sequence({ specAt: pec({ sway: 18 }), reps: 3, view: 'side', repMs: 2600 }));
  check('pec deck: gövdeyle öne sallanma → ret', r.bad === 3, desc(r));
  r = run('pec-deck-fly', sequence({ specAt: pec({ bend: 90 }), reps: 3, view: 'side', repMs: 2600 }));
  check('pec deck tam yandan: dirsek bükülmesi uyarı verir', hasW(r, 'dirsek') || has(r, 'dirsek'), desc(r));

  // kablo açışlar önden
  const cfly = (o = {}) => (u, k) => {
    const lowHigh = o.dir === 'lh';
    const e0 = lowHigh ? 25 : 120, e1 = lowHigh ? 75 : 45;
    const el = lerp(e0, e1, u) * Math.PI / 180, ph = lerp(80, -14, u) * Math.PI / 180;
    return {
      torsoPitch: o.sway ? Math.sin(u * Math.PI) * o.sway : 0, hipY: 1.0,
      arms: { both: { dir: [Math.sin(el) * Math.sin(ph), Math.cos(el), Math.sin(el) * Math.cos(ph)], elbow: o.bend ? lerp(160, o.bend, u) : 160, bend: 'in' } },
    };
  };
  for (const [id, d] of [['cable-fly-low-high', 'lh'], ['cable-fly-high-low', 'hl']]) {
    r = run(id, sequence({ specAt: cfly({ dir: d }), reps: 3, view: 'front' }));
    check(`${id} doğru form: 3 geçerli`, r.ok === 3 && r.bad === 0, desc(r));
    r = run(id, sequence({ specAt: cfly({ dir: d }), reps: 4, view: 'front', noise: 0.004, seed: 42 }));
    check(`${id} gürültülü doğru form: 4/4`, r.ok === 4 && r.bad === 0, desc(r));
  }
  r = run('cable-fly-low-high', sequence({ specAt: cfly({ dir: 'lh', bend: 125 }), reps: 3, view: 'front' }));
  check('aşağıdan yukarı: 35° dirsek değişimi artık kabul (tolerans)', r.ok === 3, desc(r));

  // dik (45°) eğimli sehpa, dambıllar tepede yüze doğru hafif eğik → kalibrasyon tamamlanmalı
  const inc = (deg, tilt) => (u) => {
    const t = (deg + tilt) * Math.PI / 180;
    const up = [0, -Math.sin(t), Math.cos(t)];
    const a = 50 * Math.PI / 180, bottom = [Math.sin(a) * 0.94, Math.cos(a) * 0.94, -0.35];
    return { rootPitch: -90 + deg, arms: { both: { dir: [lerp(up[0], bottom[0], u), lerp(up[1], bottom[1], u), lerp(up[2], bottom[2], u)], elbow: lerp(178, 70, u), bend: 'fwd' } }, legs: { both: { flex: 80, knee: 95 } } };
  };
  for (const id of ['incline-dumbbell-press', 'incline-barbell-press']) {
    r = run(id, sequence({ specAt: inc(45, -8), reps: 3, view: 'side' }));
    check(`${id}: 45° sehpada kalibrasyon tamamlanıyor ve tekrarlar algılanıyor`, r.eng.calib && r.ok + r.bad === 3, desc(r));
  }
}
// ---------------------------------------------------------------- KALICI VÜCUT ÖLÇÜMÜ (omuz silkme)
function makeProfile(hide = []) {
  const tr = new BodyTracker(); const cap = new ProfileCapture();
  for (const f of sequence({ specAt: () => ({ arms: { both: { abd: 6, elbow: 172 } } }), reps: 0, idleMs: 3000, view: 'front', hide })) {
    const r = cap.update(tr.process({ ...f, posture: 'upright' }));
    if (r.done) return r.profile;
  }
  return null;
}
{
  results.push('Vücut ölçümü + omuz silkme (yana açış, kablo, curl, itiş)');
  const prof = makeProfile();
  check('vücut ölçümü alınabiliyor', !!prof && Number.isFinite(prof.swUA) && Number.isFinite(prof.sides.L?.kulak), JSON.stringify(prof));
  const lat2 = (o = {}) => (u, k) => ({
    shrug: (o.held && (o.fromStart || k >= 0) ? o.held : 0) + (o.shrug ? lerp(0, o.shrug, u) : 0),
    arms: { both: { abd: lerp(12, 88, u), flex: 15, elbow: 165, bend: 'fwd' } },
  });
  let r = run('lateral-raise', sequence({ specAt: lat2(), reps: 3, view: 'front' }), { profile: prof });
  check('yana açış doğru form (vücut ölçümüyle): 3 geçerli', r.ok === 3 && r.bad === 0, desc(r));
  r = run('lateral-raise', sequence({ specAt: lat2(), reps: 4, view: 'front', noise: 0.004, seed: 51 }), { profile: prof });
  check('yana açış doğru form gürültülü: 4/4 (yanlış alarm yok)', r.ok === 4 && r.bad === 0, desc(r));
  r = run('lateral-raise', sequence({ specAt: lat2({ held: 0.05, fromStart: true }), reps: 3, view: 'front' }), { profile: prof });
  check('SET BAŞINDA OMUZ KALKIK: kalibrasyon alınmaz, uyarılır', !r.eng.calib && /kalkık/.test(r.last.message) && r.ok === 0, desc(r));
  r = run('lateral-raise', sequence({ specAt: lat2({ held: 0.05 }), reps: 3, view: 'front' }), { profile: prof });
  check('kalibrasyondan sonra omuz kalkık TUTULUYOR: her tekrar ret', r.bad === 3 && r.ok === 0 && has(r, 'kulağa'), desc(r));
  r = run('lateral-raise', sequence({ specAt: lat2({ shrug: 0.06 }), reps: 3, view: 'front' }), { profile: prof });
  check('yana açış daha hassas: 6 cm’lik silkme ret (eskiden geçerdi)', r.bad === 3 && has(r, 'kulağa'), desc(r));
  for (const [name, hide] of [['kulak yok', [7, 8]], ['kulak+göz yok', [1, 2, 3, 4, 5, 6, 7, 8]], ['yalnız burun', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]]]) {
    r = run('lateral-raise', sequence({ specAt: lat2({ held: 0.06 }), reps: 3, view: 'front', hide }), { profile: makeProfile(hide) });
    check(`${name}: kalkık omuz yakalanır`, r.bad === 3 && has(r, 'kulağa'), desc(r));
  }
  const cab = (o = {}) => (u, k) => ({ shrug: o.held && k >= 0 ? o.held : 0, arms: { L: { abd: 8, elbow: 170 }, R: { abd: lerp(12, 88, u), flex: 15, elbow: 165 } } });
  r = run('cable-lateral-raise', sequence({ specAt: cab(), reps: 3, view: 'front' }), { profile: prof });
  check('kablo yan açış doğru form: 3 geçerli', r.ok === 3 && r.bad === 0, desc(r));
  r = run('cable-lateral-raise', sequence({ specAt: cab({ held: 0.05 }), reps: 3, view: 'front' }), { profile: prof });
  check('kablo yan açış: kalkık tutulan omuz → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));
  r = run('dumbbell-curl', sequence({ specAt: (u, k) => ({ ...curl()(u), shrug: k >= 0 ? 0.05 : 0 }), reps: 3, view: 'front' }), { profile: prof });
  check('curl: kalkık tutulan omuz → ret', r.bad === 3 && has(r, 'kulağa'), desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl(), reps: 4, view: 'front', noise: 0.004, seed: 52 }), { profile: prof });
  check('curl doğru form gürültülü (vücut ölçümüyle): 4/4', r.ok === 4 && r.bad === 0, desc(r));
}
{
  results.push('Dirsek sabitliği / gövdeye yakınlık her kamera açısında ret');
  let r = run('dumbbell-curl', sequence({ specAt: curl({ drift: 50 }), reps: 3, view: 'front' }));
  check('curl ÖNDEN: dirsek öne kaçıyor → ret (eskiden yalnız uyarı)', r.bad === 3 && has(r, 'dirsek'), desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl({ flare: 50 }), reps: 3, view: 'side' }));
  check('curl YANDAN: dirsek yana açılıyor → ret', r.bad === 3 && (has(r, 'uzaklaştı') || has(r, 'dirsek')), desc(r));
  r = run('cable-pushdown', sequence({ specAt: (u) => ({ ...pushdown()(u), arms: { both: { flex: 8, abd: lerp(6, 45, u), elbow: lerp(85, 170, u), bend: 'fwd' } } }), reps: 3, view: 'front' }));
  check('triceps itiş ÖNDEN: dirsekler yana açılıyor → ret', r.bad === 3 && has(r, 'yana'), desc(r));
  r = run('cable-pushdown', sequence({ specAt: pushdown({ drift: 55 }), reps: 3, view: 'front' }));
  check('triceps itiş ÖNDEN: dirsek öne-arkaya oynuyor → ret', r.bad === 3 && has(r, 'dirsek'), desc(r));
  for (const view of ['side', 'front']) {
    r = run('dumbbell-curl', sequence({ specAt: curl(), reps: 4, view, noise: 0.004, seed: 53 }));
    check(`curl ${view} doğru form gürültülü: 4/4 (sıkılaşma yanlış alarm üretmiyor)`, r.ok === 4 && r.bad === 0, desc(r));
    r = run('cable-pushdown', sequence({ specAt: pushdown(), reps: 4, view, noise: 0.004, seed: 54 }));
    check(`triceps itiş ${view} doğru form gürültülü: 4/4`, r.ok === 4 && r.bad === 0, desc(r));
  }
}
{
  results.push('Göğüs press diklik/sırt, pec deck diklik, kürek dirsek açıklığı');
  const cp = (o = {}) => (u, k) => ({
    torsoPitch: (k >= 0 ? (o.lean ?? 0) : (o.leanAll ?? 0)) + (o.leanAll && k >= 0 ? o.leanAll : 0) + (o.sway ? Math.sin(u * Math.PI) * o.sway : 0),
    arms: { both: { dir: [0.35, lerp(0.75, 0.15, u), lerp(-0.2, 1, u)], elbow: lerp(80, 170, u), bend: 'fwd' } },
    legs: { both: { flex: 90, knee: 90 } }, hipY: 0.55,
  });
  let r = run('chest-press', sequence({ specAt: cp(), reps: 3, view: 'side' }));
  check('göğüs press doğru form: 3 geçerli', r.ok === 3 && r.bad === 0, desc(r));
  // göğüs press 2026-11-06'da kullanıcı isteğiyle önceki sürüme döndürüldü (sırt/diklik kuralları yok)
  r = run('chest-press', sequence({ specAt: cp(), reps: 4, view: 'side', noise: 0.004, seed: 61 }));
  check('göğüs press gürültülü doğru form: 4/4', r.ok === 4 && r.bad === 0, desc(r));
  const row2 = (o = {}) => (u) => ({
    arms: { both: { dir: [lerp(0.05, o.flare ? 0.8 : 0.15, u), lerp(0.1, 0.6, u), lerp(1, -0.5, u)], elbow: lerp(170, 80, u), bend: 'fwd' } },
    legs: { both: { flex: 85, knee: 160 } }, hipY: 0.5,
  });
  r = run('seated-cable-row', sequence({ specAt: row2({ flare: true }), reps: 3, view: 'side' }));
  check('kablo kürek: dirsekler gövdeden yana açılıyor → ret', r.bad === 3 && has(r, 'yana'), desc(r));
  r = run('seated-cable-row', sequence({ specAt: row2(), reps: 4, view: 'side', noise: 0.004, seed: 62 }));
  check('kablo kürek gürültülü doğru form: 4/4', r.ok === 4 && r.bad === 0, desc(r));
}
{
  results.push('Yana dambıl açış = kablo yan açış (iki kol birden)');
  const prof = makeProfile();
  const two = (o = {}) => (u, k) => ({
    shrug: o.held && k >= 0 ? o.held : 0,
    arms: { L: { abd: lerp(12, 88, u), flex: 15, elbow: 165 }, R: { abd: lerp(12, o.lagTop ?? 88, u), flex: 15, elbow: 165 } },
  });
  let r = run('lateral-raise', sequence({ specAt: two(), reps: 3, view: 'front' }), { profile: prof });
  check('iki kol birlikte doğru: 3 geçerli', r.ok === 3 && r.bad === 0, desc(r));
  r = run('lateral-raise', sequence({ specAt: two({ lagTop: 62 }), reps: 3, view: 'front' }), { profile: prof });
  check('bir kol omuz hizasına çıkmıyor → ret (her kol kablodaki gibi tam kalkmalı)', r.bad === 3 && has(r, 'omuz hizasına'), desc(r));
  r = run('lateral-raise', sequence({ specAt: two({ held: 0.05 }), reps: 3, view: 'front' }), { profile: prof });
  const rc = run('cable-lateral-raise', sequence({ specAt: (u, k) => ({ shrug: k >= 0 ? 0.05 : 0, arms: { L: { abd: 8, elbow: 170 }, R: { abd: lerp(12, 88, u), flex: 15, elbow: 165 } } }), reps: 3, view: 'front' }), { profile: prof });
  check('kalkık omuz: yana açış ve kablo aynı kararı veriyor (ret)', r.bad === 3 && rc.bad === 3 && has(r, 'kulağa') && has(rc, 'kulağa'), `${desc(r)} || ${desc(rc)}`);
  const cp2 = (u) => ({ arms: { both: { dir: [0.35, lerp(0.75, 0.15, u), lerp(-0.2, 1, u)], elbow: lerp(80, 170, u), bend: 'fwd' } }, legs: { both: { flex: 90, knee: 90 } }, hipY: 0.55 });
  r = run('chest-press', sequence({ specAt: cp2, reps: 4, view: 'side', noise: 0.004, seed: 63 }), { profile: prof });
  check('göğüs press (önceki ayarlar): doğru formda sahte silkme yok', r.ok === 4 && !has(r, 'kulağa') && !hasW(r, 'kulağa'), desc(r));
}
// ---------------------------------------------------------------- YANLIŞ ALARM (gürültülü veri, doğru form)
{
  results.push('Yanlış alarm yok: yüksek gürültüde doğru form');
  const N = 0.004; // ~5 px titreşim (1280 genişlikte)
  let r = run('dumbbell-curl', sequence({ specAt: curl(), reps: 5, view: 'side', noise: N, seed: 11 }));
  check('curl yandan, gürültülü: 5/5 geçerli', r.ok === 5 && r.bad === 0, desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl(), reps: 5, view: 'front', noise: N, seed: 12 }));
  check('curl önden, gürültülü: 5/5 geçerli', r.ok === 5 && r.bad === 0, desc(r));
  r = run('lateral-raise', sequence({ specAt: lat(), reps: 5, view: 'front', noise: N, seed: 13 }));
  check('yana açış, gürültülü: 5/5 geçerli', r.ok === 5 && r.bad === 0, desc(r));
  r = run('squat', sequence({ specAt: squat(), reps: 5, view: 'side', noise: N, seed: 14 }));
  check('squat, gürültülü: 5/5 geçerli', r.ok === 5 && r.bad === 0, desc(r));
  r = run('cable-pushdown', sequence({ specAt: pushdown(), reps: 5, view: 'side', noise: N, seed: 15 }));
  check('triceps itiş, gürültülü: 5/5 geçerli', r.ok === 5 && r.bad === 0, desc(r));
  r = run('bench-press', sequence({ specAt: bench(), reps: 5, view: 'side', noise: N, seed: 16 }));
  check('bench, gürültülü: 5/5 geçerli', r.ok === 5 && r.bad === 0, desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl(), reps: 4, view: 'side', noise: N, seed: 17, hide: [7, 8, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32] }));
  check('curl yakın çekim (kalça+kulak yok), gürültülü: 4/4 geçerli', r.ok === 4 && r.bad === 0, desc(r));
  r = run('dumbbell-curl', sequence({ specAt: curl(), reps: 4, view: 'front', yaw: 20, seed: 18 }));
  check('curl 20° çapraz duruş: 4/4 geçerli', r.ok === 4 && r.bad === 0, desc(r));
}

// ---------------------------------------------------------------- ÇÖKMEME / DAYANIKLILIK
{
  results.push('Tüm hareketler: rastgele/eksik verilerle çökmeme');
  const rng = mulberry(3);
  let crashed = [];
  for (const def of EXERCISES) {
    try {
      const tr = new BodyTracker();
      const eng = new FormEngine(def, () => {});
      for (let i = 0; i < 90; i++) {
        const sk = skeleton({ torsoPitch: rng() * 60 - 20, rootPitch: def.posture === 'lying' ? -90 : def.posture === 'prone' ? 90 : 0, arms: { both: { flex: rng() * 160, abd: rng() * 90, elbow: 40 + rng() * 140 } }, legs: { both: { flex: rng() * 90, knee: 60 + rng() * 118 } } });
        const hide = [...Array(33).keys()].filter(() => rng() < 0.25);
        const f = project(sk, { view: rng() < 0.5 ? 'front' : 'side', rng, hide, noise: 0.004 });
        const P = tr.process({ ...f, t: i * 33, posture: def.posture, allSides: def.allSides });
        eng.update(P);
      }
    } catch (e) { crashed.push(`${def.id}: ${e.message}`); }
  }
  check(`72 hareket çökmeden çalıştı (${EXERCISES.length})`, crashed.length === 0 && EXERCISES.length === 72, crashed.join('; '));
  const nos = new Set(EXERCISES.map((e) => e.no));
  check('1–72 numaralarının hepsi var', nos.size === 72 && [...Array(72).keys()].every((i) => nos.has(i + 1)));
  const noRules = EXERCISES.filter((e) => !e.rules.length).map((e) => e.id);
  check('her harekette en az bir form kuralı var', noRules.length === 0, noRules.join(','));
}

console.log(results.join('\n'));
console.log(`\n${passed} geçti, ${failed} başarısız`);
process.exit(failed ? 1 : 0);

