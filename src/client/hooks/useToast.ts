/**
 * Tiny transient-toast hook. Returns the current message (or null) plus a
 * `notify` function that shows a message for a short, auto-dismissing window.
 * Pair with the <Toast /> component for rendering.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseToast {
  message: string | null;
  notify: (text: string, durationMs?: number) => void;
  dismiss: () => void;
}

export function useToast(): UseToast {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current != null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setMessage(null);
  }, [clearTimer]);

  const notify = useCallback(
    (text: string, durationMs = 2600) => {
      clearTimer();
      setMessage(text);
      timer.current = setTimeout(() => {
        setMessage(null);
        timer.current = null;
      }, durationMs);
    },
    [clearTimer],
  );

  useEffect(() => clearTimer, [clearTimer]);

  return { message, notify, dismiss };
}
