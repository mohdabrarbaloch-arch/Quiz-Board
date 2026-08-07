import { useCallback, useEffect, useRef, useState } from "react";

export function useQuestionTimer(duration, onTimeout, isActive = false) {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    setSecondsLeft(duration);
    setIsRunning(true);
  }, [duration]);

  const stop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setSecondsLeft(duration);
    startTimeRef.current = Date.now();
  }, [duration]);

  const getTimeSpent = useCallback(() => {
    if (!startTimeRef.current) return 0;
    return Math.floor((Date.now() - startTimeRef.current) / 1000);
  }, []);

  useEffect(() => {
    if (!isActive || !isRunning || !startTimeRef.current) {
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsRunning(false);
        if (onTimeoutRef.current) {
          onTimeoutRef.current();
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isRunning, duration]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    secondsLeft,
    isRunning,
    start,
    stop,
    reset,
    getTimeSpent,
  };
}
