import { MusicComposition } from '../types/astra';

const NOTE_SEMITONES: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1,
  D: 2, 'D#': 3, Eb: 3,
  E: 4, Fb: 4, 'E#': 5,
  F: 5, 'F#': 6, Gb: 6,
  G: 7, 'G#': 8, Ab: 8,
  A: 9, 'A#': 10, Bb: 10,
  B: 11, Cb: 11,
};

export function noteToFrequency(noteStr: string): number {
  const cleaned = String(noteStr || 'C4').trim();
  const match = cleaned.match(/^([A-Ga-g][#b]?)(-?\d)$/);
  if (!match) return 261.63;
  const letter = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  const octave = parseInt(match[2], 10);
  const semitone = NOTE_SEMITONES[letter] ?? 0;
  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface StemLevels {
  melody: number;
  chords: number;
  bass: number;
  drums: number;
}

function createReverbImpulse(ctx: BaseAudioContext, seconds = 1.9, decay = 2.6): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const channelData = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const env = Math.pow(1 - i / length, decay);
      channelData[i] = (Math.random() * 2 - 1) * env;
    }
  }
  return impulse;
}

function getBeatLengthSeconds(bpm: number): number {
  const safeBpm = Math.max(45, Math.min(200, bpm || 95));
  return 60 / safeBpm;
}

function getTotalBeats(comp: MusicComposition): number {
  const beatDur = getBeatLengthSeconds(comp.bpm);
  const targetFromSec = Math.max(16, Math.round((comp.durationSeconds || 45) / beatDur));
  const chordBeats = (comp.chordProgression || []).reduce((acc, c) => acc + (c.durationBeats || 4), 0);
  const maxMelodyBeat = (comp.melodyNotes || []).reduce(
    (max, n) => Math.max(max, (n.beat || 0) + (n.durationBeats || 1)),
    0
  );
  return Math.max(targetFromSec, chordBeats || 16, Math.ceil(maxMelodyBeat / 4) * 4);
}

function scheduleCompositionOnContext(
  ctx: BaseAudioContext,
  masterInput: AudioNode,
  comp: MusicComposition,
  bpmOverride: number,
  stems: StemLevels,
  startTime: number
): { durationSeconds: number } {
  const beatDur = getBeatLengthSeconds(bpmOverride || comp.bpm);
  const totalBeats = getTotalBeats(comp);
  const durationSeconds = totalBeats * beatDur;

  // Buses
  const melodyBus = ctx.createGain();
  melodyBus.gain.value = stems.melody;
  const chordBus = ctx.createGain();
  chordBus.gain.value = stems.chords;
  const bassBus = ctx.createGain();
  bassBus.gain.value = stems.bass;
  const drumBus = ctx.createGain();
  drumBus.gain.value = stems.drums;

  // Convolution ambient reverb send for warmth
  const convolver = ctx.createConvolver();
  convolver.buffer = createReverbImpulse(ctx, 1.8, 2.5);
  const reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.24;

  melodyBus.connect(masterInput);
  melodyBus.connect(reverbSend);
  chordBus.connect(masterInput);
  chordBus.connect(reverbSend);
  bassBus.connect(masterInput);
  drumBus.connect(masterInput);
  reverbSend.connect(convolver);
  convolver.connect(masterInput);

  // 1. Chord progression (warm Rhodes/electric-piano pad + stereo shimmer)
  const chords = comp.chordProgression?.length
    ? comp.chordProgression
    : [
        { chordName: 'Am7', notes: ['A3', 'C4', 'E4', 'G4'], durationBeats: 4 },
        { chordName: 'Fmaj7', notes: ['F3', 'A3', 'C4', 'E4'], durationBeats: 4 },
        { chordName: 'C', notes: ['C4', 'E4', 'G4', 'B4'], durationBeats: 4 },
        { chordName: 'G', notes: ['G3', 'B3', 'D4', 'F4'], durationBeats: 4 },
      ];

  let cursorBeat = 0;
  let chordIdx = 0;
  while (cursorBeat < totalBeats) {
    const step = chords[chordIdx % chords.length];
    const stepBeats = Math.max(1, step.durationBeats || 4);
    const t0 = startTime + cursorBeat * beatDur;
    const dur = Math.min(stepBeats * beatDur, startTime + durationSeconds - t0);

    if (dur > 0.05) {
      step.notes.forEach((n, idx) => {
        const freq = noteToFrequency(n);
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(freq, t0);
        osc2.frequency.setValueAtTime(freq * 1.003, t0); // subtle chorus detune

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1900, t0);
        filter.frequency.exponentialRampToValueAtTime(750, t0 + dur);

        const voiceAmp = 0.12 / Math.max(1, Math.sqrt(step.notes.length));
        const stagger = idx * 0.025; // natural piano arpeggiated roll
        gain.gain.setValueAtTime(0.0001, t0 + stagger);
        gain.gain.linearRampToValueAtTime(voiceAmp, t0 + stagger + 0.04);
        gain.gain.exponentialRampToValueAtTime(voiceAmp * 0.55, t0 + dur * 0.65);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(chordBus);

        osc1.start(t0 + stagger);
        osc2.start(t0 + stagger);
        osc1.stop(t0 + dur + 0.05);
        osc2.stop(t0 + dur + 0.05);
      });
    }
    cursorBeat += stepBeats;
    chordIdx++;
  }

  // 2. Sub/Analog Bass Pattern
  const bassNotes = comp.bassPattern?.length
    ? comp.bassPattern
    : chords.map((c, idx) => ({
        note: (c.notes[0] || 'C3').replace(/\d/, '2'),
        beat: idx * 4,
        durationBeats: 3.5,
        velocity: 0.85,
      }));
  const bassCycleBeats = Math.max(
    16,
    Math.ceil(bassNotes.reduce((m, n) => Math.max(m, n.beat + n.durationBeats), 0) / 4) * 4
  );

  for (let offset = 0; offset < totalBeats; offset += bassCycleBeats) {
    bassNotes.forEach((bn) => {
      const absBeat = offset + bn.beat;
      if (absBeat >= totalBeats) return;
      const t0 = startTime + absBeat * beatDur;
      const dur = Math.min((bn.durationBeats || 1) * beatDur, startTime + durationSeconds - t0);
      if (dur <= 0.03) return;

      const freq = noteToFrequency(bn.note);
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      subOsc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      subOsc.frequency.setValueAtTime(freq * 0.5, t0);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, t0);
      filter.frequency.exponentialRampToValueAtTime(160, t0 + dur);

      const amp = 0.24 * (bn.velocity ?? 0.85);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(amp, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(bassBus);

      osc.start(t0);
      subOsc.start(t0);
      osc.stop(t0 + dur + 0.03);
      subOsc.stop(t0 + dur + 0.03);
    });
  }

  // 3. Lead Melody with expressive vibrato & warm plucked/flute timbre
  const melody = comp.melodyNotes || [];
  const melodyCycleBeats = Math.max(
    16,
    Math.ceil(melody.reduce((m, n) => Math.max(m, n.beat + n.durationBeats), 0) / 4) * 4
  );

  for (let offset = 0; offset < totalBeats; offset += melodyCycleBeats) {
    melody.forEach((mn) => {
      const absBeat = offset + mn.beat;
      if (absBeat >= totalBeats) return;
      const t0 = startTime + absBeat * beatDur;
      const dur = Math.min((mn.durationBeats || 0.75) * beatDur, startTime + durationSeconds - t0);
      if (dur <= 0.04) return;

      const freq = noteToFrequency(mn.note);
      const carrier = ctx.createOscillator();
      const harmonic = ctx.createOscillator();
      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      carrier.type = 'triangle';
      harmonic.type = 'sine';
      carrier.frequency.setValueAtTime(freq, t0);
      harmonic.frequency.setValueAtTime(freq * 2, t0);

      vibrato.frequency.setValueAtTime(5.2, t0);
      vibratoGain.gain.setValueAtTime(freq * 0.007, t0);
      vibrato.connect(vibratoGain);
      vibratoGain.connect(carrier.frequency);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3400, t0);
      filter.frequency.exponentialRampToValueAtTime(1400, t0 + dur);

      const amp = 0.22 * (mn.velocity ?? 0.85);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(amp, t0 + 0.025);
      gain.gain.exponentialRampToValueAtTime(amp * 0.65, t0 + dur * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.value = 0.25;

      carrier.connect(filter);
      harmonic.connect(harmonicGain);
      harmonicGain.connect(filter);
      filter.connect(gain);
      gain.connect(melodyBus);

      vibrato.start(t0);
      carrier.start(t0);
      harmonic.start(t0);
      vibrato.stop(t0 + dur + 0.04);
      carrier.stop(t0 + dur + 0.04);
      harmonic.stop(t0 + dur + 0.04);
    });
  }

  // 4. 16-Step Drum & Percussion Kit
  const kickSteps = comp.drumPattern?.kick || [0, 4, 8, 12];
  const snareSteps = comp.drumPattern?.snare || [4, 12];
  const hihatSteps = comp.drumPattern?.hihat || [0, 2, 4, 6, 8, 10, 12, 14];
  const percSteps = comp.drumPattern?.perc || [3, 7, 11, 15];

  const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    noiseData[i] = Math.random() * 2 - 1;
  }

  const totalSteps = Math.floor(totalBeats * 4);
  const stepDur = beatDur / 4;

  for (let s = 0; s < totalSteps; s++) {
    const stepInBar = s % 16;
    const t0 = startTime + s * stepDur;

    if (kickSteps.includes(stepInBar)) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(145, t0);
      osc.frequency.exponentialRampToValueAtTime(42, t0 + 0.14);
      gain.gain.setValueAtTime(0.45, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      osc.connect(gain);
      gain.connect(drumBus);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    }

    if (snareSteps.includes(stepInBar)) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, t0);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.24, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(drumBus);
      noise.start(t0);
      noise.stop(t0 + 0.16);

      const tone = ctx.createOscillator();
      const toneGain = ctx.createGain();
      tone.type = 'triangle';
      tone.frequency.setValueAtTime(195, t0);
      tone.frequency.exponentialRampToValueAtTime(110, t0 + 0.08);
      toneGain.gain.setValueAtTime(0.18, t0);
      toneGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
      tone.connect(toneGain);
      toneGain.connect(drumBus);
      tone.start(t0);
      tone.stop(t0 + 0.11);
    }

    if (hihatSteps.includes(stepInBar)) {
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6500, t0);
      const gain = ctx.createGain();
      const accent = stepInBar % 4 === 0 ? 0.09 : 0.055;
      gain.gain.setValueAtTime(accent, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(drumBus);
      noise.start(t0);
      noise.stop(t0 + 0.06);
    }

    if (percSteps.includes(stepInBar)) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(stepInBar % 2 === 0 ? 390 : 520, t0);
      osc.frequency.exponentialRampToValueAtTime(280, t0 + 0.07);
      gain.gain.setValueAtTime(0.08, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
      osc.connect(gain);
      gain.connect(drumBus);
      osc.start(t0);
      osc.stop(t0 + 0.1);
    }
  }

  return { durationSeconds };
}

export class AstraMusicEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying = false;
  private startCtxTime = 0;
  private trackDuration = 0;
  private timerId: number | null = null;
  private onProgressCb?: (elapsed: number, total: number) => void;
  private onEndedCb?: () => void;

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public async play(
    composition: MusicComposition,
    bpmOverride: number,
    stems: StemLevels,
    loop: boolean,
    onProgress?: (elapsed: number, total: number) => void,
    onEnded?: () => void
  ): Promise<void> {
    this.stop();

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    this.ctx = ctx;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.85;
    this.masterGain = masterGain;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    this.analyser = analyser;

    compressor.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    this.onProgressCb = onProgress;
    this.onEndedCb = onEnded;
    this.isPlaying = true;
    this.startCtxTime = ctx.currentTime + 0.05;

    const { durationSeconds } = scheduleCompositionOnContext(
      ctx,
      compressor,
      composition,
      bpmOverride,
      stems,
      this.startCtxTime
    );
    this.trackDuration = durationSeconds;

    const tick = () => {
      if (!this.isPlaying || !this.ctx) return;
      const elapsed = Math.max(0, this.ctx.currentTime - this.startCtxTime);
      this.onProgressCb?.(Math.min(elapsed, this.trackDuration), this.trackDuration);

      if (elapsed >= this.trackDuration) {
        if (loop) {
          this.play(composition, bpmOverride, stems, true, onProgress, onEnded);
        } else {
          this.stop();
          this.onEndedCb?.();
        }
        return;
      }
      this.timerId = window.setTimeout(tick, 120);
    };

    this.timerId = window.setTimeout(tick, 100);
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        // ignore close error
      }
      this.ctx = null;
    }
    this.analyser = null;
    this.masterGain = null;
  }
}

function encodeWavFromAudioBuffer(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export async function renderCompositionToWavBlob(
  composition: MusicComposition,
  bpmOverride: number,
  stems: StemLevels
): Promise<Blob> {
  const sampleRate = 44100;
  const totalBeats = getTotalBeats(composition);
  const beatDur = getBeatLengthSeconds(bpmOverride || composition.bpm);
  const durationSec = Math.min(120, Math.max(8, totalBeats * beatDur + 1.0));
  const offline = new OfflineAudioContext(2, Math.floor(sampleRate * durationSec), sampleRate);

  const compressor = offline.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 18;
  compressor.ratio.value = 4;
  compressor.connect(offline.destination);

  scheduleCompositionOnContext(offline, compressor, composition, bpmOverride, stems, 0.05);
  const renderedBuffer = await offline.startRendering();
  return encodeWavFromAudioBuffer(renderedBuffer);
}
