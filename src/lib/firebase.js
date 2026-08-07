import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate critical configuration
const CRITICAL_KEYS = ["apiKey", "authDomain", "databaseURL", "projectId"];
const missingKeys = CRITICAL_KEYS.filter((key) => !firebaseConfig[key]);

if (missingKeys.length) {
  const errorMessage = `Firebase configuration incomplete. Missing: ${missingKeys.join(", ")}`;
  console.error(
    `❌ ${errorMessage}\n` +
    `Please check your .env file and ensure all variables start with VITE_`
  );
  throw new Error(errorMessage);
}

if (!firebaseConfig.databaseURL?.includes("firebaseio.com")) {
  const errorMessage = "Invalid Firebase Database URL";
  console.error(
    `❌ ${errorMessage}. It should look like: https://your-project-default-rtdb.firebaseio.com`
  );
  throw new Error(errorMessage);
}

if (import.meta.env.DEV) {
  console.log("✅ Firebase configuration loaded successfully");
  console.log(`📦 Project: ${firebaseConfig.projectId}`);
  console.log(`🔗 Database: ${firebaseConfig.databaseURL}`);
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

let analytics = null;

isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
    if (import.meta.env.DEV) {
      console.log("✅ Firebase Analytics enabled");
    }
  }
}).catch(() => {
  if (import.meta.env.DEV) {
    console.log("ℹ️ Firebase Analytics not available");
  }
});

export const logAnalyticsEvent = (eventName, eventParams = {}) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
  }
};

export { analytics };
