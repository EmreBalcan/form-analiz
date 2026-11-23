// Kalıcı veriler (cihazda, localStorage): kullanıcı bilgileri, program durumu, antrenman geçmişi.
import { dayKey, evolveLevel, generateProgram, startLevel } from './generator.js';

const K = { user: 'fa.user', state: 'fa.programState', history: 'fa.history' };
const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* kota / gizli mod */ } };

export const loadUser = () => read(K.user, null);
export function saveUser(u) {
  const old = loadUser();
  const user = { ...u, seed: old?.seed ?? Math.floor(Math.random() * 1e6), updatedAt: Date.now() };
  write(K.user, user);
  // deneyim değiştiyse ya da ilk kayıtsa seviye deneyimden başlar
  const st = loadState();
  if (!st || old?.experience !== user.experience) {
    const now = Date.now();
    write(K.state, { level: startLevel(user), levelSince: now, createdAt: st?.createdAt ?? now, lastDay: st?.lastDay ?? null });
  }
  return user;
}
export const loadState = () => read(K.state, null);
export const saveState = (s) => write(K.state, s);
export const loadHistory = () => read(K.history, []);

/** Bir seti geçmişe ekle (aynı gün + aynı hareket + aynı kaynak birleşir). */
export function logSet({ exerciseId, accepted, rejected, target = null, program = null, seconds = null }) {
  if (!accepted && !rejected && !seconds) return;
  const h = loadHistory();
  const date = dayKey();
  let e = h.find((x) => x.date === date && x.exerciseId === exerciseId && (x.program?.day ?? null) === (program?.day ?? null));
  if (!e) { e = { date, t: Date.now(), exerciseId, sets: [], program }; h.push(e); }
  e.sets.push({ accepted, rejected, target, seconds, t: Date.now() });
  e.t = Date.now();
  while (h.length > 3000) h.shift();
  write(K.history, h);
}

/** Program gününü tamamlandı olarak işaretle. */
export function markDayDone(dayIdx) {
  const st = loadState();
  if (!st) return;
  st.lastDay = dayIdx; st.lastDayAt = Date.now();
  saveState(st);
}

/** Seviyeyi geçmişe göre güncelleyip programı üret. */
export function currentProgram() {
  const user = loadUser();
  if (!user) return { user: null };
  let st = loadState();
  if (!st) { const now = Date.now(); st = { level: startLevel(user), levelSince: now, createdAt: now, lastDay: null }; }
  const history = loadHistory();
  const ev = evolveLevel(user, st, history);
  if (ev.level !== st.level) { st = { ...st, level: ev.level, levelSince: ev.levelSince, events: [...(st.events || []), ...ev.events.map((x) => ({ ...x, t: Date.now() }))].slice(-10) }; }
  saveState(st);
  return { user, state: st, events: ev.events, program: generateProgram(user, st, history) };
}

export function setLevel(level) {
  const st = loadState();
  if (!st) return;
  saveState({ ...st, level: Math.max(1, Math.min(6, level)), levelSince: Date.now() });
}
