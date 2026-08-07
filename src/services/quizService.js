import { child, get, push, ref, serverTimestamp, update } from "firebase/database";
import { db } from "../lib/firebase.js";
import { FIREBASE_REFS, QUESTION_TYPES, QUIZ_SETTINGS } from "../lib/constants.js";

const serverTimestamp$ = () => serverTimestamp();

export async function fetchQuizzes(onlyPublished = false) {
  const snapshot = await get(ref(db, FIREBASE_REFS.QUIZZES));
  if (!snapshot.exists()) return [];
  
  const items = [];
  snapshot.forEach((child) => {
    const data = { id: child.key, ...child.val() };
    if (!onlyPublished || data.isPublished) {
      items.push(data);
    }
  });
  
  return items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export async function fetchQuizById(quizId) {
  if (!quizId) throw new Error("Quiz ID is required");
  
  const snapshot = await get(child(ref(db), `${FIREBASE_REFS.QUIZZES}/${quizId}`));
  return snapshot.exists() ? { id: quizId, ...snapshot.val() } : null;
}

export async function fetchQuizQuestions(quizId) {
  if (!quizId) throw new Error("Quiz ID is required");
  
  const snapshot = await get(child(ref(db), `${FIREBASE_REFS.QUESTIONS}/${quizId}`));
  if (!snapshot.exists()) return [];
  
  const items = [];
  snapshot.forEach((child) => {
    items.push({ id: child.key, ...child.val() });
  });
  
  return items.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function fetchAnswerKeys(quizId) {
  if (!quizId) throw new Error("Quiz ID is required");
  
  const snapshot = await get(child(ref(db), `${FIREBASE_REFS.ANSWER_KEYS}/${quizId}`));
  if (!snapshot.exists()) return [];
  
  const items = [];
  snapshot.forEach((child) => {
    items.push({ id: child.key, ...child.val() });
  });
  
  return items;
}

export async function createQuiz(quizData, questions) {
  if (!quizData.title?.trim()) {
    throw new Error("Quiz title is required");
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("At least one question is required");
  }
  
  const quizRef = push(ref(db, FIREBASE_REFS.QUIZZES));
  const quizId = quizRef.key;
  const updates = {};

  updates[`${FIREBASE_REFS.QUIZZES}/${quizId}`] = {
    title: quizData.title.trim(),
    description: (quizData.description || "").trim(),
    durationMinutes: Number(quizData.durationMinutes) || QUIZ_SETTINGS.DEFAULT_DURATION_MINUTES,
    questionTimeSeconds: Number(quizData.questionTimeSeconds) || QUIZ_SETTINGS.DEFAULT_QUESTION_TIME_SECONDS,
    maxViolations: Number(quizData.maxViolations) || QUIZ_SETTINGS.DEFAULT_MAX_VIOLATIONS,
    randomizeQuestions: Boolean(quizData.randomizeQuestions),
    randomizeOptions: Boolean(quizData.randomizeOptions),
    showScoreToStudent: Boolean(quizData.showScoreToStudent),
    isPublished: Boolean(quizData.isPublished),
    questionCount: questions.length,
    createdAt: serverTimestamp$(),
    updatedAt: serverTimestamp$(),
  };

  questions.forEach((question, index) => {
    const questionKey = push(ref(db, `${FIREBASE_REFS.QUESTIONS}/${quizId}`)).key;
    const questionType = question.type || QUESTION_TYPES.MCQ;
    
    updates[`${FIREBASE_REFS.QUESTIONS}/${quizId}/${questionKey}`] = {
      type: questionType,
      prompt: question.prompt.trim(),
      code: question.code ? String(question.code).trim() : "",
      options: questionType === QUESTION_TYPES.SHORT_TEXT ? [] : question.options.map((o) => String(o).trim()),
      points: Number(question.points || 1),
      timeSeconds: Number(question.timeSeconds || quizData.questionTimeSeconds || QUIZ_SETTINGS.DEFAULT_QUESTION_TIME_SECONDS),
      order: index,
    };
    
    if (questionType !== QUESTION_TYPES.SHORT_TEXT && question.correctAnswer) {
      updates[`${FIREBASE_REFS.ANSWER_KEYS}/${quizId}/${questionKey}`] = {
        correctAnswer: String(question.correctAnswer).trim(),
      };
    }
  });

  await update(ref(db), updates);
  return quizId;
}

export async function updateQuiz(quizId, updates) {
  if (!quizId) throw new Error("Quiz ID is required");
  
  const safeUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  );
  
  safeUpdates.updatedAt = serverTimestamp$();
  await update(child(ref(db), `${FIREBASE_REFS.QUIZZES}/${quizId}`), safeUpdates);
}

export async function updateQuizQuestions(quizId, quizData, questions) {
  if (!quizId) throw new Error("Quiz ID is required");
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("At least one question is required");
  }
  
  const newQuestions = {};
  const newAnswerKeys = {};

  questions.forEach((question, index) => {
    const questionKey = question._key || push(ref(db, `${FIREBASE_REFS.QUESTIONS}/${quizId}`)).key;
    const questionType = question.type || QUESTION_TYPES.MCQ;
    
    newQuestions[questionKey] = {
      type: questionType,
      prompt: question.prompt.trim(),
      code: question.code ? String(question.code).trim() : "",
      options: questionType === QUESTION_TYPES.SHORT_TEXT ? [] : question.options.map((o) => String(o).trim()),
      points: Number(question.points || 1),
      timeSeconds: Number(question.timeSeconds || quizData.questionTimeSeconds || QUIZ_SETTINGS.DEFAULT_QUESTION_TIME_SECONDS),
      order: index,
    };
    
    if (questionType !== QUESTION_TYPES.SHORT_TEXT && question.correctAnswer) {
      newAnswerKeys[questionKey] = {
        correctAnswer: String(question.correctAnswer).trim(),
      };
    }
  });

  const updates = {
    [`${FIREBASE_REFS.QUESTIONS}/${quizId}`]: newQuestions,
    [`${FIREBASE_REFS.ANSWER_KEYS}/${quizId}`]: newAnswerKeys,
    [`${FIREBASE_REFS.QUIZZES}/${quizId}/title`]: quizData.title.trim(),
    [`${FIREBASE_REFS.QUIZZES}/${quizId}/description`]: (quizData.description || "").trim(),
    [`${FIREBASE_REFS.QUIZZES}/${quizId}/durationMinutes`]: Number(quizData.durationMinutes) || QUIZ_SETTINGS.DEFAULT_DURATION_MINUTES,
    [`${FIREBASE_REFS.QUIZZES}/${quizId}/questionTimeSeconds`]: Number(quizData.questionTimeSeconds) || QUIZ_SETTINGS.DEFAULT_QUESTION_TIME_SECONDS,
    [`${FIREBASE_REFS.QUIZZES}/${quizId}/maxViolations`]: Number(quizData.maxViolations) || QUIZ_SETTINGS.DEFAULT_MAX_VIOLATIONS,
    [`${FIREBASE_REFS.QUIZZES}/${quizId}/randomizeQuestions`]: Boolean(quizData.randomizeQuestions),
    [`${FIREBASE_REFS.QUIZZES}/${quizId}/randomizeOptions`]: Boolean(quizData.randomizeOptions),
    [`${FIREBASE_REFS.QUIZZES}/${quizId}/showScoreToStudent`]: Boolean(quizData.showScoreToStudent),
    [`${FIREBASE_REFS.QUIZZES}/${quizId}/isPublished`]: Boolean(quizData.isPublished),
    [`${FIREBASE_REFS.QUIZZES}/${quizId}/questionCount`]: questions.length,
    [`${FIREBASE_REFS.QUIZZES}/${quizId}/updatedAt`]: serverTimestamp$(),
  };

  await update(ref(db), updates);
  return quizId;
}

export async function deleteQuiz(quizId) {
  if (!quizId) throw new Error("Quiz ID is required");
  
  const updates = {
    [`${FIREBASE_REFS.QUIZZES}/${quizId}`]: null,
    [`${FIREBASE_REFS.QUESTIONS}/${quizId}`]: null,
    [`${FIREBASE_REFS.ANSWER_KEYS}/${quizId}`]: null,
  };
  
  await update(ref(db), updates);
}

export async function toggleQuizPublished(quizId, isPublished) {
  if (!quizId) throw new Error("Quiz ID is required");
  
  await updateQuiz(quizId, { isPublished, updatedAt: serverTimestamp$() });
}
