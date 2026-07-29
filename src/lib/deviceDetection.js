/**
 * Device detection utility
 * Detects real mobile devices while allowing desktop mode browsers
 */

export function isMobileDevice() {
  // Check for touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check screen size (real mobile devices typically have smaller screens)
  const isSmallScreen = window.innerWidth < 768 && window.innerHeight < 1024;
  
  // Check user agent for mobile keywords
  const mobileKeywords = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const hasMobileUA = mobileKeywords.test(navigator.userAgent);
  
  // Check for mobile-specific properties
  const hasOrientationAPI = typeof window.orientation !== 'undefined';
  
  // Device is considered mobile if:
  // 1. It has mobile user agent AND
  // 2. Has small screen AND
  // 3. Has touch support OR orientation API
  const isMobile = hasMobileUA && isSmallScreen && (hasTouch || hasOrientationAPI);
  
  // Additional check: if user agent says mobile but screen is large, it's likely desktop mode
  if (hasMobileUA && !isSmallScreen) {
    return false; // Desktop mode on mobile browser
  }
  
  return isMobile;
}

export function getDeviceInfo() {
  return {
    isMobile: isMobileDevice(),
    userAgent: navigator.userAgent,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    platform: navigator.platform,
  };
}

export function isDesktopMode() {
  // Chrome desktop mode typically has:
  // 1. Large screen size (min 768px width)
  // 2. May have mobile user agent
  const isLargeScreen = window.innerWidth >= 768;
  const hasMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // If it has mobile UA but large screen, it's desktop mode
  return hasMobileUA && isLargeScreen;
}
