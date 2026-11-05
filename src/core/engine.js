// Analiz motoru: kalibrasyon, tekrar durum makinesi, kural değerlendirme, tekrar kabul/ret.
import { M } from './measures.js';
import { median, clamp, percentile } from './geometry.js';
import { PART_TR } from './landmarks.js';

const START_P = 0.15;   // bu ilerlemenin altında: başlangıç pozisyonu
const ENTER_P = 0.30;   // tekrar başladı
const PEAK_P = 0.80;    // tepe bölgesi
const NOISE_P = 0.45;   // bunun altında kalan hareket tekrar sayılmaz (titreşim)
const MIN_CONF = 0.35;  // altında ölçüm yok sayılır
const REJECT_CONF = 0.65; // tekrar reddetmek için gereken güven

export class FormEngine {
  constructor(def, onEvent = () => {}) {
    this.def = def;
    this.onEvent = onEvent;
    this.rules = (def.rules || []).map(normalizeRule);
    this.reset();
  }

  reset() {
    this.state = 'waiting';
    this.calib = null;
    this.calibBuf = [];
    this.readyBuf = [];
    this.rep = null;
    this.reps = [];
    this.accepted = 0;
    this.rejected = 0;
    this.metricHist = [];
    this.activeSide = this.def.sides === 'single' ? null : undefined;
    this.ruleLive = new Map();
    this.lastCue = new Map();
    this.hold = { goodMs: 0, lastT: null, broken: false, breaks: 0 };
    this.lastT = null;
    this.message = '';
  }

  /** Eklem açısı modu: 'auto' = segment kısalmasına göre 2B/3B seçimi (body.js joint). */
  angleMode() {
    return this.def.angleMode || 'auto';
  }

  ctx(P) {
    return { angleMode: this.angleMode(P), calib: this.calib, def: this.def, engine: this };
  }

  /** Ölçülecek taraflar. */
  sides(P) {
    const req = this.def.required || ['shoulder'];
    const avail = P.sidesFor(req);
    if (this.def.sides === 'single') {
      if (this.activeSide && avail.includes(this.activeSide)) return [this.activeSide];
      return avail.slice(0, 1);
    }
    return avail;
  }

  metricValue(P, ctx) {
    const m = this.def.metric;
    const fn = typeof m.fn === 'function' ? m.fn : M[m.fn];
    const req = this.def.required || ['shoulder'];
    const avail = P.sidesFor(req);
    if (m.global) {
      const r = fn(P, ctx, null);
      return r && r.conf >= MIN_CONF ? { v: r.v, conf: r.conf, perSide: {} } : null;
    }
    const perSide = {};
    for (const s of avail) {
      const r = fn(P, ctx, s);
      if (r && r.conf >= MIN_CONF && Number.isFinite(r.v)) perSide[s] = r.v;
    }
    const keys = Object.keys(perSide);
    if (!keys.length) return null;
    if (this.def.sides === 'single') {
      this.updateActiveSide(perSide, P.t);
      const s = this.activeSide && perSide[this.activeSide] !== undefined ? this.activeSide : keys[0];
      return { v: perSide[s], conf: 1, perSide, side: s };
    }
    const v = keys.reduce((a, k) => a + perSide[k], 0) / keys.length;
    return { v, conf: 1, perSide };
  }

  /** Tek taraflı hareketlerde çalışan tarafı bul: son 2 sn'de en çok hareket eden. */
  updateActiveSide(perSide, t) {
    // geçmiş tekrar sırasında da kaydedilir (asıl hareket orada); taraf yalnızca tekrar dışında değişir
    this.metricHist.push({ t, perSide });
    while (this.metricHist.length && t - this.metricHist[0].t > 2500) this.metricHist.shift();
    if (this.rep && this.activeSide) return;
    const range = (s) => {
      const vals = this.metricHist.map((h) => h.perSide[s]).filter(Number.isFinite);
      return vals.length > 5 ? Math.max(...vals) - Math.min(...vals) : 0;
    };
    const cands = Object.keys(perSide);
    if (!this.activeSide || !cands.includes(this.activeSide)) { this.activeSide = cands[0]; return; }
    const other = cands.find((s) => s !== this.activeSide);
    if (other && range(other) > range(this.activeSide) * 1.6 + 8) this.activeSide = other;
  }

  progress(v) {
    const { start, target } = this.def.metric;
    return (v - start) / (target - start);
  }

  missingParts(P) {
    const req = this.def.required || [];
    const sides = this.def.sides === 'single' || P.view === 'side' ? [P.near || 'L', P.near === 'L' ? 'R' : 'L'] : ['L', 'R'];
    // en az bir taraf tam görünmeli
    const okSide = sides.find((s) => P.hasSide(s, req));
    if (okSide) return [];
    const best = sides.map((s) => req.filter((p) => !P.ok(P.idx(s, p)))).sort((a, b) => a.length - b.length)[0];
    return best.map((p) => PART_TR[p] || p);
  }

  update(P) {
    const t = P.t;
    const dt = this.lastT === null ? 33 : clamp(t - this.lastT, 1, 200);
    this.lastT = t;
    const ctx = this.ctx(P);
    const missing = this.missingParts(P);
    const viewOk = !this.def.view || this.def.view === 'any' || [this.def.view, ...(this.def.viewAlt || [])].includes(P.view);
    const snap = { state: this.state, view: P.view, viewOk, missing, progress: 0, metric: null, rules: [], message: '' };

    if (missing.length) {
      this.state = this.calib ? 'paused' : 'waiting';
      snap.state = this.state;
      snap.message = `${missing.join(', ')} görünmüyor — kamerayı uzaklaştır veya açısını değiştir`;
      this.hold.lastT = null;
      return this.finishSnap(snap);
    }

    const mv = this.metricValue(P, ctx);
    if (!mv) {
      snap.message = 'Ana ölçüm alınamıyor';
      return this.finishSnap(snap);
    }
    const p = this.progress(mv.v);
    snap.metric = mv.v; snap.progress = p; snap.side = mv.side;

    // ---------------- kalibrasyon
    if (!this.calib) {
      this.state = 'calibrating';
      snap.state = 'calibrating';
      const startOk = this.def.mode === 'hold' ? this.holdFormOk(P, ctx) : p < START_P + 0.1;
      if (startOk) {
        this.calibBuf.push({ t, P, v: mv.v });
        while (this.calibBuf.length && t - this.calibBuf[0].t > 1000) this.calibBuf.shift();
        const span = this.calibBuf.length ? t - this.calibBuf[0].t : 0;
        const vals = this.calibBuf.map((c) => c.v);
        const range = Math.abs(this.def.metric.target - this.def.metric.start);
        // sabitlik: uç değerler (titreşim) hariç %10–%90 aralığı
        const steady = percentile(vals, 0.9) - percentile(vals, 0.1) < range * 0.15;
        if (span >= 800 && steady) this.captureCalib(ctx);
        snap.message = steady ? 'Kalibrasyon: sabit dur…' : 'Kalibrasyon: başlangıç pozisyonunda sabit dur';
      } else {
        this.calibBuf = [];
        snap.message = `Başlangıç pozisyonuna geç: ${this.def.startText || ''}`;
      }
      return this.finishSnap(snap);
    }

    if (this.def.mode === 'hold') return this.updateHold(P, ctx, dt, snap);

    // ---------------- tekrar durum makinesi
    if (!this.rep) {
      this.state = 'ready';
      this.readyBuf.push({ P, t, p });
      while (this.readyBuf.length > 8) this.readyBuf.shift();
      this.evalRules(P, ctx, dt, 'idle', snap);
      if (p > ENTER_P) {
        this.startRep(ctx, t);
        this.state = 'active';
      }
    }
    if (this.rep) {
      const r = this.rep;
      r.frames++;
      if (p > r.maxP) { r.maxP = p; r.tPeak = t; r.localMin = null; }
      if (p >= 1 && !r.reached) { r.reached = true; r.tReach = t; }
      if (p >= PEAK_P) r.peakMs += dt;
      const phase = p >= PEAK_P ? 'peak' : (r.maxP >= PEAK_P ? 'back' : 'out');
      this.evalRules(P, ctx, dt, phase, snap);
      // dönüşteki en düşük nokta (yalnızca tepeden sonra)
      if (p < r.maxP - 0.05) r.localMin = Math.min(r.localMin ?? p, p);
      // bitiş koşulları
      if (p < START_P) {
        this.finishRep(t, true);
      } else if (r.maxP >= 0.6 && r.localMin != null && r.maxP - r.localMin > 0.3 && p - r.localMin > 0.25 && r.localMin > START_P) {
        // başlangıca dönmeden yeni tekrara başladı → önceki tekrar eksik dönüşle biter
        this.finishRep(t, false);
        this.startRep(ctx, t);
        this.rep.maxP = p;
      } else if (t - r.t0 > 15000) {
        this.rep = null;
      }
    }
    snap.state = this.state;
    return this.finishSnap(snap);
  }

  finishSnap(snap) {
    snap.rules = this.rules.map((rule) => {
      const live = this.ruleLive.get(rule.id) || { status: 'na' };
      return { id: rule.id, text: rule.label || rule.text, level: rule.reject !== undefined ? 'critical' : 'warning', ...live };
    });
    snap.accepted = this.accepted; snap.rejected = this.rejected;
    snap.hold = this.def.mode === 'hold' ? { ...this.hold } : null;
    snap.calibrated = !!this.calib;
    if (!snap.message) {
      if (this.state === 'ready') snap.message = this.def.mode === 'hold' ? '' : 'Hazır — tekrara başla';
    }
    return snap;
  }

  captureCalib(ctx) {
    const frames = this.calibBuf;
    const calib = { hsd: {}, values: {}, t: frames[frames.length - 1].t };
    // omuz–kafa mesafeleri (silkme kalibrasyonu)
    const hsdAll = frames.map((f) => f.P.headShoulderDist()).filter(Boolean);
    for (const s of ['L', 'R']) {
      const names = new Set();
      hsdAll.forEach((h) => h[s] && Object.keys(h[s]).forEach((n) => names.add(n)));
      if (!names.size) continue;
      calib.hsd[s] = {};
      for (const n of names) {
        const vals = hsdAll.map((h) => h[s]?.[n]).filter(Number.isFinite);
        if (vals.length >= Math.max(3, hsdAll.length * 0.4)) calib.hsd[s][n] = median(vals);
      }
    }
    this.calib = calib;
    // kalibrasyona göre ölçülen kuralların taban değerleri
    const ctx2 = { ...ctx, calib };
    for (const rule of this.rules.filter((r) => r.relative === 'calib')) {
      calib.values[rule.id] = {};
      for (const s of rule.global ? ['_'] : ['L', 'R']) {
        const vals = frames.map((f) => rule.fn(f.P, ctx2, s === '_' ? null : s)).filter((r) => r && r.conf >= MIN_CONF);
        if (vals.length >= 3) calib.values[rule.id][s] = { v: median(vals.map((r) => r.v)), src: vals[vals.length - 1].src };
      }
    }
    this.calibBuf = [];
    this.state = 'ready';
    this.onEvent({ type: 'calibrated' });
  }

  startRep(ctx, t) {
    const base = {};
    const atStart = this.readyBuf.filter((f) => f.p < START_P);
    const startFrames = (atStart.length ? atStart : this.readyBuf).slice(-5);
    for (const rule of this.rules.filter((r) => r.relative === 'rep')) {
      base[rule.id] = {};
      for (const s of rule.global ? ['_'] : ['L', 'R']) {
        const vals = startFrames.map((f) => rule.fn(f.P, { ...ctx, calib: this.calib }, s === '_' ? null : s)).filter((r) => r && r.conf >= MIN_CONF);
        if (vals.length) base[rule.id][s] = { v: median(vals.map((r) => r.v)), src: vals[vals.length - 1].src };
      }
    }
    const t0 = this.readyBuf.length ? this.readyBuf.filter((f) => f.p < START_P).pop()?.t ?? t : t;
    this.rep = { t0, tPeak: t, maxP: 0, reached: false, frames: 0, base, viol: new Map(), extremes: new Map(), alerted: new Map(), range: new Map() };
    // aralık kurallarını başlangıç kareleriyle tohumla
    for (const rule of this.rules.filter((x) => x.relative === 'range')) {
      for (const f of startFrames) this.measureRule(rule, f.P, { ...ctx, calib: this.calib }, this.rep);
    }
  }

  holdFormOk(P, ctx) {
    return this.rules.filter((r) => r.reject !== undefined).every((rule) => {
      const res = this.measureRule(rule, P, ctx, null);
      return !res || !res.violReject;
    });
  }

  /** Bir kuralı ölç: tüm taraflar için en kötü değeri döndür. */
  measureRule(rule, P, ctx, rep) {
    // sides 'all': tek kollu harekette bile görünen tüm omuzlar (ör. silkme iki omuzda da ölçülür)
    const sides = rule.global ? [null]
      : rule.sides === 'all' ? P.sidesFor(['shoulder'])
        : rule.sides === 'active' ? this.sides(P).slice(0, 1) : this.sides(P);
    let worst = null;
    for (const s of sides) {
      const r = rule.fn(P, ctx, s);
      if (!r || !Number.isFinite(r.v) || r.conf < MIN_CONF) continue;
      let v = r.v;
      const key = s ?? '_';
      if (rule.relative === 'range') {
        // tekrar boyunca toplam hareket aralığı (max − min); başlangıç noktasından bağımsız
        if (!rep) continue;
        const rk = `${rule.id}|${key}`;
        let g = rep.range.get(rk);
        if (!g || g.src !== r.src) { g = { min: v, max: v, src: r.src }; rep.range.set(rk, g); }
        g.min = Math.min(g.min, v); g.max = Math.max(g.max, v);
        v = g.max - g.min;
      } else if (rule.relative) {
        const store = rule.relative === 'calib' ? this.calib?.values?.[rule.id] : rep?.base?.[rule.id];
        if (!store) continue;
        let b = store[key];
        if (!b || b.src !== r.src) {
          // kaynak değişti (ör. kalça kadrajdan çıktı) → bu kaynak için tabanı şimdi kur
          if (rule.relative === 'rep' && rep) { store[key] = { v, src: r.src }; b = store[key]; } else continue;
        }
        v = v - b.v;
      } else if (r.relOnly) continue; // mutlak kural, göreli ölçümle değerlendirilemez
      if (rule.abs) v = Math.abs(v);
      const thr = (x) => (typeof x === 'function' ? x(P, ctx, s) : x);
      const cmp = (lim) => lim !== undefined && (rule.op === '<' ? v < thr(lim) : v > thr(lim));
      const violReject = cmp(rule.reject);
      const violWarn = violReject || cmp(rule.warn);
      const score = rule.op === '<' ? -v : v;
      if (!worst || score > worst.score) worst = { v, raw: r.v, conf: r.conf, src: r.src, side: s, violReject, violWarn, score };
    }
    return worst;
  }

  evalRules(P, ctx, dt, phase, snap) {
    const rep = this.rep;
    for (const rule of this.rules) {
      const phases = Array.isArray(rule.phase) ? rule.phase : [rule.phase];
      const inPhase = phases.includes('always') || (phase !== 'idle' && (phases.includes('active') || phases.includes(phase)));
      if (!inPhase) {
        const prev = this.ruleLive.get(rule.id);
        if (phase === 'idle') this.ruleLive.set(rule.id, { ...(prev || {}), status: prev && prev.status !== 'na' ? 'idle' : 'na' });
        continue;
      }
      if (rule.views && !rule.views.includes(P.view)) {
        this.ruleLive.set(rule.id, { status: 'view', note: `${rule.views.includes('side') ? 'yandan' : 'önden'} çekimde ölçülür` });
        continue;
      }
      const res = this.measureRule(rule, P, ctx, rep);
      if (!res) {
        this.ruleLive.set(rule.id, { status: 'na', note: 'ölçülemiyor' });
        continue;
      }
      const viewMatch = !rule.bestView || rule.bestView === P.view;
      const trusted = res.conf >= REJECT_CONF && viewMatch;
      const canReject = res.violReject && trusted;
      // güvenilmeyen ölçüm (yanlış açı / düşük güven): yalnızca ret eşiği aşılırsa uyar
      if (!trusted && rule.reject !== undefined) res.violWarn = res.violReject;
      const status = res.violReject ? (canReject ? 'bad' : 'warn') : res.violWarn ? 'warn' : 'ok';
      this.ruleLive.set(rule.id, { status, value: res.v, src: res.src, conf: res.conf, side: res.side });

      if (rule.agg === 'extreme') {
        if (rep) {
          const e = rep.extremes.get(rule.id);
          const better = rule.op === '<' ? (e === undefined || res.v > e.v) : (e === undefined || res.v < e.v);
          // 'extreme' kuralında hedef: fazın en iyi değeri eşiği geçmeli (ör. tepe noktasında kilit)
          if (better) rep.extremes.set(rule.id, { v: res.v, conf: res.conf, canRejectCtx: res.conf >= REJECT_CONF && viewMatch, src: res.src });
        }
        continue;
      }
      // süreklilik: ihlal minMs boyunca sürmeli
      const key = rule.id;
      const st = (rep ? rep.viol : this.idleViol || (this.idleViol = new Map())).get(key) || { run: 0, runReject: 0, max: 0, rejectMs: 0, worst: null };
      if (res.violWarn) {
        st.run += dt;
        if (canReject) st.runReject += dt; else st.runReject = 0;
        if (!st.worst || res.score > st.worst.score) st.worst = res;
      } else { st.run = 0; st.runReject = 0; }
      st.max = Math.max(st.max, st.run);
      st.rejectMs = Math.max(st.rejectMs, st.runReject);
      (rep ? rep.viol : this.idleViol).set(key, st);
      if (st.run >= rule.minMs) this.alert(rule, st.runReject >= rule.minMs ? 'critical' : 'warning', P.t, rep);
    }
  }

  alert(rule, level, t, rep) {
    if (rep) {
      const prev = rep.alerted.get(rule.id);
      if (prev === 'critical' || prev === level) return;
      rep.alerted.set(rule.id, level);
    } else {
      const last = this.lastCue.get(rule.id) || 0;
      if (t - last < 4000) return;
      this.lastCue.set(rule.id, t);
    }
    this.onEvent({ type: 'cue', level, rule: rule.id, text: rule.text, cue: rule.cue || rule.text });
  }

  finishRep(t, returned) {
    const r = this.rep;
    this.rep = null;
    this.readyBuf = [];
    if (r.maxP < NOISE_P) return;
    const reasons = [];
    const warnings = [];
    const m = this.def.metric;
    if (!r.reached && m.romCritical !== false) reasons.push(m.romText || 'Hareket tam açıklıkta yapılmadı');
    if (!returned && m.romCritical !== false) reasons.push(m.returnText || 'Başlangıç pozisyonuna tam dönülmedi');
    for (const rule of this.rules) {
      if (rule.agg === 'extreme') {
        const e = r.extremes.get(rule.id);
        if (!e) continue;
        const fail = (lim) => lim !== undefined && (rule.op === '<' ? e.v < lim : e.v > lim);
        if (fail(rule.reject) && e.canRejectCtx) reasons.push(rule.text);
        else if (fail(rule.reject) || fail(rule.warn)) warnings.push(rule.text);
        if (fail(rule.warn) || fail(rule.reject)) this.onEvent({ type: 'cue', level: fail(rule.reject) && e.canRejectCtx ? 'critical' : 'warning', rule: rule.id, text: rule.text, cue: rule.cue || rule.text, silent: true });
        continue;
      }
      const st = r.viol.get(rule.id);
      if (!st || st.max < rule.minMs) continue;
      if (rule.reject !== undefined && st.rejectMs >= rule.minMs) reasons.push(rule.text);
      else warnings.push(rule.text);
    }
    // tempo
    const dur = t - r.t0;
    const tp = this.def.tempo || {};
    const outMs = (r.tReach ?? r.tPeak) - r.t0;
    const backMs = t - r.tPeak;
    if (tp.minOutMs && outMs < tp.minOutMs) warnings.push(tp.outText || 'Hareket çok hızlı — kontrollü yap');
    if (tp.minBackMs && returned && backMs < tp.minBackMs) warnings.push(tp.backText || 'Dönüş çok hızlı — ağırlığı kontrollü indir');
    if (tp.minPeakMs && r.reached && r.peakMs < tp.minPeakMs) warnings.push(tp.peakText || 'Tepe noktasında kısa bir an bekle')
    const ok = reasons.length === 0;
    if (ok) this.accepted++; else this.rejected++;
    const rep = { n: this.reps.length + 1, ok, reasons: unique(reasons), warnings: unique(warnings), durationMs: dur, rom: Math.round(r.maxP * 100), t };
    this.reps.push(rep);
    this.onEvent({ type: 'rep', rep, accepted: this.accepted, rejected: this.rejected });
  }

  // ---------------- tutma (plank) modu
  updateHold(P, ctx, dt, snap) {
    this.state = 'ready';
    this.evalRules(P, ctx, dt, 'idle', snap);
    const bad = this.rules.some((rule) => {
      const st = this.idleViol?.get(rule.id);
      return rule.reject !== undefined && st && st.runReject >= rule.minMs;
    });
    if (bad) {
      if (!this.hold.broken) {
        this.hold.broken = true; this.hold.breaks++;
        const reasons = this.rules.filter((rule) => this.idleViol?.get(rule.id)?.runReject >= rule.minMs).map((r) => r.text);
        this.rejected++;
        const rep = { n: this.reps.length + 1, ok: false, reasons, warnings: [], durationMs: 0, t: P.t, hold: true };
        this.reps.push(rep);
        this.onEvent({ type: 'rep', rep, accepted: this.accepted, rejected: this.rejected });
      }
    } else {
      this.hold.broken = false;
      this.hold.goodMs += dt;
      const sec = Math.floor(this.hold.goodMs / 1000);
      if (sec > this.accepted) { this.accepted = sec; if (sec % 10 === 0) this.onEvent({ type: 'hold', seconds: sec }); }
    }
    snap.state = bad ? 'paused' : 'active';
    snap.message = bad ? 'Duruş bozuldu — süre durdu' : 'Süre işliyor';
    return this.finishSnap(snap);
  }
}

const GLOBAL_MEASURES = ['torsoPitch', 'torsoLean', 'torsoRoll', 'wristSpread', 'stanceWidth', 'kneeSpreadRatio', 'chinOverHands', 'ankleSplit', 'headHeight', 'torsoFromVertical', 'wristLevel', 'armElevDiff', 'footLevel', 'frontKnee', 'backKnee', 'frontKneeOverToe', 'stepKnee', 'sideLean'];

function unique(a) { return [...new Set(a)]; }

function normalizeRule(r) {
  const fn = typeof r.measure === 'function' ? r.measure : M[r.measure];
  if (!fn) throw new Error(`Bilinmeyen ölçüm: ${r.measure} (${r.id})`);
  return {
    op: '>', phase: 'active', minMs: 200, agg: 'sustain', ...r, fn,
    global: r.global ?? GLOBAL_MEASURES.includes(r.measure),
  };
}
