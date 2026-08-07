export function getStorageItem(key, defaultValue = null) {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorageItem(key) {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function capitalizeWords(text) {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function truncate(text, maxLength = 100, suffix = "...") {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

export function getPercentage(value, total, decimals = 0) {
  if (total === 0) return 0;
  const percentage = (value / total) * 100;
  return Number(percentage.toFixed(decimals));
}

export function createStorageKey(...parts) {
  return parts.filter(Boolean).join(":");
}

export function safeParseInt(value, defaultValue = 0) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function safeParseFloat(value, defaultValue = 0) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}
