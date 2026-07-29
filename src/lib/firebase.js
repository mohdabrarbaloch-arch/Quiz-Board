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
const criticalKeys = ["apiKey", "authDomain", "databaseURL", "projectId"];
const missingKeys = criticalKeys.filter((key) => !firebaseConfig[key]);

if (missingKeys.length) {
  console.error(
    `❌ Missing Firebase configuration: ${missingKeys.join(", ")}\n` +
    `Please check your .env file and ensure all variables start with VITE_`
  );
  throw new Error(`Firebase configuration incomplete. Missing: ${missingKeys.join(", ")}`);
}

if (!firebaseConfig.databaseURL?.includes("firebaseio.com")) {
  console.error(
    "❌ Invalid DATABASE_URL. It should look like:\n" +
    "https://your-project-default-rtdb.firebaseio.com"
  );
  throw new Error("Invalid Firebase Database URL");
}

console.log("✅ Firebase configuration loaded successfully");
console.log(`📦 Project: ${firebaseConfig.projectId}`);
console.log(`🔗 Database: ${firebaseConfig.databaseURL}`);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Initialize Analytics (only if supported)
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
    console.log("✅ Firebase Analytics enabled");
  } else {
    console.log("ℹ️ Firebase Analytics not supported in this environment");
  }
}).catch(() => {
  console.log("ℹ️ Firebase Analytics not available");
});

// Helper function to log analytics events
export const logAnalyticsEvent = (eventName, eventParams = {}) => {
  if (analytics) {
    logEvent(analytics, eventName, eventParams);
  }
};

export { analytics };
