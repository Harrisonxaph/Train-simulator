export class RailwayAudio {
  private ctx: AudioContext | null = null;
  muted = false;
  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume = 0.07,
    delay = 0,
  ) {
    if (this.muted) return;
    try {
      this.ctx ??= new AudioContext();
      const ctx = this.ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain(),
        now = ctx.currentTime + delay;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 0.92,
        now + duration,
      );
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    } catch {
      /* Audio may be unavailable; construction and driving remain usable. */
    }
  }
  place(connected = false) {
    this.tone(connected ? 700 : 400, 0.07, "triangle", 0.05);
    if (connected) this.tone(950, 0.1, "sine", 0.04, 0.06);
  }
  horn(kind: "steam" | "diesel" | "electric") {
    if (kind === "steam") {
      this.tone(650, 0.7, "sine");
      this.tone(860, 0.65, "sine", 0.04);
    } else if (kind === "diesel") {
      this.tone(195, 0.6, "sawtooth", 0.035);
      this.tone(245, 0.6, "triangle", 0.05);
    } else {
      this.tone(440, 0.35, "sine");
      this.tone(660, 0.4, "sine", 0.04, 0.2);
    }
  }
  celebrate() {
    [523, 659, 784, 1046].forEach((f, i) =>
      this.tone(f, 0.25, "sine", 0.045, i * 0.12),
    );
  }
  wheel() {
    this.tone(90, 0.025, "triangle", 0.012);
    this.tone(120, 0.025, "triangle", 0.01, 0.07);
  }
  dispose() {
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }
}
