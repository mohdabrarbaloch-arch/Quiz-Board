import { useCallback, useEffect, useRef } from "react";

/**
 * Custom hook for detecting and recording quiz violations
 * Production-grade with comprehensive anti-cheating detection
 * @param {Function} onViolation - Callback when violation is detected
 * @param {boolean} isActive - Whether detection should be active
 * @returns {Object} Violation detection controls
 */
export function useViolationDetection(onViolation, isActive = false) {
  const onViolationRef = useRef(onViolation);
  const lastViolationRef = useRef(0);
  const violationDebounceMs = 1000; // Prevent duplicate violations

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const recordViolation = useCallback((type, details = {}) => {
    // Debounce to prevent duplicate violations
    const now = Date.now();
    if (now - lastViolationRef.current < violationDebounceMs) {
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

    // Tab/Window visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation("tab_switch", {
          message: "You switched tabs or minimized the window.",
        });
      }
    };

    // Window blur (lost focus)
    const handleBlur = () => {
      // Only trigger if document is visible (not switching tabs)
      if (!document.hidden) {
        recordViolation("window_blur", {
          message: "The quiz window lost focus.",
        });
      }
    };

    // Right-click prevention
    const handleContextMenu = (e) => {
      e.preventDefault();
      recordViolation("right_click", {
        message: "Right-click is not allowed during the quiz.",
      });
    };

    // Keyboard shortcuts and key presses
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      
      // Block ESC key explicitly
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        recordViolation("escape_key", {
          message: "ESC key is not allowed. Stay in fullscreen mode.",
        });
        return;
      }

      // Block F11 (fullscreen toggle)
      if (e.key === "F11") {
        e.preventDefault();
        e.stopPropagation();
        recordViolation("f11_key", {
          message: "F11 key is not allowed.",
        });
        return;
      }
      
      // Block F12 and developer shortcuts
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

      // Block copy, cut, paste
      if (e.ctrlKey && ["c", "x", "v"].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        recordViolation("clipboard_attempt", {
          message: "Copy/paste is not allowed.",
        });
        return;
      }

      // Block Ctrl+U (view source)
      if (e.ctrlKey && key === "u") {
        e.preventDefault();
        e.stopPropagation();
        recordViolation("view_source_attempt", {
          message: "View source is not allowed.",
        });
        return;
      }

      // Block Ctrl+S (save page)
      if (e.ctrlKey && key === "s") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Block F5 and Ctrl+R (page refresh)
      if (e.key === "F5" || (e.ctrlKey && key === "r")) {
        e.preventDefault();
        e.stopPropagation();
        recordViolation("page_refresh_attempt", {
          message: "Page refresh is not allowed during quiz.",
        });
        return;
      }

      // Block Ctrl+W (close tab)
      if (e.ctrlKey && key === "w") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Block Alt+F4 (close window)
      if (e.altKey && e.key === "F4") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Block Print Screen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        recordViolation("screenshot_attempt", {
          message: "Screenshots are not allowed.",
        });
        return;
      }
    };

    // Prevent keyup for blocked keys
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

    // Clipboard events
    const handleCopy = (e) => {
      const target = e.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return; // Allow in input fields
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
        return; // Allow in input fields
      }
      e.preventDefault();
      recordViolation("paste_attempt", {
        message: "Pasting content is not allowed.",
      });
    };

    // Text selection (prevent except in input fields)
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

    // Prevent beforeunload
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Quiz in progress. Are you sure you want to leave?";
      recordViolation("page_leave_attempt", {
        message: "Attempted to leave the quiz page.",
      });
      return e.returnValue;
    };

    // Attach all listeners with capture phase for ESC key
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown, true); // Capture phase
    document.addEventListener("keyup", handleKeyUp, true); // Capture phase
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("selectstart", handleSelectStart);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
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
