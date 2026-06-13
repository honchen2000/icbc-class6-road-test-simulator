/**
 * React wrapper around the speech helpers. Exposes whether synthesis is
 * supported plus stable `say` / `stop` callbacks, and cancels any in-flight
 * utterance when the component using it unmounts.
 */
import { useCallback, useEffect, useState } from 'react';
import { cancelSpeech, isSpeechSupported, speak, type SpeakOptions } from '../lib/speech';

export interface UseSpeech {
  supported: boolean;
  say: (text: string, opts?: SpeakOptions) => void;
  stop: () => void;
}

export function useSpeech(): UseSpeech {
  const [supported] = useState<boolean>(() => isSpeechSupported());

  const say = useCallback(
    (text: string, opts?: SpeakOptions) => {
      if (!supported) return;
      speak(text, opts);
    },
    [supported],
  );

  const stop = useCallback(() => {
    if (!supported) return;
    cancelSpeech();
  }, [supported]);

  useEffect(() => {
    return () => {
      if (supported) cancelSpeech();
    };
  }, [supported]);

  return { supported, say, stop };
}
