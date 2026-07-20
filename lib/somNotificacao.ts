let ctx: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AudioCtor();
  }
  return ctx;
}

function tocarTom(frequencia: number, inicioEm: number, duracao: number, volume: number) {
  const audio = getContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = frequencia;
  osc.connect(gain);
  gain.connect(audio.destination);

  const t0 = audio.currentTime + inicioEm;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duracao);

  osc.start(t0);
  osc.stop(t0 + duracao + 0.02);
}

// Toca um "ding-dong" curto e discreto de duas notas.
export function tocarSomNotificacao() {
  try {
    const audio = getContext();
    if (!audio) return;
    if (audio.state === "suspended") audio.resume();
    tocarTom(880, 0, 0.18, 0.15);
    tocarTom(1318.5, 0.09, 0.22, 0.13);
  } catch {
    // silencioso — som é um extra, nunca deve quebrar a notificação em si
  }
}
