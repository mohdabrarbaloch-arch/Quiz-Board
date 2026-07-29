import { logAnalyticsEvent } from "./firebase";

/**
 * Analytics helper functions for tracking user actions
 */

// Student Events
export const trackQuizStarted = (quizId, quizTitle, studentName, rollNo) => {
  logAnalyticsEvent("quiz_started", {
    quiz_id: quizId,
    quiz_title: quizTitle,
    student_name: studentName,
    roll_no: rollNo,
  });
};

export const trackQuizSubmitted = (quizId, quizTitle, studentName, rollNo, score, percentage, passed) => {
  logAnalyticsEvent("quiz_submitted", {
    quiz_id: quizId,
    quiz_title: quizTitle,
    student_name: studentName,
    roll_no: rollNo,
    score: score,
    percentage: percentage,
    passed: passed ? "yes" : "no",
  });
};

export const trackQuizTerminated = (quizId, reason, violationCount) => {
  logAnalyticsEvent("quiz_terminated", {
    quiz_id: quizId,
    reason: reason,
    violation_count: violationCount,
  });
};

export const trackViolation = (quizId, violationType, questionIndex) => {
  logAnalyticsEvent("quiz_violation", {
    quiz_id: quizId,
    violation_type: violationType,
    question_index: questionIndex,
  });
};

export const trackResultViewed = (rollNo, score, percentage, passed) => {
  logAnalyticsEvent("result_viewed", {
    roll_no: rollNo,
    score: score,
    percentage: percentage,
    passed: passed ? "yes" : "no",
  });
};

// Admin Events
export const trackAdminLogin = () => {
  logAnalyticsEvent("admin_login");
};

export const trackQuizCreated = (quizId, quizTitle, questionCount) => {
  logAnalyticsEvent("quiz_created", {
    quiz_id: quizId,
    quiz_title: quizTitle,
    question_count: questionCount,
  });
};

export const trackQuizPublished = (quizId, quizTitle) => {
  logAnalyticsEvent("quiz_published", {
    quiz_id: quizId,
    quiz_title: quizTitle,
  });
};

export const trackQuizDeleted = (quizId) => {
  logAnalyticsEvent("quiz_deleted", {
    quiz_id: quizId,
  });
};

export const trackSubmissionViewed = (quizId, submissionId) => {
  logAnalyticsEvent("submission_viewed", {
    quiz_id: quizId,
    submission_id: submissionId,
  });
};

export const trackAttemptReset = (quizId, rollNo) => {
  logAnalyticsEvent("attempt_reset", {
    quiz_id: quizId,
    roll_no: rollNo,
  });
};

// Page View Tracking
export const trackPageView = (pageName) => {
  logAnalyticsEvent("page_view", {
    page_name: pageName,
  });
};
