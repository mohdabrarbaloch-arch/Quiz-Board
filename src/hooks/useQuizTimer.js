import { useCallback, useEffect, useRef, useState } from "react";

export function useQuizTimer(totalSeconds, onTimeEnd, isActive = false) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const onTimeEndRef = useRef(onTimeEnd);

  useEffect(() => {
    onTimeEndRef.current = onTimeEnd;
  }, [onTimeEnd]);

  const start = useCallback((startTime = Date.now()) => {
    startTimeRef.current = startTime;
    setIsRunning(true);
  }, []);

  const pause = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback((newTotal = totalSeconds) => {
    setSecondsLeft(newTotal);
    startTimeRef.current = null;
    pause();
  }, [totalSeconds, pause]);

  useEffect(() => {
    if (!isActive || !isRunning || !startTimeRef.current) {
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsed);
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setIsRunning(false);
        if (onTimeEndRef.current) {
          onTimeEndRef.current();
        }
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isRunning, totalSeconds]);

  return {
    secondsLeft,
    isRunning,
    start,
    pause,
    reset,
  };
}
