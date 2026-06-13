/**
 * Web Speech synthesis wrappers, consumed by the exam UI and the drill.
 * SpeechSynthesis is broadly supported; callers should check isSpeechSupported()
 * and degrade gracefully (e.g. show the instruction text) when it is not.
 */

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  voiceName?: string;
  onend?: () => void;
}

/** Speak text in an examiner-like English (Canadian) voice. Cancels any prior utterance. */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!isSpeechSupported() || !text) {
    opts.onend?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = opts.rate ?? 1;
    u.pitch = opts.pitch ?? 1;
    u.lang = 'en-CA';
    if (opts.voiceName) {
      const v = window.speechSynthesis.getVoices().find((x) => x.name === opts.voiceName);
      if (v) u.voice = v;
    }
    if (opts.onend) u.onend = () => opts.onend?.();
    window.speechSynthesis.speak(u);
  } catch {
    opts.onend?.();
  }
}

export function cancelSpeech(): void {
  if (isSpeechSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
}
