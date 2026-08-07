import { child, get, push, ref, runTransaction, serverTimestamp, set, update } from "firebase/database";
import { db } from "../lib/firebase.js";
import { FIREBASE_REFS, SUBMISSION_STATUS } from "../lib/constants.js";

const serverTimestamp$ = () => serverTimestamp();

export async function fetchSubmissions(quizId) {
  if (!quizId) throw new Error("Quiz ID is required");
  
  const snapshot = await get(child(ref(db), `${FIREBASE_REFS.SUBMISSIONS}/${quizId}`));
  if (!snapshot.exists()) return [];
  
  const items = [];
  snapshot.forEach((child) => {
    items.push({ id: child.key, ...child.val() });
  });
  
  return items.sort(
    (a, b) => (b.submittedAt || b.startedAt || 0) - (a.submittedAt || a.startedAt || 0)
  );
}

export async function fetchAttempt(quizId, rollNumberKey) {
  if (!quizId || !rollNumberKey) {
    throw new Error("Quiz ID and roll number key are required");
  }
  
  const snapshot = await get(
    child(ref(db), `${FIREBASE_REFS.ATTEMPTS}/${quizId}/${rollNumberKey}`)
  );
  
  return snapshot.exists() ? { id: rollNumberKey, ...snapshot.val() } : null;
}

export async function createAttempt(quizId, rollNumberKey, data) {
  if (!quizId || !rollNumberKey) {
    throw new Error("Quiz ID and roll number key are required");
  }
  if (!data.studentName || !data.rollNo) {
    throw new Error("Student name and roll number are required");
  }
  
  const attemptRef = ref(db, `${FIREBASE_REFS.ATTEMPTS}/${quizId}/${rollNumberKey}`);
  
  const result = await runTransaction(attemptRef, (current) => {
    if (current !== null) {
      return undefined;
    }
    
    return {
      studentName: data.studentName,
      rollNo: data.rollNo,
      rollNoKey: rollNumberKey,
      status: SUBMISSION_STATUS.STARTED,
      startedAt: serverTimestamp$(),
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
  if (!quizId || !rollNumberKey) {
    throw new Error("Quiz ID and roll number key are required");
  }
  
  const submissionKey = push(ref(db, `${FIREBASE_REFS.SUBMISSIONS}/${quizId}`)).key;
  const updates = {};

  updates[`${FIREBASE_REFS.ATTEMPTS}/${quizId}/${rollNumberKey}/status`] = SUBMISSION_STATUS.COMPLETED;
  updates[`${FIREBASE_REFS.ATTEMPTS}/${quizId}/${rollNumberKey}/submittedAt`] = serverTimestamp$();

  updates[`${FIREBASE_REFS.SUBMISSIONS}/${quizId}/${submissionKey}`] = {
    quizId,
    rollNoKey: rollNumberKey,
    studentName: data.studentName,
    rollNo: data.rollNo,
    status: data.status || SUBMISSION_STATUS.COMPLETED,
    answers: data.answers || [],
    answeredCount: data.answeredCount || 0,
    unansweredCount: data.unansweredCount || 0,
    violationCount: data.violationCount || 0,
    autoSubmitted: Boolean(data.autoSubmitted),
    submitReason: data.submitReason || "student",
    terminationReason: data.terminationReason || null,
    startedAt: data.startedAt || serverTimestamp$(),
    submittedAt: serverTimestamp$(),
    clientSubmittedAt: Date.now(),
    totalTimeSeconds: data.totalTimeSeconds || 0,
  };

  await update(ref(db), updates);
  return submissionKey;
}

export async function recordViolation(quizId, submissionId, violationData) {
  if (!quizId || !submissionId) {
    throw new Error("Quiz ID and submission ID are required");
  }
  if (!violationData.type) {
    throw new Error("Violation type is required");
  }
  
  const violationKey = push(ref(db, `${FIREBASE_REFS.VIOLATIONS}/${quizId}/${submissionId}`)).key;
  
  await set(ref(db, `${FIREBASE_REFS.VIOLATIONS}/${quizId}/${submissionId}/${violationKey}`), {
    type: violationData.type,
    message: violationData.message || "",
    questionIndex: violationData.questionIndex,
    questionId: violationData.questionId || null,
    currentQuestionTime: violationData.currentQuestionTime || 0,
    violationCount: violationData.violationCount,
    timestamp: serverTimestamp$(),
    clientTimestamp: Date.now(),
  });

  return violationKey;
}

export async function fetchViolations(quizId, submissionId) {
  if (!quizId || !submissionId) {
    throw new Error("Quiz ID and submission ID are required");
  }
  
  const snapshot = await get(child(ref(db), `${FIREBASE_REFS.VIOLATIONS}/${quizId}/${submissionId}`));
  if (!snapshot.exists()) return [];
  
  const items = [];
  snapshot.forEach((child) => {
    items.push({ id: child.key, ...child.val() });
  });
  
  return items.sort((a, b) => (a.clientTimestamp || 0) - (b.clientTimestamp || 0));
}

export async function deleteAttempt(quizId, rollNumberKey) {
  if (!quizId || !rollNumberKey) {
    throw new Error("Quiz ID and roll number key are required");
  }
  
  await update(ref(db), {
    [`${FIREBASE_REFS.ATTEMPTS}/${quizId}/${rollNumberKey}`]: null,
  });
}

export async function resetSubmission(quizId, submissionId, rollNumberKey) {
  if (!quizId || !submissionId || !rollNumberKey) {
    throw new Error("Quiz ID, submission ID, and roll number key are required");
  }
  
  const updates = {
    [`${FIREBASE_REFS.ATTEMPTS}/${quizId}/${rollNumberKey}`]: null,
    [`${FIREBASE_REFS.SUBMISSIONS}/${quizId}/${submissionId}`]: null,
    [`${FIREBASE_REFS.VIOLATIONS}/${quizId}/${submissionId}`]: null,
  };
  
  await update(ref(db), updates);
}

export async function fetchAdminByUid(uid) {
  if (!uid) throw new Error("UID is required");
  
  const snapshot = await get(child(ref(db), `${FIREBASE_REFS.ADMINS}/${uid}`));
  return snapshot.exists() ? { uid, ...snapshot.val() } : null;
}