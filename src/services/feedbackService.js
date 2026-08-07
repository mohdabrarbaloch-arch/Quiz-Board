import { get, push, ref, serverTimestamp, set } from "firebase/database";
import { db } from "../lib/firebase.js";
import { FIREBASE_REFS } from "../lib/constants.js";

export async function submitFeedback(data) {
  if (!data.name?.trim()) {
    throw new Error("Name is required");
  }
  if (!data.category) {
    throw new Error("Category is required");
  }
  if (!data.rating || data.rating < 1 || data.rating > 5) {
    throw new Error("Valid rating (1-5) is required");
  }
  
  const feedbackRef = ref(db, FIREBASE_REFS.FEEDBACK);
  const newRef = push(feedbackRef);
  
  await set(newRef, {
    name: data.name.trim(),
    category: data.category,
    rating: data.rating,
    message: data.message?.trim() || "",
    submittedAt: serverTimestamp(),
    clientSubmittedAt: Date.now(),
  });
  
  return newRef.key;
}

export async function fetchAllFeedback() {
  const snapshot = await get(ref(db, FIREBASE_REFS.FEEDBACK));
  if (!snapshot.exists()) return [];
  
  const items = [];
  snapshot.forEach((child) => {
    items.push({ id: child.key, ...child.val() });
  });
  
  return items.sort((a, b) => (b.clientSubmittedAt || 0) - (a.clientSubmittedAt || 0));
}
