import { QUESTION_TYPES, SCORE_THRESHOLDS, VIOLATION_TYPES } from "./constants.js";

export function normaliseRollNo(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
}

export function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

export function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return "—";

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function calculateObjectiveScore(submission, questions, answerKeys) {
  const questionMap = new Map(questions.map((q) => [q.id, q]));
  const keyMap = new Map(answerKeys.map((k) => [k.id, k.correctAnswer]));

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  let score = 0;
  let maximum = 0;
  let manualMaximum = 0;

  const answers = submission.answers || [];

  answers.forEach((answer, index) => {
    let question = questionMap.get(answer.questionId);

    if (!question && index < questions.length) {
      question = questions[index];
    }

    if (!question) return;

    const points = Number(question.points || 1);

    if (question.type === QUESTION_TYPES.SHORT_TEXT) {
      manualMaximum += points;
      return;
    }

    maximum += points;
    const correctAnswer = keyMap.get(question.id);
    const studentAnswer = answer.answer?.trim();

    if (!studentAnswer) {
      unanswered++;
    } else if (String(studentAnswer) === String(correctAnswer)) {
      correct++;
      score += points;
    } else {
      wrong++;
    }
  });

  return {
    score,
    maximum,
    manualMaximum,
    correct,
    wrong,
    unanswered,
  };
}

const VIOLATION_TYPE_LABELS = {
  [VIOLATION_TYPES.TAB_SWITCH]: "Tab Switch",
  [VIOLATION_TYPES.WINDOW_BLUR]: "Window Lost Focus",
  [VIOLATION_TYPES.FULLSCREEN_EXIT]: "Exited Fullscreen",
  [VIOLATION_TYPES.RIGHT_CLICK]: "Right Click",
  [VIOLATION_TYPES.DEV_TOOLS_ATTEMPT]: "Developer Tools",
  [VIOLATION_TYPES.CLIPBOARD_ATTEMPT]: "Copy/Paste",
  [VIOLATION_TYPES.KEYBOARD_PRESS]: "Keyboard Activity",
  [VIOLATION_TYPES.COPY_ATTEMPT]: "Copy Attempt",
  [VIOLATION_TYPES.CUT_ATTEMPT]: "Cut Attempt",
  [VIOLATION_TYPES.PASTE_ATTEMPT]: "Paste Attempt",
  [VIOLATION_TYPES.VIEW_SOURCE_ATTEMPT]: "View Source",
  [VIOLATION_TYPES.PAGE_LEAVE_ATTEMPT]: "Page Leave Attempt",
  [VIOLATION_TYPES.ESCAPE_KEY]: "ESC Key",
  [VIOLATION_TYPES.F11_KEY]: "F11 Key",
  [VIOLATION_TYPES.PAGE_REFRESH_ATTEMPT]: "Page Refresh",
  [VIOLATION_TYPES.NEW_TAB_ATTEMPT]: "New Tab",
  [VIOLATION_TYPES.SCREENSHOT_ATTEMPT]: "Screenshot",
};

export function formatViolationType(type) {
  return VIOLATION_TYPE_LABELS[type] || type;
}

export function formatTimeSpent(seconds) {
  if (!seconds || seconds < 1) return "0s";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export function escapeCsv(value) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }
  return stringValue;
}

export function calculatePassStatus(score, maximum) {
  if (maximum === 0) return { passed: false, percentage: 0 };

  const percentage = Math.round((score / maximum) * 100);
  const passed = percentage >= SCORE_THRESHOLDS.PASS_PERCENTAGE;

  return { passed, percentage };
}