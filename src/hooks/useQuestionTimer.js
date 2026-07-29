import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Custom hook for managing individual question timer
 * @param {number} duration - Duration per question in seconds
 * @param {Function} onTimeout - Callback when question times out
 * @param {boolean} isActive - Whether timer should be running
 * @returns {Object} Timer state and controls
 */
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

  // Cleanup on unmount
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
    getTimeSpent: () => {
      if (!startTimeRef.current) return 0;
      return Math.floor((Date.now() - startTimeRef.current) / 1000);
    },
  };
}
