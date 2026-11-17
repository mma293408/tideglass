'use strict';

class HarborSound {
  constructor() {
    this.enabled = true;
    this.context = null;
  }

  play(event) {
    if (!this.enabled || !window.AudioContext) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      const phrases = {
        launch: [[196,0,.31],[293.66,.11,.43],[392,.21,.55]],
        stroke: [[185,0,.19]],
        blocked: [[88,0,.11]],
        tide: [[146.83,0,.34],[110,.07,.28]],
        light: [[494,0,.25],[659.25,.07,.38],[880,.14,.44]],
        moor: [[220,0,.29],[329.63,.12,.42]],
        undo: [[233,0,.17],[174.61,.06,.26]],
        clear: [[196,0,.37],[293.66,.12,.36],[392,.24,.42],[493.88,.37,.65]],
        voyage: [[196,0,.40],[293.66,.13,.45],[392,.26,.50],[587.33,.41,.68],[783.99,.57,.75]],
      };
      for (const [frequency,delay,duration] of phrases[event] ?? []) {
        this.bell(frequency, delay, duration, event === 'stroke' ? .033 : .068);
      }
    } catch {
      // Audio permissions or resource limits never affect a voyage.
    }
  }

  bell(frequency, delay, duration, volume) {
    const context = this.context;
    const start = context.currentTime + delay;
    const tone = context.createOscillator();
    const envelope = context.createGain();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(frequency * 1.015, start);
    tone.frequency.exponentialRampToValueAtTime(frequency, start + .06);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + .014);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    tone.connect(envelope).connect(context.destination);
    tone.start(start);
    tone.stop(start + duration);
    tone.onended = () => {
      tone.disconnect();
      envelope.disconnect();
    };
  }
}