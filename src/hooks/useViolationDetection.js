import { useCallback, useEffect, useRef, useState } from "react";

const VIOLATION_DEBOUNCE_MS = 1000;

export function useViolationDetection(onViolation, isActive = false) {
  const onViolationRef = useRef(onViolation);
  const lastViolationRef = useRef(0);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const recordViolation = useCallback((type, details = {}) => {
    const now = Date.now();
    if (now - lastViolationRef.current < VIOLATION_DEBOUNCE_MS) {
      return;
    }
    lastViolationRef.current = now;

    if (onViolationRef.current) {
      onViolationRef.current(type, details.message || "Suspicious activity detected");
    }
  }, []);

  useEffect(() => {
    if (!isActive) {
      return undefined;
    }

    let focusLostPending = false;

    const handleFocusLost = () => {
      if (document.hidden) {
        if (!focusLostPending) {
          focusLostPending = true;
          recordViolation("tab_switch", {
            message: "You switched tabs or minimized the window.",
          });
          setTimeout(() => {
            focusLostPending = false;
          }, VIOLATION_DEBOUNCE_MS + 200);
        }
      } else {
        if (!focusLostPending) {
          focusLostPending = true;
          recordViolation("window_blur", {
            message: "The quiz window lost focus.",
          });
          setTimeout(() => {
            focusLostPending = false;
          }, VIOLATION_DEBOUNCE_MS + 200);
        }
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      recordViolation("right_click", {
        message: "Right-click is not allowed during the quiz.",
      });
    };

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        recordViolation("escape_key", {
          message: "ESC key is not allowed. Stay in fullscreen mode.",
        });
        return;
      }

      if (e.key === "F11") {
        e.preventDefault();
        e.stopPropagation();
        recordViolation("f11_key", {
          message: "F11 key is not allowed.",
        });
        return;
      }
      
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c", "k"].includes(key)) ||
        (e.metaKey && e.altKey && ["i", "j", "c"].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        recordViolation("dev_tools_attempt", {
          message: "Developer tools are blocked.",
        });
        return;
      }

      if (e.ctrlKey && ["c", "x", "v"].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        recordViolation("clipboard_attempt", {
          message: "Copy/paste is not allowed.",
        });
        return;
      }

      if (e.ctrlKey && key === "u") {
        e.preventDefault();
        e.stopPropagation();
        recordViolation("view_source_attempt", {
          message: "View source is not allowed.",
        });
        return;
      }

      if (e.ctrlKey && key === "s") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.key === "F5" || (e.ctrlKey && key === "r")) {
        e.preventDefault();
        e.stopPropagation();
        recordViolation("page_refresh_attempt", {
          message: "Page refresh is not allowed during quiz.",
        });
        return;
      }

      if (e.ctrlKey && key === "t") {
        e.preventDefault();
        e.stopPropagation();
        recordViolation("new_tab_attempt", {
          message: "Opening new tabs is not allowed during the quiz.",
        });
        return;
      }

      if (e.ctrlKey && key === "w") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.altKey && e.key === "F4") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.key === "PrintScreen") {
        e.preventDefault();
        recordViolation("screenshot_attempt", {
          message: "Screenshots are not allowed.",
        });
        return;
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      const blockedKeys = ["Escape", "F11", "F12", "F5", "PrintScreen"];
      const blockedCombos = 
        (e.ctrlKey && ["c", "x", "v", "u", "s", "r", "w"].includes(key)) ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c", "k"].includes(key));

      if (blockedKeys.includes(e.key) || blockedCombos) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleCopy = (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }
      e.preventDefault();
      recordViolation("copy_attempt", {
        message: "Copying content is not allowed.",
      });
    };

    const handleCut = (e) => {
      e.preventDefault();
      recordViolation("cut_attempt", {
        message: "Cut action is not allowed.",
      });
    };

    const handlePaste = (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }
      e.preventDefault();
      recordViolation("paste_attempt", {
        message: "Pasting content is not allowed.",
      });
    };

    const handleSelectStart = (e) => {
      const target = e.target;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
      e.preventDefault();
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Quiz in progress. Are you sure you want to leave?";
      recordViolation("page_leave_attempt", {
        message: "Attempted to leave the quiz page.",
      });
      return e.returnValue;
    };

    document.addEventListener("visibilitychange", handleFocusLost);
    window.addEventListener("blur", handleFocusLost);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keyup", handleKeyUp, true);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("selectstart", handleSelectStart);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleFocusLost);
      window.removeEventListener("blur", handleFocusLost);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keyup", handleKeyUp, true);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("selectstart", handleSelectStart);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isActive, recordViolation]);

  return {
    recordViolation,
  };
}
