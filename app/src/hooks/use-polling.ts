import { useCallback, useEffect, useRef, useState } from 'react';

export function usePolling(callback: () => Promise<void>, intervalMs = 3000) {
  const [isPolling, setIsPolling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callbackRef = useRef(callback);
  // Keep the latest callback without re-creating the interval. Updating the ref in
  // an effect (not during render) keeps render pure per react-hooks/refs.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const stop = useCallback(() => {
    setIsPolling(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (timerRef.current) return;
    setIsPolling(true);
    timerRef.current = setInterval(async () => {
      try {
        await callbackRef.current();
      } catch {
        stop();
      }
    }, intervalMs);
  }, [intervalMs, stop]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return { isPolling, start, stop };
}
