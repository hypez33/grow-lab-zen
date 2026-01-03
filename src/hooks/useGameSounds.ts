import { useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';

let audioContext: AudioContext | null = null;
let audioUnlocked = false;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Unlock audio on iOS - must be triggered by user interaction
const unlockAudio = async () => {
  if (audioUnlocked) return;

  const ctx = getAudioContext();

  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // If resume is blocked, wait for next gesture
      return;
    }
  }

  // Play a silent buffer to fully unlock on iOS
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  audioUnlocked = true;
};

// Set up global touch/click listener to unlock audio
if (typeof window !== 'undefined') {
  const unlockEvents = ['touchstart', 'touchend', 'click', 'keydown'];

  const handleUnlock = async () => {
    await unlockAudio();
    if (audioUnlocked) {
      unlockEvents.forEach(event => {
        document.removeEventListener(event, handleUnlock, true);
      });
    }
  };

  unlockEvents.forEach(event => {
    document.addEventListener(event, handleUnlock, true);
  });
}

export const useGameSounds = () => {
  const soundEnabled = useGameStore((state) => state.soundEnabled);

  const ensureContext = useCallback(async () => {
    if (!audioUnlocked) return null;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return null;
      }
    }
    return ctx;
  }, []);

  const playTap = useCallback(async () => {
    if (!soundEnabled) return;
    const ctx = await ensureContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, [soundEnabled, ensureContext]);

  const playHarvest = useCallback(async () => {
    if (!soundEnabled) return;
    const ctx = await ensureContext();
    if (!ctx) return;

    // Layered harvest sound - sparkle + coin jingle
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

      const startTime = ctx.currentTime + i * 0.05;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });

    // Add a shimmer noise
    const bufferSize = ctx.sampleRate * 0.2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    
    const noiseSource = ctx.createBufferSource();
    const noiseGain = ctx.createGain();
    const noiseFilter = ctx.createBiquadFilter();
    
    noiseSource.buffer = noiseBuffer;
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 3000;
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    
    noiseGain.gain.setValueAtTime(0.08, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    noiseSource.start(ctx.currentTime);
  }, [soundEnabled, ensureContext]);

  const playPurchase = useCallback(async () => {
    if (!soundEnabled) return;
    const ctx = await ensureContext();
    if (!ctx) return;

    // Satisfying "ka-ching" sound
    const oscillator1 = ctx.createOscillator();
    const oscillator2 = ctx.createOscillator();
    const gainNode1 = ctx.createGain();
    const gainNode2 = ctx.createGain();

    oscillator1.connect(gainNode1);
    oscillator2.connect(gainNode2);
    gainNode1.connect(ctx.destination);
    gainNode2.connect(ctx.destination);

    // First hit
    oscillator1.type = 'square';
    oscillator1.frequency.setValueAtTime(1200, ctx.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
    
    gainNode1.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    // Second ring
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(2000, ctx.currentTime + 0.05);
    oscillator2.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.2);
    
    gainNode2.gain.setValueAtTime(0, ctx.currentTime);
    gainNode2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

    oscillator1.start(ctx.currentTime);
    oscillator1.stop(ctx.currentTime + 0.1);
    oscillator2.start(ctx.currentTime + 0.03);
    oscillator2.stop(ctx.currentTime + 0.25);
  }, [soundEnabled, ensureContext]);

  const playError = useCallback(async () => {
    if (!soundEnabled) return;
    const ctx = await ensureContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }, [soundEnabled, ensureContext]);

  const playLevelUp = useCallback(async () => {
    if (!soundEnabled) return;
    const ctx = await ensureContext();
    if (!ctx) return;

    // Epic fanfare with multiple layers
    
    // Layer 1: Rising arpeggio (triumphant feel)
    const arpeggio = [523, 659, 784, 1047, 1319, 1568]; // C5 to G6
    arpeggio.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      const startTime = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.02, startTime + 0.4);
      
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });

    // Layer 2: Power chord hit
    const chordFreqs = [262, 330, 392, 523]; // C major chord
    chordFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      const startTime = ctx.currentTime + 0.5;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);
      
      osc.start(startTime);
      osc.stop(startTime + 0.8);
    });

    // Layer 3: Sparkle/shimmer effect
    const sparkleFreqs = [2000, 2500, 3000, 3500, 4000];
    sparkleFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.3);
      
      const startTime = ctx.currentTime + 0.6 + i * 0.05;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.06, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
      
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });

    // Layer 4: Deep bass boom
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    
    bassOsc.connect(bassGain);
    bassGain.connect(ctx.destination);
    
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(80, ctx.currentTime + 0.5);
    bassOsc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1);
    
    bassGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.5);
    bassGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
    
    bassOsc.start(ctx.currentTime + 0.5);
    bassOsc.stop(ctx.currentTime + 1);

    // Layer 5: Victory chime at the end
    const chimeNotes = [1047, 1319, 1568, 2093]; // High C major
    chimeNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      const startTime = ctx.currentTime + 0.9 + i * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
      
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }, [soundEnabled, ensureContext]);

  return { playTap, playHarvest, playPurchase, playError, playLevelUp };
};
