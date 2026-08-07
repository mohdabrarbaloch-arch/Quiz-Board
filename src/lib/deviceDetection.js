import { MOBILE_BREAKPOINT, TABLET_BREAKPOINT } from "./constants.js";

const MOBILE_UA_PATTERN = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;

function hasTouch() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function isSmallScreen() {
  return window.innerWidth < MOBILE_BREAKPOINT && window.innerHeight < TABLET_BREAKPOINT;
}

function hasMobileUserAgent() {
  return MOBILE_UA_PATTERN.test(navigator.userAgent);
}

function hasOrientationAPI() {
  return typeof window.orientation !== 'undefined';
}

export function isMobileDevice() {
  const mobileUA = hasMobileUserAgent();
  const smallScreen = isSmallScreen();
  const touch = hasTouch();
  const orientation = hasOrientationAPI();

  if (mobileUA && !smallScreen) {
    return false;
  }

  return mobileUA && smallScreen && (touch || orientation);
}

export function getDeviceInfo() {
  return {
    isMobile: isMobileDevice(),
    userAgent: navigator.userAgent,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    hasTouch: hasTouch(),
    platform: navigator.platform,
  };
}

export function isDesktopMode() {
  const isLargeScreen = window.innerWidth >= MOBILE_BREAKPOINT;
  const hasMobileUA = hasMobileUserAgent();

  return hasMobileUA && isLargeScreen;
}