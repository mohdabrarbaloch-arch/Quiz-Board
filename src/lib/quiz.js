export function normaliseRollNo(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
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
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function calculateObjectiveScore(submission, questions, answerKeys) {
  const questionMap = new Map(questions.map((question) => [question.id, question]));
  const keyMap = new Map(answerKeys.map((key) => [key.id, key.correctAnswer]));

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  let score = 0;
  let maximum = 0;
  let manualMaximum = 0;

  const answers = submission.answers || [];
  
  for (const answer of answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) continue;

    const points = Number(question.points || 1);
    if (question.type === "short_text") {
      manualMaximum += points;
      continue;
    }

    maximum += points;
    const correctAnswer = keyMap.get(question.id);
    
    if (!answer.answer || answer.answer.trim() === "") {
      unanswered++;
    } else if (String(answer.answer).trim() === String(correctAnswer)) {
      correct++;
      score += points;
    } else {
      wrong++;
    }
  }

  return { score, maximum, manualMaximum, correct, wrong, unanswered };
}

export function formatViolationType(type) {
  const types = {
    tab_switch: "Tab Switch",
    window_blur: "Window Lost Focus",
    fullscreen_exit: "Exited Fullscreen",
    right_click: "Right Click",
    dev_tools_attempt: "Developer Tools",
    clipboard_attempt: "Copy/Paste",
    keyboard_press: "Keyboard Activity",
    copy_attempt: "Copy Attempt",
    cut_attempt: "Cut Attempt",
    paste_attempt: "Paste Attempt",
    view_source_attempt: "View Source",
    page_leave_attempt: "Page Leave Attempt",
  };
  return types[type] || type;
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
