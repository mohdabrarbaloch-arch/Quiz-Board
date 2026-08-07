import { WarningFilled } from "@ant-design/icons";
import { Modal } from "antd";
import { signInAnonymously } from "firebase/auth";
import { push, ref } from "firebase/database";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useFullscreen } from "../hooks/useFullscreen";
import { useQuestionTimer } from "../hooks/useQuestionTimer";
import { useQuizTimer } from "../hooks/useQuizTimer";
import { useViolationDetection } from "../hooks/useViolationDetection";
import { auth, db } from "../lib/firebase";
import { calculateObjectiveScore, formatTime, normaliseRollNo } from "../lib/quiz";
import { trackQuizStarted, trackQuizSubmitted, trackQuizTerminated, trackViolation } from "../lib/analytics";
import { fetchAnswerKeys, fetchQuizById, fetchQuizQuestions } from "../services/quizService";
import { createAttempt, recordViolation, submitAttempt } from "../services/submissionService";

export default function QuizAttempt() {
  const { quizId } = useParams();
  const location = useLocation();
  const identityKey = `quiz-identity:${quizId}`;
  const sessionKey = `quiz-session:${quizId}`;

  const savedIdentity = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem(identityKey) || "null"); }
    catch { return null; }
  }, [identityKey]);

  const studentName = location.state?.studentName || savedIdentity?.studentName || "";
  const rollNo = location.state?.rollNo || savedIdentity?.rollNo || "";
  const rollNoKey = normaliseRollNo(rollNo);

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [phase, setPhase] = useState("loading"); // loading|intro|active|submitted|terminated|error
  const [error, setError] = useState("");
  const [submissionId, setSubmissionId] = useState(null);
  const [violations, setViolations] = useState([]);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [scoreResult, setScoreResult] = useState(null); // { score, maximum, correct, wrong, pct, passed }
  const [frozen, setFrozen] = useState(false);
  const [visTick, setVisTick] = useState(0);

  const quizRef = useRef(null);
  const questionsRef = useRef([]);
  const answersRef = useRef([]);
  const violationsRef = useRef([]);
  const submissionIdRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const startTimeRef = useRef(0);
  const qStartTimeRef = useRef(0);

  useEffect(() => {
    if (studentName && rollNo)
      sessionStorage.setItem(identityKey, JSON.stringify({ studentName, rollNo }));
  }, [identityKey, rollNo, studentName]);

  /* ── Visibility tick (triggers re-render when tab shown/hidden) ── */
  useEffect(() => {
    const handleVis = () => setVisTick((t) => t + 1);
    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
  }, []);

  /* ── Submit ─────────────────────────────────────────────── */
  const doSubmit = useCallback(async (reason = "completed", status = "completed") => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const finalAnswers = answersRef.current;
    const answeredCount = finalAnswers.filter((a) => a.answer?.trim()).length;
    try {
      await submitAttempt(quizId, rollNoKey, {
        studentName, rollNo, answers: finalAnswers,
        answeredCount, unansweredCount: finalAnswers.length - answeredCount,
        violationCount: violationsRef.current.length,
        autoSubmitted: reason !== "student",
        submitReason: reason, status,
        terminationReason: status === "terminated" ? "Maximum violation limit reached" : null,
        startedAt: startTimeRef.current,
        totalTimeSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      });
      sessionStorage.removeItem(sessionKey);
      fullscreen.exit();

      // Fetch answer keys to compute score for result card
      try {
        const keys = await fetchAnswerKeys(quizId);
        const fakeSubmission = { answers: finalAnswers };
        const res = calculateObjectiveScore(fakeSubmission, questionsRef.current, keys);
        const pct = res.maximum > 0 ? Math.round((res.score / res.maximum) * 100) : 0;
        setScoreResult({ ...res, pct, passed: pct >= 70 });
      } catch {
        setScoreResult(null);
      }

      setPhase(status === "terminated" ? "terminated" : "submitted");
    } catch (e) {
      console.error(e);
      isSubmittingRef.current = false;
    }
  }, [quizId, rollNoKey, studentName, rollNo, sessionKey]);

  /* ── Quiz timer ─────────────────────────────────────────── */
  const quizTimer = useQuizTimer(
    (quiz?.durationMinutes || 45) * 60,
    () => doSubmit("time_ended"),
    phase === "active"
  );

  /* ── Question timeout ───────────────────────────────────── */
  const handleQuestionTimeout = useCallback(() => {
    if (phase !== "active") return;
    const timeSpent = Math.floor((Date.now() - qStartTimeRef.current) / 1000);
    answersRef.current[currentIndex] = { questionId: questionsRef.current[currentIndex]?.id, answer: "", timeSpent, timedOut: true };
    setAnswers([...answersRef.current]);
    setIsAnswered(true);
    const total = questionsRef.current.length;
    let nextIdx = -1;
    for (let i = 1; i < total; i++) {
      const candidate = (currentIndex + i) % total;
      const a = answersRef.current[candidate];
      if (!a?.answer?.trim() && !a?.timedOut) { nextIdx = candidate; break; }
    }
    if (nextIdx >= 0) {
      setTimeout(() => {
        setCurrentIndex(nextIdx);
        setIsAnswered(false);
        qStartTimeRef.current = Date.now();
        questionTimer.reset();
        questionTimer.start();
      }, 200);
    } else {
      doSubmit("time_ended");
    }
  }, [phase, currentIndex, doSubmit]);

  const questionTimer = useQuestionTimer(
    quiz?.questionTimeSeconds || 45,
    handleQuestionTimeout,
    phase === "active" && !isAnswered
  );

  /* ── Violation handler ──────────────────────────────────── */
  const handleViolation = useCallback(async (type, msg) => {
    if (phase !== "active" || isSubmittingRef.current) return;

    // Freeze screen when focus is lost (tab switch, window blur, new tab)
    if ((type === "tab_switch" || type === "window_blur" || type === "new_tab_attempt") && document.hidden) {
      setFrozen(true);
    }

    const v = {
      type, message: msg,
      questionIndex: currentIndex,
      questionId: questionsRef.current[currentIndex]?.id || null,
      currentQuestionTime: questionTimer.secondsLeft,
      violationCount: violationsRef.current.length + 1,
      timestamp: Date.now(),
    };
    violationsRef.current.push(v);
    setViolations([...violationsRef.current]);
    setWarningMsg(msg);
    setShowWarning(true);
    if (submissionIdRef.current) {
      try { await recordViolation(quizId, submissionIdRef.current, v); } catch { }
    }
    if (violationsRef.current.length >= (quizRef.current?.maxViolations || 3)) {
      setTimeout(() => doSubmit("violation_limit", "terminated"), 2000);
    }
  }, [phase, currentIndex, quizId, doSubmit, questionTimer.secondsLeft]);

  const fullscreen = useFullscreen(() => {
    if (phase === "active") handleViolation("fullscreen_exit", "You exited fullscreen mode.");
  });

  useViolationDetection(handleViolation, phase === "active");

  /* ── Recovery from page reload ─────────────────────────── */
  useEffect(() => {
    if (phase !== "recovering" || !quiz) return;
    quizTimer.start(startTimeRef.current);
    questionTimer.start();
    setPhase("active");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, quiz]);

  /* ── Load quiz ──────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      if (!studentName || !rollNoKey) { setError("Student details missing. Return to home."); setPhase("error"); return; }
      try {
        const quizData = await fetchQuizById(quizId);
        if (!quizData?.isPublished) throw new Error("This quiz is not available.");
        const questionItems = await fetchQuizQuestions(quizId);
        if (!questionItems.length) throw new Error("This quiz has no questions.");
        const saved = JSON.parse(sessionStorage.getItem(sessionKey) || "null");
        if (saved?.status === "active") {
          const qs = saved.questions || questionItems;
          questionsRef.current = qs; setQuestions(qs);
          answersRef.current = saved.answers || []; setAnswers(saved.answers || []);
          violationsRef.current = saved.violations || []; setViolations(saved.violations || []);
          submissionIdRef.current = saved.submissionId; setSubmissionId(saved.submissionId);
          setCurrentIndex(saved.currentIndex || 0);
          startTimeRef.current = saved.startTime || Date.now();
          qStartTimeRef.current = Date.now();
          setQuiz(quizData); quizRef.current = quizData;
          setPhase("recovering"); // trigger recovery via useEffect
        } else {
          questionsRef.current = questionItems; setQuestions(questionItems);
          setPhase("intro");
        }
        setQuiz(quizData); quizRef.current = quizData;
      } catch (e) { setError(e.message || "Could not load quiz."); setPhase("error"); }
    }
    load();
  }, [quizId, rollNoKey, sessionKey, studentName]);

  /* ── Begin quiz ─────────────────────────────────────────── */
  async function beginQuiz() {
    setError("");
    try { await signInAnonymously(auth); } catch { }
    const subId = push(ref(db, `submissions/${quizId}`)).key;
    submissionIdRef.current = subId; setSubmissionId(subId);
    startTimeRef.current = Date.now(); qStartTimeRef.current = Date.now();
    const initialAnswers = questions.map((q) => ({ questionId: q.id, answer: "", timeSpent: 0, timedOut: false }));
    answersRef.current = initialAnswers; setAnswers(initialAnswers);
    try {
      await createAttempt(quizId, rollNoKey, { studentName, rollNo, clientStartedAt: startTimeRef.current, questionCount: questions.length });
      sessionStorage.setItem(sessionKey, JSON.stringify({
        status: "active", currentIndex: 0, answers: initialAnswers,
        violations: [], questions, submissionId: subId, startTime: startTimeRef.current,
      }));
      await fullscreen.enter();
      setPhase("active");
      quizTimer.start(startTimeRef.current);
      questionTimer.start();
    } catch (e) {
      setError(e.message === "ATTEMPT_EXISTS" ? "This roll number has already attempted this quiz." : "Could not start quiz. Please try again.");
    }
  }

  /* ── Answer selection ───────────────────────────────────── */
  function selectAnswer(option) {
    if (isAnswered) return;
    const timeSpent = Math.floor((Date.now() - qStartTimeRef.current) / 1000);
    answersRef.current[currentIndex] = { questionId: questionsRef.current[currentIndex].id, answer: option, timeSpent, timedOut: false };
    setAnswers([...answersRef.current]);
    setIsAnswered(true);
    questionTimer.stop();
    setShowSaved(true);
    sessionStorage.setItem(sessionKey, JSON.stringify({
      status: "active", currentIndex, answers: answersRef.current,
      violations: violationsRef.current, questions: questionsRef.current,
      submissionId: submissionIdRef.current, startTime: startTimeRef.current,
    }));
    setTimeout(() => setShowSaved(false), 1200);
  }

  function goToQuestion(idx) {
    if (idx < 0 || idx >= questionsRef.current.length || idx === currentIndex) return;
    const hasAnswer = !!answersRef.current[idx]?.answer?.trim();
    setCurrentIndex(idx);
    setIsAnswered(hasAnswer);
    if (!hasAnswer) {
      qStartTimeRef.current = Date.now();
      questionTimer.reset();
      questionTimer.start();
    } else {
      questionTimer.stop();
    }
    sessionStorage.setItem(sessionKey, JSON.stringify({
      status: "active", currentIndex: idx, answers: answersRef.current,
      violations: violationsRef.current, questions: questionsRef.current,
      submissionId: submissionIdRef.current, startTime: startTimeRef.current,
    }));
  }

  function changeAnswer() {
    setIsAnswered(false);
    qStartTimeRef.current = Date.now();
    questionTimer.reset();
    questionTimer.start();
  }

  function confirmSubmit() {
    Modal.confirm({
      title: "Submit Quiz?",
      content: `You have answered ${answeredCount} out of ${questions.length} questions. Submit now?`,
      okText: "Submit Quiz",
      cancelText: "Keep Reviewing",
      onOk: () => doSubmit("student"),
    });
  }

  const currentQ = questions[currentIndex];
  const answeredCount = answers.filter((a) => a.answer?.trim()).length;
  const maxViolations = quiz?.maxViolations || 3;
  const qTimerPct = Math.round((questionTimer.secondsLeft / (quiz?.questionTimeSeconds || 45)) * 100);
  const qTimerDanger = questionTimer.secondsLeft <= 10;

  /* ── Loading ────────────────────────────────────────────── */
  if (phase === "loading" || phase === "recovering") return (
    <div className="min-h-screen flex items-center justify-center gap-3 bg-gray-50 text-gray-400">
      <span className="loader" /> <span className="text-sm font-medium">Loading quiz…</span>
    </div>
  );

  /* ── Error ──────────────────────────────────────────────── */
  if (phase === "error") return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-red-50 to-white">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-3xl text-red-500 mx-auto mb-4">!</div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Quiz Unavailable</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-all shadow cursor-pointer">
          ← Back to Home
        </Link>
      </div>
    </div>
  );

  /* ── Submitted / Terminated ─────────────────────────────── */
  if (phase === "submitted" || phase === "terminated") {
    const isTerminated = phase === "terminated";
    const passed = scoreResult?.passed ?? false;
    const pct = scoreResult?.pct ?? 0;

    const displayName = studentName
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

    // All colors as plain hex — no oklab, no tailwind inside the card
    const SMIT_BLUE  = "#1565C0";
    const SMIT_GREEN = "#43A047";
    const themeColor = isTerminated ? "#64748b" : passed ? SMIT_GREEN : "#dc2626";
    const headerBg   = isTerminated
      ? "linear-gradient(160deg,#334155,#1e293b)"
      : passed
      ? "linear-gradient(160deg,#1565C0,#0d47a1)"
      : "linear-gradient(160deg,#c62828,#7f1d1d)";

    // Simplified inline SMIT logo — cleaner, more professional
    const SmitLogo = () => (
      <svg width="100" height="38" viewBox="0 0 240 90" xmlns="http://www.w3.org/2000/svg">
        {/* Graduation cap */}
        <polygon points="48,15 68,24 48,33 28,24" fill="#1565C0"/>
        <rect x="62" y="24" width="3" height="12" fill="#1565C0"/>
        <circle cx="63.5" cy="37" r="4" fill="#1565C0"/>
        {/* Green swoosh */}
        <path d="M26,30 Q32,12 48,22" stroke="#43A047" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        {/* S M I T letters */}
        <text x="15" y="70" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="45" fill="#1565C0">SMIT</text>
        {/* Green accent on i */}
        <circle cx="118" cy="30" r="5" fill="#43A047"/>
      </svg>
    );

    return (
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, background:"#f1f5f9" }}>

        {/* outer wrapper */}
        <div style={{ width:"100%", maxWidth:600, position:"relative" }}>

          {/* ══ RESULT CARD — simple white card only ══ */}
          <div style={{ borderRadius:16, overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.1)", fontFamily:"Arial,sans-serif", background:"#ffffff", border:"1px solid #e2e8f0" }}>

            {/* Body */}
            <div style={{ padding:"28px 32px" }}>

              {/* SMIT Logo at top */}
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <SmitLogo />
                <h2 style={{ fontSize:13, fontWeight:700, color:"#1565C0", margin:"10px 0 0", letterSpacing:"0.12em", textTransform:"uppercase" }}>
                  Saylani Mass IT Training
                </h2>
              </div>

              {/* Pass/Fail Status */}
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <div style={{ display:"inline-block", background:themeColor, color:"#ffffff", fontSize:24, fontWeight:900, padding:"8px 32px", borderRadius:6, letterSpacing:"0.08em" }}>
                  {isTerminated ? "VOID" : passed ? "PASS" : "FAIL"}
                </div>
                <p style={{ fontSize:12, color:"#64748b", margin:"8px 0 0", fontWeight:500 }}>
                  {isTerminated ? "Quiz terminated due to violations"
                    : passed ? "Congratulations! You have successfully passed"
                    : "Better luck next time"}
                </p>
              </div>

              {/* Student Details */}
              <div style={{ background:"#f8fafc", border:"2px solid #e2e8f0", borderRadius:10, padding:"14px 18px", marginBottom:20 }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ fontSize:11, color:"#64748b", fontWeight:600, padding:"4px 0", textTransform:"uppercase", letterSpacing:"0.05em" }}>Student Name</td>
                      <td style={{ fontSize:14, color:"#0f172a", fontWeight:700, textAlign:"right", padding:"4px 0" }}>{displayName}</td>
                    </tr>
                    <tr>
                      <td style={{ fontSize:11, color:"#64748b", fontWeight:600, padding:"4px 0", textTransform:"uppercase", letterSpacing:"0.05em" }}>Roll Number</td>
                      <td style={{ fontSize:14, color:"#0f172a", fontWeight:700, textAlign:"right", padding:"4px 0" }}>{rollNo.toUpperCase()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {scoreResult ? (
                <>
                  {/* Score Percentage - Compact */}
                  <div style={{ textAlign:"center", marginBottom:18 }}>
                    <div style={{ fontSize:48, fontWeight:900, color:themeColor, lineHeight:1, marginBottom:4 }}>
                      {pct}%
                    </div>
                    <div style={{ fontSize:11, color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                      Total Score
                    </div>
                  </div>

                  {/* Score Details Table - Compact */}
                  <div style={{ marginBottom:18 }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", border:"2px solid #e2e8f0", borderRadius:10, overflow:"hidden" }}>
                      <tbody>
                        <tr style={{ background:"#f8fafc" }}>
                          <td style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", padding:"10px 16px", borderBottom:"1px solid #e2e8f0", letterSpacing:"0.05em" }}>Total Score</td>
                          <td style={{ fontSize:16, color:"#0f172a", fontWeight:900, textAlign:"right", padding:"10px 16px", borderBottom:"1px solid #e2e8f0" }}>{scoreResult.score} / {scoreResult.maximum}</td>
                        </tr>
                        <tr style={{ background:"#ffffff" }}>
                          <td style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", padding:"10px 16px", borderBottom:"1px solid #e2e8f0", letterSpacing:"0.05em" }}>Correct Answers</td>
                          <td style={{ fontSize:16, color:SMIT_GREEN, fontWeight:900, textAlign:"right", padding:"10px 16px", borderBottom:"1px solid #e2e8f0" }}>{scoreResult.correct}</td>
                        </tr>
                        <tr style={{ background:"#f8fafc" }}>
                          <td style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", padding:"10px 16px", borderBottom:"1px solid #e2e8f0", letterSpacing:"0.05em" }}>Wrong Answers</td>
                          <td style={{ fontSize:16, color:"#dc2626", fontWeight:900, textAlign:"right", padding:"10px 16px", borderBottom:"1px solid #e2e8f0" }}>{scoreResult.wrong}</td>
                        </tr>
                        <tr style={{ background:"#ffffff" }}>
                          <td style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", padding:"10px 16px", letterSpacing:"0.05em" }}>Passing Marks</td>
                          <td style={{ fontSize:16, color:"#0f172a", fontWeight:900, textAlign:"right", padding:"10px 16px" }}>70%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Pass/Fail Result - Removed */}
                </>
              ) : (
                <div style={{ marginBottom:18 }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", border:"2px solid #e2e8f0", borderRadius:10, overflow:"hidden" }}>
                    <tbody>
                      <tr style={{ background:"#f8fafc" }}>
                        <td style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", padding:"10px 16px", borderBottom:"1px solid #e2e8f0", letterSpacing:"0.05em" }}>Answered</td>
                        <td style={{ fontSize:16, color:"#0f172a", fontWeight:900, textAlign:"right", padding:"10px 16px", borderBottom:"1px solid #e2e8f0" }}>{answers.filter((a) => a.answer?.trim()).length}</td>
                      </tr>
                      <tr style={{ background:"#ffffff" }}>
                        <td style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", padding:"10px 16px", letterSpacing:"0.05em" }}>Total Questions</td>
                        <td style={{ fontSize:16, color:"#0f172a", fontWeight:900, textAlign:"right", padding:"10px 16px" }}>{questions.length}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          {/* ══ END CARD ════════════════════════════════════ */}

          {/* Back to Home button - centered */}
          <div style={{ display:"flex", justifyContent:"center", marginTop:24 }}>
            <Link
              to="/"
              style={{ 
                width:"100%",
                maxWidth:300,
                display:"flex", 
                alignItems:"center", 
                justifyContent:"center", 
                padding:"16px 0", 
                background:SMIT_BLUE, 
                color:"#fff", 
                fontWeight:700, 
                fontSize:15, 
                borderRadius:12, 
                textDecoration:"none",
                boxShadow:"0 4px 12px rgba(21,101,192,0.25)",
                transition:"all 0.2s"
              }}
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Intro ──────────────────────────────────────────────── */
  if (phase === "intro") return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary-50 via-white to-blue-50">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-primary-700 to-primary-600 px-8 py-6">
            <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">Ready to begin</p>
            <h1 className="text-white font-black text-2xl">{quiz?.title}</h1>
            {quiz?.description && <p className="text-white/90 text-sm mt-1">{quiz.description}</p>}
          </div>

          <div className="px-8 py-6">
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Questions", value: questions.length },
                { label: "Minutes", value: quiz?.durationMinutes },
                { label: "Max Violations", value: maxViolations },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-center">
                  <p className="text-2xl font-black text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
              <p className="text-xs font-black text-amber-800 uppercase tracking-wide mb-2">Important Rules</p>
              <ul className="space-y-1.5">
                {[
                  `Each question has ${quiz?.questionTimeSeconds || 45} seconds`,
                  "You cannot go back to previous questions",
                  "Do not switch tabs or leave fullscreen mode",
                  `Quiz auto-closes after ${maxViolations} violations`,
                  "Each roll number can only attempt once",
                ].map((rule) => (
                  <li key={rule} className="flex items-start gap-2 text-xs text-amber-800">
                    <span className="text-amber-500 mt-0.5">•</span> {rule}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 mb-5">
              <div>
                <p className="text-xs font-semibold text-gray-500">Student</p>
                <p className="font-black text-gray-900">{studentName}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-500">Roll Number</p>
                <p className="font-black text-gray-900">{rollNo}</p>
              </div>
            </div>

            {error && <p className="text-red-600 text-sm font-semibold mb-3 text-center">{error}</p>}

            <button onClick={beginQuiz}
              className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all cursor-pointer">
              Begin Quiz →
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              Clicking Begin will open the quiz in fullscreen. Do not press ESC or switch tabs during the quiz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Active Quiz ────────────────────────────────────────── */
  return (
      <main className="min-h-screen bg-gray-900 text-white flex flex-col no-select relative overflow-hidden">
        {/* Watermark */}
        <div aria-hidden className="fixed inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-[0.03] text-white font-black" style={{ fontSize: "clamp(40px,8vw,100px)", transform: "rotate(-25deg)", whiteSpace: "nowrap" }}>
          {studentName} • {rollNo}
        </div>

        {/* Answer saved toast */}
        {showSaved && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2">
            ✓ Answer saved — moving to next question…
          </div>
        )}

        {/* Violation modal */}
      <Modal
        open={showWarning}
        onCancel={() => setShowWarning(false)}
        footer={
          <button
            onClick={() => setShowWarning(false)}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all"
          >
            I understand — go back to quiz
          </button>
        }
        title={
          <span className="flex items-center gap-2 text-red-600 font-black text-base">
            <WarningFilled /> ⚠ Violation {violations.length} of {maxViolations}
          </span>
        }
        centered
      >
        <div className="py-2">
          <p className="text-gray-800 font-semibold mb-3">{warningMsg}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 mb-3">
            <strong>Why did this happen?</strong> Pressing certain keys (like ESC, F11, Ctrl+C) or switching tabs is
            not allowed during the quiz. Please stay on this page and do not press any keyboard shortcuts.
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            {Array.from({ length: maxViolations }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-2.5 rounded-full transition-all ${
                  i < violations.length ? "bg-red-500" : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {maxViolations - violations.length > 0
              ? `${maxViolations - violations.length} warning${maxViolations - violations.length !== 1 ? "s" : ""} remaining before quiz is closed`
              : ""}
          </p>
          {violations.length >= maxViolations && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-semibold text-center">
              You have reached the maximum violations. Your quiz is being submitted now.
            </div>
          )}
        </div>
      </Modal>

      {/* Top bar */}
      <header className="relative z-10 bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between gap-4">
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{studentName} · {rollNo}</p>
          <p className="text-white font-black text-base leading-tight">{quiz?.title}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Violations badge */}
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
            violations.length > 0
              ? "bg-red-500/20 border-red-500/40 text-red-300"
              : "bg-green-500/10 border-green-500/20 text-green-400"
          }`}>
            <WarningFilled />
            {violations.length === 0
              ? "No violations"
              : `${violations.length}/${maxViolations} violations`}
          </div>
          {/* Quiz timer */}
          <div className={`px-4 py-2 rounded-xl text-center min-w-[90px] border ${
            quizTimer.secondsLeft <= 60
              ? "bg-red-500/20 border-red-500/40"
              : "bg-gray-800 border-gray-700"
          }`}>
            <p className="text-xs font-bold uppercase text-gray-400 leading-none mb-0.5">Time Left</p>
            <p className={`font-black text-xl tabular-nums leading-none ${quizTimer.secondsLeft <= 60 ? "text-red-400" : "text-white"}`}>
              {formatTime(quizTimer.secondsLeft)}
            </p>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="relative z-10 bg-gray-800 h-1">
        <div className="bg-primary-500 h-1 transition-all duration-500" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
      </div>

      {/* Main Content Layout Grid */}
      <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8 items-start overflow-y-auto">
        
        {/* Left Column: Question Area */}
        <div className="flex-1 w-full flex flex-col justify-start">
          {currentQ && (
            <div className="w-full">
              {/* Question header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm font-semibold">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                {/* Per-question circular timer */}
                <div className="relative w-14 h-14">
                  {isAnswered ? (
                    <div className="w-14 h-14 rounded-full bg-green-500/20 border-[4px] border-green-500 flex items-center justify-center">
                      <span className="text-green-400 text-xl font-black">✓</span>
                    </div>
                  ) : (
                    <>
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="24" fill="none" stroke="#374151" strokeWidth="4" />
                        <circle cx="28" cy="28" r="24" fill="none"
                          stroke={qTimerDanger ? "#ef4444" : "#2563eb"}
                          strokeWidth="4"
                          strokeDasharray={`${2 * Math.PI * 24}`}
                          strokeDashoffset={`${2 * Math.PI * 24 * (1 - qTimerPct / 100)}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <span className={`absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums ${qTimerDanger ? "text-red-400" : "text-white"}`}>
                        {questionTimer.secondsLeft}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Question card */}
              <div className="bg-gray-800 rounded-3xl border border-gray-700 p-8 shadow-2xl mb-5">
                <h2 className="text-white font-black text-2xl leading-tight mb-4">
                  {currentQ.prompt}
                </h2>
                {currentQ.code && (
                  <pre className="bg-gray-900/90 text-emerald-400 border border-gray-700/80 rounded-2xl p-4 font-mono text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap mb-6 select-text">
                    <code>{currentQ.code}</code>
                  </pre>
                )}

                <div className="grid gap-3">
                  {(currentQ.options || []).map((opt, i) => {
                    const selected = answers[currentIndex]?.answer === opt;
                    return (
                      <button key={i} onClick={() => !isAnswered && selectAnswer(opt)} disabled={isAnswered} type="button"
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all duration-200
                          ${selected
                            ? "border-primary-500 bg-primary-500/20 text-white shadow-lg shadow-primary-500/10"
                            : isAnswered
                            ? "border-gray-700 bg-gray-700/30 text-gray-500 cursor-not-allowed"
                            : "border-gray-700 bg-gray-700/50 text-gray-200 hover:border-primary-500/50 hover:bg-primary-500/10 cursor-pointer"
                          }`}
                      >
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0
                          ${selected ? "bg-primary-500 text-white" : "bg-gray-600 text-gray-300"}`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="font-semibold text-base">{opt}</span>
                        {selected && <span className="ml-auto text-primary-400 text-xl">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-3 mt-1">
                <button type="button" onClick={() => goToQuestion(currentIndex - 1)}
                  disabled={currentIndex === 0}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all
                    ${currentIndex === 0
                      ? "bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700"
                      : "bg-gray-700 text-gray-200 hover:bg-gray-600 cursor-pointer border border-gray-600"}`}>
                  ← Prev
                </button>

                <div className="flex items-center gap-2">
                  {isAnswered && (
                    <button type="button" onClick={changeAnswer}
                      className="px-4 py-3 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold text-sm hover:bg-amber-500/25 transition-all cursor-pointer">
                      ✏️ Change
                    </button>
                  )}

                  {currentIndex < questions.length - 1 ? (
                    <button type="button" onClick={() => goToQuestion(currentIndex + 1)}
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 transition-all cursor-pointer shadow-lg shadow-primary-500/20">
                      {isAnswered ? "Next →" : "Skip →"}
                    </button>
                  ) : (
                    <button type="button" onClick={confirmSubmit}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-all cursor-pointer shadow-lg shadow-green-500/20">
                      Submit Quiz ✓
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Question Navigator */}
        <div className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-4">
          <div className="bg-gray-800 rounded-3xl border border-gray-700 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-black text-white uppercase tracking-wide">Question Navigator</span>
            </div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700/60">
              <span className="text-xs font-semibold text-gray-500">{answeredCount}/{questions.length} answered</span>
              <button type="button" onClick={confirmSubmit}
                className="px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all cursor-pointer border-0 shadow-md">
                Submit Quiz
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2 max-h-[460px] overflow-y-auto pr-1">
              {questions.map((_, i) => {
                const ans = answers[i];
                const isDone = ans?.answer?.trim();
                const isCurrent = i === currentIndex;
                const isTimeout = ans?.timedOut && !isDone;
                return (
                  <button key={i} type="button"
                    onClick={() => goToQuestion(i)}
                    className={`aspect-square w-full rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border-0 flex items-center justify-center
                      ${isCurrent
                        ? "bg-primary-500 text-white shadow-lg shadow-primary-500/40 scale-105"
                        : isDone
                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        : isTimeout
                        ? "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                        : "bg-gray-700/60 text-gray-400 hover:bg-gray-600 hover:text-gray-200"
                      }`}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* ══ Freeze overlay ═════════════════════════════════ */}
      {frozen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/95 backdrop-blur-md">
          <div className="text-center px-6 max-w-sm">
            {document.hidden ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-5 text-4xl">
                  ⏸️
                </div>
                <h2 className="text-white font-black text-2xl mb-2">Quiz Paused</h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  You switched away from the quiz window.{" "}
                  <strong className="text-amber-400">Return to this tab</strong> to resume.
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Waiting for you to return…
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-primary-500/20 flex items-center justify-center mx-auto mb-5 text-4xl">
                  🔒
                </div>
                <h2 className="text-white font-black text-2xl mb-2">You Left the Quiz</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  Switching tabs or windows is not allowed. This has been recorded as a violation.
                </p>
                <button
                  onClick={() => { setFrozen(false); }}
                  className="px-10 py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-bold text-base rounded-2xl shadow-xl hover:shadow-2xl transition-all"
                >
                  Click to Resume Quiz →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
