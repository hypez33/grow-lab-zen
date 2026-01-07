import { useState, useEffect, useCallback, useRef } from 'react';

interface BlowDetectionResult {
  isBlowing: boolean;
  isListening: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  error: string | null;
  blowIntensity: number; // 0-1 intensity of blow
}

export const useBlowDetection = (
  onBlowDetected?: (intensity: number) => void,
  threshold: number = 0.15 // Sensitivity threshold for blow detection
): BlowDetectionResult => {
  const [isBlowing, setIsBlowing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blowIntensity, setBlowIntensity] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isBlowingRef = useRef(false);

  const checkAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = average / 255; // Normalize to 0-1

    // Check for blow (higher volume = more intense blow)
    const isCurrentlyBlowing = normalizedLevel > threshold;
    
    setBlowIntensity(Math.min(1, normalizedLevel * 2)); // Scale up for visual feedback
    
    if (isCurrentlyBlowing !== isBlowingRef.current) {
      isBlowingRef.current = isCurrentlyBlowing;
      setIsBlowing(isCurrentlyBlowing);
      
      if (isCurrentlyBlowing && onBlowDetected) {
        onBlowDetected(normalizedLevel);
      }
    }

    // Continue checking
    animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
  }, [threshold, onBlowDetected]);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      streamRef.current = stream;
      
      // Create audio context
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;
      
      // Connect microphone to analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      setIsListening(true);
      
      // Start checking audio levels
      checkAudioLevel();
      
    } catch (err) {
      console.error('Microphone access error:', err);
      setError('Mikrofon-Zugriff verweigert');
      setIsListening(false);
    }
  }, [checkAudioLevel]);

  const stopListening = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setIsListening(false);
    setIsBlowing(false);
    setBlowIntensity(0);
    isBlowingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isBlowing,
    isListening,
    startListening,
    stopListening,
    error,
    blowIntensity
  };
};
