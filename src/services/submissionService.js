import { child, get, push, ref, runTransaction, serverTimestamp, set, update } from "firebase/database";
import { db } from "../lib/firebase.js";

const ATTEMPTS_REF = "attempts";
const SUBMISSIONS_REF = "submissions";
const VIOLATIONS_REF = "violations";

function ts() {
  return serverTimestamp();
}

export async function fetchSubmissions(quizId) {
  const snapshot = await get(child(ref(db), `${SUBMISSIONS_REF}/${quizId}`));
  if (!snapshot.exists()) return [];
  const items = [];
  snapshot.forEach((child) => {
    items.push({ id: child.key, ...child.val() });
  });
  items.sort(
    (a, b) => (b.submittedAt || b.startedAt || 0) - (a.submittedAt || a.startedAt || 0)
  );
  return items;
}

export async function fetchAttempt(quizId, rollNumberKey) {
  const snapshot = await get(
    child(ref(db), `${ATTEMPTS_REF}/${quizId}/${rollNumberKey}`)
  );
  return snapshot.exists()
    ? { id: rollNumberKey, ...snapshot.val() }
    : null;
}

export async function createAttempt(quizId, rollNumberKey, data) {
  const attemptRef = ref(db, `${ATTEMPTS_REF}/${quizId}/${rollNumberKey}`);
  
  // Use transaction to ensure only one attempt per roll number
  const result = await runTransaction(attemptRef, (current) => {
    if (current !== null) {
      // Attempt already exists
      return undefined;
    }
    return {
      studentName: data.studentName,
      rollNo: data.rollNo,
      rollNoKey: rollNumberKey,
      status: "started",
      startedAt: ts(),
      clientStartedAt: data.clientStartedAt,
      questionCount: data.questionCount,
      violationCount: 0,
    };
  });

  if (!result.committed) {
    throw new Error("ATTEMPT_EXISTS");
  }

  return result.snapshot.key;
}

export async function submitAttempt(quizId, rollNumberKey, data) {
  const submissionKey = push(ref(db, `${SUBMISSIONS_REF}/${quizId}`)).key;
  const updates = {};

  updates[`${ATTEMPTS_REF}/${quizId}/${rollNumberKey}/status`] = "submitted";
  updates[`${ATTEMPTS_REF}/${quizId}/${rollNumberKey}/submittedAt`] = ts();

  updates[`${SUBMISSIONS_REF}/${quizId}/${submissionKey}`] = {
    quizId,
    rollNoKey: rollNumberKey,
    studentName: data.studentName,
    rollNo: data.rollNo,
    status: data.status || "completed",
    answers: data.answers || [],
    answeredCount: data.answeredCount || 0,
    unansweredCount: data.unansweredCount || 0,
    violationCount: data.violationCount || 0,
    autoSubmitted: Boolean(data.autoSubmitted),
    submitReason: data.submitReason || "student",
    terminationReason: data.terminationReason || null,
    startedAt: data.startedAt || ts(),
    submittedAt: ts(),
    clientSubmittedAt: Date.now(),
    totalTimeSeconds: data.totalTimeSeconds || 0,
  };

  await update(ref(db), updates);
  return submissionKey;
}

export async function recordViolation(quizId, submissionId, violationData) {
  const violationKey = push(ref(db, `${VIOLATIONS_REF}/${quizId}/${submissionId}`)).key;
  
  await set(ref(db, `${VIOLATIONS_REF}/${quizId}/${submissionId}/${violationKey}`), {
    type: violationData.type,
    message: violationData.message || "",
    questionIndex: violationData.questionIndex,
    questionId: violationData.questionId || null,
    currentQuestionTime: violationData.currentQuestionTime || 0,
    violationCount: violationData.violationCount,
    timestamp: ts(),
    clientTimestamp: Date.now(),
  });

  return violationKey;
}

export async function fetchViolations(quizId, submissionId) {
  const snapshot = await get(child(ref(db), `${VIOLATIONS_REF}/${quizId}/${submissionId}`));
  if (!snapshot.exists()) return [];
  const items = [];
  snapshot.forEach((child) => {
    items.push({ id: child.key, ...child.val() });
  });
  items.sort((a, b) => (a.clientTimestamp || 0) - (b.clientTimestamp || 0));
  return items;
}

export async function deleteAttempt(quizId, rollNumberKey) {
  const updates = {};
  updates[`${ATTEMPTS_REF}/${quizId}/${rollNumberKey}`] = null;
  await update(ref(db), updates);
}

export async function resetSubmission(quizId, submissionId, rollNumberKey) {
  const updates = {};
  updates[`${ATTEMPTS_REF}/${quizId}/${rollNumberKey}`] = null;
  updates[`${SUBMISSIONS_REF}/${quizId}/${submissionId}`] = null;
  updates[`${VIOLATIONS_REF}/${quizId}/${submissionId}`] = null;
  await update(ref(db), updates);
}

export async function fetchAdminByUid(uid) {
  const snapshot = await get(child(ref(db), `admins/${uid}`));
  return snapshot.exists() ? { uid, ...snapshot.val() } : null;
}
