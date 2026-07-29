import { child, get, push, ref, serverTimestamp, update } from "firebase/database";
import { db } from "../lib/firebase.js";

const QUIZZES_REF = "quizzes";
const QUESTIONS_REF = "quizQuestions";
const ANSWER_KEYS_REF = "answerKeys";

function ts() {
  return serverTimestamp();
}

export async function fetchQuizzes(onlyPublished = false) {
  const snapshot = await get(ref(db, QUIZZES_REF));
  if (!snapshot.exists()) return [];
  const items = [];
  snapshot.forEach((child) => {
    const data = { id: child.key, ...child.val() };
    if (onlyPublished && !data.isPublished) return;
    items.push(data);
  });
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return items;
}

export async function fetchQuizById(quizId) {
  const snapshot = await get(child(ref(db), `${QUIZZES_REF}/${quizId}`));
  return snapshot.exists() ? { id: quizId, ...snapshot.val() } : null;
}

export async function fetchQuizQuestions(quizId) {
  const snapshot = await get(child(ref(db), `${QUESTIONS_REF}/${quizId}`));
  if (!snapshot.exists()) return [];
  const items = [];
  snapshot.forEach((child) => {
    items.push({ id: child.key, ...child.val() });
  });
  items.sort((a, b) => (a.order || 0) - (b.order || 0));
  return items;
}

export async function fetchAnswerKeys(quizId) {
  const snapshot = await get(child(ref(db), `${ANSWER_KEYS_REF}/${quizId}`));
  if (!snapshot.exists()) return [];
  const items = [];
  snapshot.forEach((child) => {
    items.push({ id: child.key, ...child.val() });
  });
  return items;
}

export async function createQuiz(quizData, questions) {
  const quizRef = push(ref(db, QUIZZES_REF));
  const quizId = quizRef.key;

  const updates = {};
  updates[`${QUIZZES_REF}/${quizId}`] = {
    title: quizData.title.trim(),
    description: (quizData.description || "").trim(),
    durationMinutes: Number(quizData.durationMinutes),
    questionTimeSeconds: Number(quizData.questionTimeSeconds || 45),
    maxViolations: Number(quizData.maxViolations || 3),
    randomizeQuestions: Boolean(quizData.randomizeQuestions),
    randomizeOptions: Boolean(quizData.randomizeOptions),
    showScoreToStudent: Boolean(quizData.showScoreToStudent),
    isPublished: Boolean(quizData.isPublished),
    questionCount: questions.length,
    createdAt: ts(),
    updatedAt: ts(),
  };

  questions.forEach((question, index) => {
    const questionKey = push(ref(db, `${QUESTIONS_REF}/${quizId}`)).key;
    updates[`${QUESTIONS_REF}/${quizId}/${questionKey}`] = {
      type: question.type || "mcq",
      prompt: question.prompt.trim(),
      options:
        question.type === "short_text"
          ? []
          : question.options.map((o) => String(o).trim()),
      points: Number(question.points || 1),
      timeSeconds: Number(question.timeSeconds || quizData.questionTimeSeconds || 45),
      order: index,
    };
    if (question.type !== "short_text" && question.correctAnswer) {
      updates[`${ANSWER_KEYS_REF}/${quizId}/${questionKey}`] = {
        correctAnswer: String(question.correctAnswer).trim(),
      };
    }
  });

  await update(ref(db), updates);
  return quizId;
}

export async function updateQuiz(quizId, updates) {
  const safeUpdates = {};
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) safeUpdates[key] = value;
  });
  safeUpdates.updatedAt = ts();
  await update(child(ref(db), `${QUIZZES_REF}/${quizId}`), safeUpdates);
}

export async function deleteQuiz(quizId) {
  const updates = {};
  updates[`${QUIZZES_REF}/${quizId}`] = null;
  updates[`${QUESTIONS_REF}/${quizId}`] = null;
  updates[`${ANSWER_KEYS_REF}/${quizId}`] = null;
  await update(ref(db), updates);
}

export async function toggleQuizPublished(quizId, isPublished) {
  await updateQuiz(quizId, { isPublished, updatedAt: ts() });
}
