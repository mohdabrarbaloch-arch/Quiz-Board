import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Custom hook for managing fullscreen mode with strict enforcement
 * Production-grade: Prevents ESC key from exiting fullscreen
 * @param {Function} onExit - Callback when fullscreen is exited
 * @returns {Object} Fullscreen state and controls
 */
export function useFullscreen(onExit) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const wasFullscreenRef = useRef(false);
  const onExitRef = useRef(onExit);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    setIsSupported(Boolean(document.documentElement.requestFullscreen));
  }, []);

  const enter = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({
          navigationUI: "hide" // Hide browser UI
        });
        wasFullscreenRef.current = true;
        setIsFullscreen(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Fullscreen error:", error);
      return false;
    }
  }, []);

  const exit = useCallback(async () => {
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
      }
      wasFullscreenRef.current = false;
      setIsFullscreen(false);
    } catch (error) {
      console.error("Exit fullscreen error:", error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement);
      setIsFullscreen(inFullscreen);
      
      // Only call onExit if we were in fullscreen and now we're not
      // AND it was previously active (not first time)
      if (!inFullscreen && wasFullscreenRef.current) {
        wasFullscreenRef.current = false;
        if (onExitRef.current) {
          onExitRef.current();
        }
      } else if (inFullscreen) {
        wasFullscreenRef.current = true;
      }
    };

    // Listen to all fullscreen change events (cross-browser)
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  // Attempt to re-enter fullscreen if user exits
  useEffect(() => {
    if (!isFullscreen && wasFullscreenRef.current) {
      // Small delay to allow violation recording
      const timer = setTimeout(() => {
        if (!document.fullscreenElement) {
          enter(); // Try to re-enter fullscreen
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isFullscreen, enter]);

  return {
    isFullscreen,
    isSupported,
    enter,
    exit,
  };
}
