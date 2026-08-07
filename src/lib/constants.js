export const FIREBASE_REFS = {
  QUIZZES: "quizzes",
  QUESTIONS: "quizQuestions",
  ANSWER_KEYS: "answerKeys",
  ATTEMPTS: "attempts",
  SUBMISSIONS: "submissions",
  VIOLATIONS: "violations",
  ADMINS: "admins",
  FEEDBACK: "feedback",
};

export const QUIZ_SETTINGS = {
  DEFAULT_DURATION_MINUTES: 45,
  DEFAULT_QUESTION_TIME_SECONDS: 45,
  DEFAULT_MAX_VIOLATIONS: 3,
  MIN_QUESTION_TIME: 10,
  MAX_QUESTION_TIME: 300,
  MIN_DURATION: 1,
  MAX_DURATION: 300,
};

export const QUIZ_STATUS = {
  LOADING: "loading",
  INTRO: "intro",
  ACTIVE: "active",
  RECOVERING: "recovering",
  SUBMITTED: "submitted",
  TERMINATED: "terminated",
  ERROR: "error",
};

export const SUBMISSION_STATUS = {
  STARTED: "started",
  COMPLETED: "completed",
  TERMINATED: "terminated",
};

export const QUESTION_TYPES = {
  MCQ: "mcq",
  TRUE_FALSE: "true_false",
  SHORT_TEXT: "short_text",
};

export const VIOLATION_TYPES = {
  TAB_SWITCH: "tab_switch",
  WINDOW_BLUR: "window_blur",
  FULLSCREEN_EXIT: "fullscreen_exit",
  RIGHT_CLICK: "right_click",
  DEV_TOOLS_ATTEMPT: "dev_tools_attempt",
  CLIPBOARD_ATTEMPT: "clipboard_attempt",
  KEYBOARD_PRESS: "keyboard_press",
  COPY_ATTEMPT: "copy_attempt",
  CUT_ATTEMPT: "cut_attempt",
  PASTE_ATTEMPT: "paste_attempt",
  VIEW_SOURCE_ATTEMPT: "view_source_attempt",
  PAGE_LEAVE_ATTEMPT: "page_leave_attempt",
  ESCAPE_KEY: "escape_key",
  F11_KEY: "f11_key",
  PAGE_REFRESH_ATTEMPT: "page_refresh_attempt",
  NEW_TAB_ATTEMPT: "new_tab_attempt",
  SCREENSHOT_ATTEMPT: "screenshot_attempt",
};

export const SCORE_THRESHOLDS = {
  PASS_PERCENTAGE: 70,
};

export const FEEDBACK_CATEGORIES = {
  EDUCATION: "education",
  TEACHER: "teacher",
  GENERAL: "general",
};

export const AUTH_STATUS = {
  LOADING: "loading",
  ALLOWED: "allowed",
  DENIED: "denied",
};

export const ADMIN_NAV_ITEMS = [
  { key: "quizzes", label: "Quizzes" },
  { key: "create", label: "Create Quiz" },
  { key: "progress", label: "Progress" },
  { key: "submissions", label: "Submissions" },
  { key: "feedbacks", label: "Feedbacks" },
];

export const SCORE_RANGES = [
  { label: "0–49%", min: 0, max: 49, color: "bg-red-500" },
  { label: "50–69%", min: 50, max: 69, color: "bg-orange-400" },
  { label: "70–89%", min: 70, max: 89, color: "bg-green-500" },
  { label: "90–100%", min: 90, max: 100, color: "bg-emerald-500" },
];

export const ALLOWED_KEYS_IN_QUIZ = [
  'Backspace',
  'Delete',
  'Tab',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'Enter',
];

export const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export const MOBILE_BREAKPOINT = 768;
export const TABLET_BREAKPOINT = 1024;
