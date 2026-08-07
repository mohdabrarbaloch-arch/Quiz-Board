import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  ReloadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { Popconfirm, Tag, message } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  calculateObjectiveScore,
  formatDate,
  formatTime,
  formatViolationType,
} from "../lib/quiz";
import { fetchAnswerKeys, fetchQuizQuestions } from "../services/quizService";
import { fetchSubmissions, fetchViolations, resetSubmission } from "../services/submissionService";

export default function SubmissionDetail() {
  const { quizId, submissionId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answerKeys, setAnswerKeys] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [allSubs, qs, keys] = await Promise.all([
          fetchSubmissions(quizId),
          fetchQuizQuestions(quizId),
          fetchAnswerKeys(quizId),
        ]);
        const sub = allSubs.find((s) => s.id === submissionId);
        if (!sub) throw new Error("Submission not found.");
        const viols = await fetchViolations(quizId, submissionId);
        setSubmission(sub);
        setQuestions(qs);
        setAnswerKeys(keys);
        setViolations(viols);
      } catch (e) {
        setError(e.message || "Could not load submission.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [quizId, submissionId]);

  /* ── Reset / delete the attempt so student can retry ─────── */
  async function handleReset() {
    setResetting(true);
    try {
      await resetSubmission(quizId, submissionId, submission.rollNoKey);
      message.success(`Attempt reset — ${submission.studentName} can now retry the quiz.`);
      navigate("/admin", { state: { tab: "submissions" } });
    } catch {
      message.error("Could not reset the attempt. Please try again.");
      setResetting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center gap-3 bg-gray-50 text-gray-400">
      <span className="loader" />
      <span className="text-sm font-medium">Loading submission…</span>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="text-center">
        <p className="text-red-500 font-semibold mb-4">{error}</p>
        <Link to="/admin" className="text-primary-600 hover:underline font-semibold">
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );

  const result = calculateObjectiveScore(submission, questions, answerKeys);
  const answerMap = new Map((submission.answers || []).map((a) => [a.questionId, a]));
  const keyMap = new Map(answerKeys.map((k) => [k.id, k.correctAnswer]));
  const isTerminated = submission.status === "terminated";
  const scorePct = result.maximum > 0 ? Math.round((result.score / result.maximum) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            to="/admin"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-all"
          >
            <ArrowLeftOutlined /> Back
          </Link>
          <div className="h-5 w-px bg-gray-200" />
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Submission Review</p>
            <h1 className="text-base font-black text-gray-900 leading-tight">{submission.studentName}</h1>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Status badge only in header */}
            {isTerminated ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                <CloseCircleOutlined /> Terminated
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                <CheckCircleOutlined /> Completed
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── Terminated warning banner ─────────────────────── */}
        {isTerminated && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <WarningOutlined className="text-red-500 text-lg mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-black text-red-700">Quiz Terminated</p>
                <p className="text-sm text-red-600 mt-0.5">
                  {submission.terminationReason || "Maximum violation limit was reached."}
                  {" "}You can reset this attempt so the student can try again.
                </p>
              </div>
            </div>
            <Popconfirm
              title="Reset this attempt?"
              description={
                <p className="text-sm text-gray-600 max-w-xs mt-1">
                  All data for this submission will be deleted.{" "}
                  <strong>{submission.studentName}</strong> will be allowed to attempt the quiz again.
                </p>
              }
              onConfirm={handleReset}
              okText="Yes, reset attempt"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              placement="bottomRight"
            >
              <button
                disabled={resetting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all flex-shrink-0 disabled:opacity-50"
              >
                {resetting
                  ? <><ReloadOutlined className="animate-spin" /> Resetting…</>
                  : <><DeleteOutlined /> Reset &amp; Allow Retry</>
                }
              </button>
            </Popconfirm>
          </div>
        )}

        {/* ── Student info + score hero ─────────────────────── */}
        <div className={`rounded-2xl overflow-hidden shadow-sm border ${isTerminated ? "border-red-200" : "border-primary-200"}`}>
          <div className={`px-8 py-6 ${isTerminated ? "bg-gradient-to-r from-red-600 to-red-700" : "bg-gradient-to-r from-primary-600 to-primary-700"}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">{submission.studentName}</h2>
                <p className="text-white/80 text-sm mt-1">
                  Roll No: <strong className="text-white">{submission.rollNo}</strong>
                  &nbsp;·&nbsp;
                  Submitted: {formatDate(submission.submittedAt || submission.startedAt)}
                </p>
                {submission.autoSubmitted && (
                  <span className="inline-flex items-center gap-1 mt-2 bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    Auto submitted — {submission.submitReason === "time_ended" ? "Time ran out" : "Violation limit reached"}
                  </span>
                )}
              </div>
              {/* Score */}
              <div className="text-center bg-white/15 border border-white/20 rounded-2xl px-6 py-4 flex-shrink-0">
                <p className="text-white/70 text-xs font-bold uppercase tracking-wide mb-1">Score</p>
                <p className="text-3xl font-black text-white">{result.score}<span className="text-white/60 text-lg">/{result.maximum}</span></p>
                <p className="text-white/80 text-sm font-semibold">{scorePct}%</p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="bg-white grid grid-cols-2 sm:grid-cols-5 divide-x divide-gray-100">
            {[
              { label: "Correct", value: result.correct, cls: "text-green-600" },
              { label: "Wrong", value: result.wrong, cls: "text-red-500" },
              { label: "Unanswered", value: result.unanswered, cls: "text-gray-400" },
              { label: "Violations", value: submission.violationCount || 0, cls: submission.violationCount > 0 ? "text-orange-500" : "text-gray-400" },
              { label: "Time Spent", value: submission.totalTimeSeconds ? formatTime(submission.totalTimeSeconds) : "—", cls: "text-gray-700" },
            ].map((s) => (
              <div key={s.label} className="px-5 py-4 text-center">
                <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Two-column layout ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Answer breakdown (left/main) ───────────────── */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-base font-black text-gray-900">Answer Breakdown</h2>

            {questions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-400">
                No questions found for this quiz.
              </div>
            ) : questions.map((question, idx) => {
              const studentAns = answerMap.get(question.id);
              const correct = keyMap.get(question.id);
              const isManual = question.type === "short_text";
              const isCorrect = !isManual && studentAns?.answer?.trim() === correct;
              const timedOut = studentAns?.timedOut;
              const noAnswer = !studentAns?.answer?.trim();

              let borderCls = "border-gray-200 bg-white";
              if (!isManual) {
                if (isCorrect) borderCls = "border-green-200 bg-green-50";
                else if (noAnswer || timedOut) borderCls = "border-gray-200 bg-gray-50";
                else borderCls = "border-red-200 bg-red-50";
              }

              return (
                <div key={question.id} className={`rounded-2xl border px-5 py-4 ${borderCls}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">
                        <span className="text-gray-400 mr-1">Q{idx + 1}.</span>
                        {question.prompt}
                      </p>
                      {question.code && (
                        <pre className="mt-2 bg-gray-900 text-emerald-400 border border-gray-800 rounded-xl p-3 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap select-text">
                          <code>{question.code}</code>
                        </pre>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {timedOut && <Tag color="orange" className="!text-xs !m-0">Timed out</Tag>}
                      {isManual ? (
                        <Tag className="!text-xs !m-0">Manual grade</Tag>
                      ) : isCorrect ? (
                        <Tag color="success" className="!text-xs !m-0">✓ +{question.points} pts</Tag>
                      ) : noAnswer ? (
                        <Tag className="!text-xs !m-0">No answer</Tag>
                      ) : (
                        <Tag color="error" className="!text-xs !m-0">✗ Wrong</Tag>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs mt-1">
                    <div>
                      <span className="font-semibold text-gray-400 uppercase tracking-wide">Student: </span>
                      <span className={noAnswer ? "text-gray-400 italic" : isCorrect ? "text-green-700 font-semibold" : "text-red-600 font-semibold"}>
                        {studentAns?.answer || "No answer given"}
                      </span>
                    </div>
                    {!isManual && correct && (
                      <div>
                        <span className="font-semibold text-gray-400 uppercase tracking-wide">Correct: </span>
                        <span className="text-green-700 font-semibold">{correct}</span>
                      </div>
                    )}
                    {studentAns?.timeSpent > 0 && (
                      <div className="ml-auto">
                        <ClockCircleOutlined className="mr-1 text-gray-300" />
                        <span className="text-gray-400">{studentAns.timeSpent}s</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Violation log (right sidebar) ──────────────── */}
          <div className="space-y-3">
            <h2 className="text-base font-black text-gray-900">
              Violation Log
              {violations.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-600 text-xs font-black px-2 py-0.5 rounded-full">
                  {violations.length}
                </span>
              )}
            </h2>

            {violations.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                <CheckCircleOutlined className="text-3xl text-green-400 mb-2 block" />
                <p className="text-sm font-semibold text-gray-600">No violations</p>
                <p className="text-xs text-gray-400 mt-1">This student had a clean attempt.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {violations.map((v, i) => (
                  <div key={v.id} className="bg-white rounded-2xl border border-orange-200 px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-orange-600">#{i + 1} — {formatViolationType(v.type)}</span>
                      <span className="text-xs text-gray-400">Q{(v.questionIndex || 0) + 1}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{v.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(v.clientTimestamp)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
