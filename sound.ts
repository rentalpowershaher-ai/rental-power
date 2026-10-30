let ctx: AudioContext | null = null;

// لازم يتنادى بعد أول لمسة من المستخدم (قيود المتصفح)
export function unlockAudio() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!ctx) ctx = new AC();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  } catch {}
}

// صفارة عالية ومزعجة (~6 ثواني) للإشعارات العاجلة
export function playSiren() {
  try {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.9, t);
    for (let i = 0; i < 12; i++) o.frequency.setValueAtTime(i % 2 ? 1100 : 700, t + i * 0.5);
    g.gain.setValueAtTime(0.9, t + 5.9);
    g.gain.linearRampToValueAtTime(0.0001, t + 6);
    o.start(t);
    o.stop(t + 6);
    (navigator as any).vibrate?.([500, 200, 500, 200, 500, 200, 500, 200, 500]);
  } catch {}
}

export function playAlert() {
  try {
    if (!ctx) return;
    const t = ctx.currentTime;
    [880, 1175, 880, 1175].forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx!.destination);
      const s = t + i * 0.2;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.5, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.18);
      o.start(s);
      o.stop(s + 0.19);
    });
    (navigator as any).vibrate?.([200, 100, 200]);
  } catch {}
}