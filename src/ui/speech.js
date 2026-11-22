// Sesli uyarı: Türkçe ses, öncelik (kritik > uyarı > sayım), aynı cümleyi kısa sürede tekrarlamama.
// Tarayıcıda Web Speech API; Android uygulamasında (APK) cihazın kendi ses motoru (Capacitor TextToSpeech),
// çünkü Android WebView Web Speech API'yi desteklemez.
const cap = typeof window !== 'undefined' ? window.Capacitor : null;
export const isNativeApp = () => !!cap?.isNativePlatform?.();
function nativeCall(plugin, method, opts = {}) {
  const p = cap?.Plugins?.[plugin];
  return p?.[method] ? p[method](opts) : cap.nativePromise(plugin, method, opts);
}

export class Speaker {
  constructor() {
    this.enabled = true;
    this.voice = null;
    this.recent = new Map();
    this.currentPriority = 0;
    this.native = isNativeApp();
    this.supported = this.native || (typeof window !== 'undefined' && 'speechSynthesis' in window);
    if (!this.native && this.supported) {
      const pick = () => {
        const vs = speechSynthesis.getVoices();
        this.voice = vs.find((v) => v.lang?.toLowerCase().startsWith('tr')) || null;
      };
      pick();
      speechSynthesis.onvoiceschanged = pick;
    }
  }
  /** priority: 3 kritik, 2 uyarı, 1 sayım */
  say(text, priority = 1, cooldownMs = 3500) {
    if (!this.enabled || !this.supported || !text) return;
    const now = performance.now();
    if (now - (this.recent.get(text) || -1e9) < cooldownMs) return;
    if (this.native) {
      // yerel ses motoru: daha yüksek öncelikli cümle konuşmayı keser
      if (this.nativeBusyUntil > now && priority <= this.currentPriority && priority < 2) return;
      this.recent.set(text, now);
      this.currentPriority = priority;
      this.nativeBusyUntil = now + 300 + text.length * 70;
      const go = () => nativeCall('TextToSpeech', 'speak', { text, lang: 'tr-TR', rate: 1.05, pitch: 1, volume: 1, category: 'playback' });
      (priority >= 2 ? nativeCall('TextToSpeech', 'stop').catch(() => {}).then(go) : go())
        .catch(() => {}).finally(() => { this.currentPriority = 0; });
      return;
    }
    if (speechSynthesis.speaking) {
      if (priority <= this.currentPriority) {
        if (priority < 2) return; // sayım beklemez
      } else speechSynthesis.cancel();
    }
    this.recent.set(text, now);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'tr-TR';
    if (this.voice) u.voice = this.voice;
    u.rate = 1.08;
    u.onend = () => { this.currentPriority = 0; };
    this.currentPriority = priority;
    speechSynthesis.speak(u);
  }
  stop() {
    if (this.native) { nativeCall('TextToSpeech', 'stop').catch(() => {}); return; }
    if (this.supported) speechSynthesis.cancel();
  }
}

/** Set sırasında ekran kapanmasın: uygulamada KeepAwake eklentisi, tarayıcıda Wake Lock API. */
let wakeLock = null;
export async function keepScreenOn(on) {
  try {
    if (isNativeApp()) { await nativeCall('KeepAwake', on ? 'keepAwake' : 'allowSleep'); return; }
    if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* desteklenmiyor */ }
}
