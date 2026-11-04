// Sesli uyarı: Türkçe ses, öncelik (kritik > uyarı > sayım), aynı cümleyi kısa sürede tekrarlamama.
export class Speaker {
  constructor() {
    this.enabled = true;
    this.voice = null;
    this.recent = new Map();
    this.currentPriority = 0;
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    if (this.supported) {
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
    if (speechSynthesis.speaking) {
      if (priority <= this.currentPriority) {
        if (priority < 2) return; // sayım beklemez
        // uyarı: kuyruğa al (tek bir tane)
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
  stop() { if (this.supported) speechSynthesis.cancel(); }
}
