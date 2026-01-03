import { useCallback, useRef, useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Screen } from '@/store/navigationStore';

type MusicTheme = {
  baseFreq: number;
  scale: number[];
  tempo: number;
  waveType: OscillatorType;
  filterFreq: number;
  volume: number;
  bassEnabled: boolean;
  padEnabled: boolean;
};

const themes: Record<Screen, MusicTheme> = {
  grow: {
    baseFreq: 220, // A3
    scale: [0, 2, 4, 7, 9, 12], // Pentatonic
    tempo: 2000,
    waveType: 'sine',
    filterFreq: 800,
    volume: 0.08,
    bassEnabled: true,
    padEnabled: true,
  },
  dryroom: {
    baseFreq: 196, // G3
    scale: [0, 3, 5, 7, 10, 12], // Minor pentatonic
    tempo: 3000,
    waveType: 'triangle',
    filterFreq: 600,
    volume: 0.06,
    bassEnabled: true,
    padEnabled: true,
  },
  sales: {
    baseFreq: 262, // C4
    scale: [0, 2, 4, 5, 7, 9, 11, 12], // Major
    tempo: 1200,
    waveType: 'triangle',
    filterFreq: 1200,
    volume: 0.07,
    bassEnabled: true,
    padEnabled: false,
  },
  business: {
    baseFreq: 220, // A3
    scale: [0, 2, 3, 5, 7, 9, 10, 12], // Dorian
    tempo: 1800,
    waveType: 'triangle',
    filterFreq: 900,
    volume: 0.06,
    bassEnabled: true,
    padEnabled: true,
  },
  koks: {
    baseFreq: 185, // F#3 - darker, intense
    scale: [0, 1, 4, 5, 7, 8, 11, 12], // Harmonic minor
    tempo: 1000,
    waveType: 'sawtooth',
    filterFreq: 900,
    volume: 0.06,
    bassEnabled: true,
    padEnabled: true,
  },
  meth: {
    baseFreq: 174, // F3 - gritty, tense
    scale: [0, 1, 3, 5, 7, 8, 10, 12], // Minor
    tempo: 1300,
    waveType: 'square',
    filterFreq: 700,
    volume: 0.06,
    bassEnabled: true,
    padEnabled: false,
  },
  shop: {
    baseFreq: 294, // D4
    scale: [0, 2, 3, 5, 7, 9, 10, 12], // Dorian
    tempo: 1500,
    waveType: 'sine',
    filterFreq: 1000,
    volume: 0.07,
    bassEnabled: true,
    padEnabled: true,
  },
  genetics: {
    baseFreq: 185, // F#3
    scale: [0, 1, 4, 5, 7, 8, 11, 12], // Harmonic minor
    tempo: 1800,
    waveType: 'sawtooth',
    filterFreq: 500,
    volume: 0.05,
    bassEnabled: false,
    padEnabled: true,
  },
  skills: {
    baseFreq: 247, // B3
    scale: [0, 2, 4, 6, 7, 9, 11, 12], // Lydian
    tempo: 1600,
    waveType: 'triangle',
    filterFreq: 900,
    volume: 0.06,
    bassEnabled: true,
    padEnabled: true,
  },
  quests: {
    baseFreq: 330, // E4
    scale: [0, 2, 3, 5, 7, 8, 10, 12], // Natural minor
    tempo: 1000,
    waveType: 'triangle',
    filterFreq: 1400,
    volume: 0.07,
    bassEnabled: true,
    padEnabled: false,
  },
  collection: {
    baseFreq: 277, // C#4
    scale: [0, 2, 4, 7, 9, 12], // Pentatonic
    tempo: 2500,
    waveType: 'sine',
    filterFreq: 700,
    volume: 0.05,
    bassEnabled: false,
    padEnabled: true,
  },
  settings: {
    baseFreq: 165, // E3
    scale: [0, 5, 7, 12], // Sparse
    tempo: 4000,
    waveType: 'sine',
    filterFreq: 400,
    volume: 0.03,
    bassEnabled: false,
    padEnabled: true,
  },
  turf: {
    baseFreq: 207, // G#3
    scale: [0, 3, 5, 7, 10, 12], // Minor pentatonic
    tempo: 1600,
    waveType: 'triangle',
    filterFreq: 950,
    volume: 0.06,
    bassEnabled: true,
    padEnabled: true,
  },
};

export const useBackgroundMusic = () => {
  const musicEnabled = useGameStore(state => state.musicEnabled);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<{ oscillator: OscillatorNode; gain: GainNode }[]>([]);
  const intervalRef = useRef<number | null>(null);
  const currentScreenRef = useRef<Screen | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const hasInteractedRef = useRef(false);

  const getContext = useCallback(async (): Promise<AudioContext | null> => {
    // Don't create AudioContext until user has interacted
    if (!hasInteractedRef.current) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      masterGainRef.current = audioContextRef.current.createGain();
      masterGainRef.current.connect(audioContextRef.current.destination);
      masterGainRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    }

    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const stopAllSounds = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    activeNodesRef.current.forEach(({ oscillator, gain }) => {
      try {
        const ctx = audioContextRef.current;
        if (ctx) {
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          oscillator.stop(ctx.currentTime + 0.6);
        }
      } catch (e) {
        // Already stopped
      }
    });
    activeNodesRef.current = [];

    if (masterGainRef.current && audioContextRef.current) {
      masterGainRef.current.gain.exponentialRampToValueAtTime(
        0.001,
        audioContextRef.current.currentTime + 0.3
      );
    }
  }, []);

  const playNote = useCallback((ctx: AudioContext, theme: MusicTheme, noteIndex: number) => {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(theme.filterFreq, ctx.currentTime);
    filter.Q.setValueAtTime(1, ctx.currentTime);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const semitone = theme.scale[noteIndex % theme.scale.length];
    const octave = Math.floor(noteIndex / theme.scale.length);
    const freq = theme.baseFreq * Math.pow(2, (semitone + octave * 12) / 12);

    osc.type = theme.waveType;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainRef.current!);

    const duration = theme.tempo / 1000 * 0.8;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(theme.volume, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.1);

    activeNodesRef.current.push({ oscillator: osc, gain });

    // Cleanup old nodes
    activeNodesRef.current = activeNodesRef.current.filter(node => {
      try {
        return node.oscillator.context.state === 'running';
      } catch {
        return false;
      }
    });
  }, []);

  const playPad = useCallback((ctx: AudioContext, theme: MusicTheme) => {
    if (!theme.padEnabled) return;

    // Safely get scale indices, defaulting to root if index doesn't exist
    const scale = theme.scale;
    const padFreqs = [
      theme.baseFreq,
      theme.baseFreq * Math.pow(2, (scale[Math.min(2, scale.length - 1)] || 0) / 12),
      theme.baseFreq * Math.pow(2, (scale[Math.min(4, scale.length - 1)] || 0) / 12),
    ];

    padFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(theme.filterFreq * 0.5, ctx.currentTime);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.5, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGainRef.current!);

      const padVolume = theme.volume * 0.3;
      const duration = theme.tempo / 1000 * 4;
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(padVolume, ctx.currentTime + duration * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + duration + 0.2);

      activeNodesRef.current.push({ oscillator: osc, gain });
    });
  }, []);

  const playBass = useCallback((ctx: AudioContext, theme: MusicTheme, noteIndex: number) => {
    if (!theme.bassEnabled) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    const semitone = theme.scale[noteIndex % theme.scale.length];
    const freq = (theme.baseFreq / 2) * Math.pow(2, semitone / 12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainRef.current!);

    const duration = theme.tempo / 1000 * 2;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(theme.volume * 0.5, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.1);

    activeNodesRef.current.push({ oscillator: osc, gain });
  }, []);

  const startMusic = useCallback(async (screen: Screen) => {
    if (!musicEnabled) return;

    // Mark as interacted to allow AudioContext creation
    hasInteractedRef.current = true;

    const ctx = await getContext();
    if (!ctx) return; // AudioContext not ready yet

    const theme = themes[screen];
    currentScreenRef.current = screen;

    // Fade in master volume
    if (masterGainRef.current) {
      masterGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
      masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, ctx.currentTime);
      masterGainRef.current.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.5);
    }

    let noteCounter = 0;
    let beatCounter = 0;

    // Play initial pad
    playPad(ctx, theme);

    // Main music loop
    intervalRef.current = window.setInterval(() => {
      if (!musicEnabled || currentScreenRef.current !== screen) {
        stopAllSounds();
        return;
      }

      // Melodic notes - semi-random from scale
      const noteIndex = Math.floor(Math.random() * theme.scale.length * 2);
      playNote(ctx, theme, noteIndex);

      // Bass on every 2nd beat
      if (beatCounter % 2 === 0) {
        playBass(ctx, theme, noteCounter % 3);
      }

      // Pad every 8 beats
      if (beatCounter % 8 === 0) {
        playPad(ctx, theme);
      }

      noteCounter++;
      beatCounter++;
    }, theme.tempo / 2);

    setIsPlaying(true);
  }, [musicEnabled, getContext, playNote, playPad, playBass, stopAllSounds]);

  const changeScreen = useCallback(async (screen: Screen) => {
    if (currentScreenRef.current === screen && isPlaying) return;

    if (!musicEnabled) return;

    // Mark as interacted to allow AudioContext creation
    hasInteractedRef.current = true;

    const ctx = await getContext();
    if (!ctx) {
      // If no context yet, just start music (will create context)
      await startMusic(screen);
      return;
    }

    // Fade out master gain for smooth transition
    if (masterGainRef.current && isPlaying) {
      masterGainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    }

    // Clear old interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Stop old oscillators after fade
    const oldNodes = [...activeNodesRef.current];
    activeNodesRef.current = [];
    setTimeout(() => {
      oldNodes.forEach(({ oscillator, gain }) => {
        try {
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          oscillator.stop(ctx.currentTime + 0.2);
        } catch (e) {
          // Already stopped
        }
      });
    }, 500);

    // Wait for crossfade
    await new Promise(resolve => setTimeout(resolve, 600));

    // Start new music with fade in
    startMusic(screen);
  }, [musicEnabled, isPlaying, getContext, startMusic]);

  const toggleMusic = useCallback(async (screen: Screen) => {
    if (isPlaying) {
      stopAllSounds();
      setIsPlaying(false);
    } else {
      await startMusic(screen);
    }
  }, [isPlaying, stopAllSounds, startMusic]);

  // Stop music when disabled
  useEffect(() => {
    if (!musicEnabled && isPlaying) {
      stopAllSounds();
      setIsPlaying(false);
    }
  }, [musicEnabled, isPlaying, stopAllSounds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllSounds();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopAllSounds]);

  return { changeScreen, toggleMusic, isPlaying };
};
