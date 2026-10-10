// Web Audio API Ding chime synthesizer
class ChimeAudio {
  private ctx: AudioContext | null = null;

  playDing() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      }

      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;

      // Primary crystalline bell tone
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.08); // Sweet upward shimmer
      osc1.frequency.setValueAtTime(1760, now + 0.08);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.8);

      // Harmony overtone
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.04); // E6

      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc2.start(now + 0.04);
      osc2.stop(now + 0.75);
    } catch (err) {
      console.warn('[ChimeAudio] Failed to play ding sound:', err);
    }
  }
}

export const chimeAudio = new ChimeAudio();
