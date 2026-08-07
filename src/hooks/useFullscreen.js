import { useCallback, useEffect, useRef, useState } from "react";

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
          navigationUI: "hide"
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
      
      if (!inFullscreen && wasFullscreenRef.current) {
        wasFullscreenRef.current = false;
        if (onExitRef.current) {
          onExitRef.current();
        }
      } else if (inFullscreen) {
        wasFullscreenRef.current = true;
      }
    };

    const events = ["fullscreenchange", "webkitfullscreenchange", "mozfullscreenchange", "MSFullscreenChange"];
    events.forEach(event => document.addEventListener(event, handleFullscreenChange));

    return () => {
      events.forEach(event => document.removeEventListener(event, handleFullscreenChange));
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen && wasFullscreenRef.current) {
      const timer = setTimeout(() => {
        if (!document.fullscreenElement) {
          enter();
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
