/**
 * Examiner instruction bar. Speaks the current instruction whenever it changes
 * (via the speech hook) and shows the text with a Replay button. When speech
 * synthesis is unavailable the Replay button is hidden and a small note appears.
 */
import { useEffect, useRef } from 'react';
import { useSpeech } from '../hooks/useSpeech';
import './examiner-bar.css';

interface ExaminerBarProps {
  /** The spoken instruction text for the current step. */
  instruction: string;
  /** Re-speak whenever this key changes (typically the step id). */
  speakKey: string;
  /** Speak automatically on mount / key change (default true). */
  autoSpeak?: boolean;
}

export default function ExaminerBar({ instruction, speakKey, autoSpeak = true }: ExaminerBarProps) {
  const { supported, say } = useSpeech();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!autoSpeak) return;
    if (lastKey.current === speakKey) return;
    lastKey.current = speakKey;
    if (instruction) say(instruction, { rate: 0.98 });
  }, [autoSpeak, instruction, speakKey, say]);

  return (
    <div className="examiner panel">
      <div className="examiner-head">
        <span className="examiner-avatar" aria-hidden="true">
          🎧
        </span>
        <span className="tag">Examiner</span>
        {supported ? (
          <button
            type="button"
            className="btn btn-ghost examiner-replay"
            onClick={() => say(instruction, { rate: 0.98 })}
            aria-label="Replay instruction"
          >
            <span aria-hidden="true">▶</span> Replay
          </button>
        ) : (
          <small className="examiner-replay">Voice unavailable — read below</small>
        )}
      </div>
      <p className="examiner-text" aria-live="polite" aria-atomic="true">
        {instruction}
      </p>
    </div>
  );
}
