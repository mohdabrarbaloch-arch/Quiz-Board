import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Select } from "antd";
import { useMemo } from "react";
import { SCORE_RANGES, SCORE_THRESHOLDS } from "../../lib/constants.js";
import { calculateObjectiveScore, formatDate } from "../../lib/quiz";
import StatCard from "../ui/StatCard";

export default function ClassProgress({
  submissions = [],
  questions = [],
  answerKeys = [],
  quizzes = [],
  selectedQuizId = "",
  onSelectQuiz,
}) {
  const selectedQuiz = useMemo(
    () => quizzes.find((q) => q.id === selectedQuizId),
    [quizzes, selectedQuizId]
  );

  const studentScores = useMemo(() => {
    const completed = submissions.filter((s) => s.status !== "started");

    if (completed.length === 0) return [];

    return completed
      .map((s) => {
        const answers = Array.isArray(s.answers)
          ? s.answers
          : Object.values(s.answers || {});

        const result = calculateObjectiveScore(
          { ...s, answers },
          questions,
          answerKeys
        );
        const pct =
          result.maximum > 0
            ? Math.round((result.score / result.maximum) * 100)
            : 0;
        return {
          id: s.id,
          studentName: s.studentName,
          rollNo: s.rollNo || s.rollNoKey,
          score: result.score,
          maximum: result.maximum,
          percentage: pct,
          passed: pct >= SCORE_THRESHOLDS.PASS_PERCENTAGE,
          correct: result.correct,
          wrong: result.wrong,
          unanswered: result.unanswered,
          submittedAt: s.submittedAt || s.startedAt,
        };
      })
      .sort(
        (a, b) =>
          b.percentage - a.percentage ||
          (a.studentName || "").localeCompare(b.studentName || "")
      );
  }, [submissions, questions, answerKeys]);

  const stats = useMemo(() => {
    if (!studentScores.length) return null;
    const percentages = studentScores.map((s) => s.percentage);
    const avgPct = Math.round(
      percentages.reduce((a, b) => a + b, 0) / percentages.length
    );
    const passedCount = studentScores.filter((s) => s.passed).length;
    return {
      totalStudents: studentScores.length,
      avgScore: avgPct,
      passRate: Math.round((passedCount / studentScores.length) * 100),
      passedCount,
      failedCount: studentScores.length - passedCount,
      highest: Math.max(...percentages),
      lowest: Math.min(...percentages),
    };
  }, [studentScores]);

  const distribution = useMemo(() => {
    if (!stats) return [];
    const maxCount = Math.max(
      ...SCORE_RANGES.map(
        (r) =>
          studentScores.filter(
            (s) => s.percentage >= r.min && s.percentage <= r.max
          ).length
      ),
      1
    );
    return SCORE_RANGES.map((r) => {
      const count = studentScores.filter(
        (s) => s.percentage >= r.min && s.percentage <= r.max
      ).length;
      return {
        ...r,
        count,
        pctOfTotal: Math.round((count / stats.totalStudents) * 100),
        barWidth: Math.round((count / maxCount) * 100),
      };
    });
  }, [studentScores, stats]);

  function getRankBadge(index) {
    const RANK_STYLES = {
      0: "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-300",
      1: "bg-gray-100 text-gray-600 ring-2 ring-gray-300",
      2: "bg-orange-100 text-orange-700 ring-2 ring-orange-300",
    };
    return RANK_STYLES[index] || "bg-gray-50 text-gray-500";
  }

  const inProgressCount = submissions.filter(
    (s) => s.status === "started"
  ).length;

  return (
    <div>
      {/* ── Toolbar ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            placeholder="Select a quiz"
            value={selectedQuizId || undefined}
            onChange={onSelectQuiz}
            style={{ minWidth: 260 }}
            options={quizzes.map((q) => ({ label: q.title, value: q.id }))}
          />
          {selectedQuiz && (
            <span className="ml-auto text-xs text-gray-400">
              <span className="font-semibold">{selectedQuiz.title}</span>
              {" — "}
              {selectedQuiz.questionCount || 0} questions
            </span>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────── */}
      {!selectedQuizId ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <TrophyOutlined className="text-3xl text-gray-400" />
          </div>
          <p className="font-bold text-gray-800 text-lg">Class Progress</p>
          <p className="text-sm text-gray-500 mt-1">
            Select a quiz above to see how your students performed.
          </p>
        </div>
      ) : studentScores.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl py-20 text-center">
          <p className="font-semibold text-gray-600">
            No completed submissions yet for this quiz.
          </p>
          {inProgressCount > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              ({inProgressCount} submission
              {inProgressCount !== 1 ? "s" : ""} in progress)
            </p>
          )}
        </div>
      ) : (
        <>
          {/* ── Stats Row ───────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
            <StatCard
              label="Average Score"
              value={`${stats.avgScore}%`}
              sub={`${stats.totalStudents} student${stats.totalStudents !== 1 ? "s" : ""}`}
              valueClass="text-primary-600"
            />
            <StatCard
              label="Pass Rate"
              value={`${stats.passRate}%`}
              sub={`${stats.passedCount} passed`}
              valueClass="text-green-600"
            />
            <StatCard
              label="Highest"
              value={`${stats.highest}%`}
              valueClass="text-emerald-600"
            />
            <StatCard
              label="Lowest"
              value={`${stats.lowest}%`}
              valueClass={
                stats.lowest < 50 ? "text-red-500" : "text-gray-600"
              }
            />
            <StatCard
              label="Passed / Failed"
              value={`${stats.passedCount}/${stats.failedCount}`}
              valueClass="text-gray-900"
            />
          </div>

          {/* ── Score Distribution ──────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-5">
            <h3 className="text-base font-black text-gray-900 mb-1">
              Score Distribution
            </h3>
            <p className="text-xs text-gray-500 mb-5">
              How your students' scores are spread across ranges
            </p>
            <div className="space-y-4">
              {distribution.map((d) => (
                <div key={d.label}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-semibold text-gray-700">
                      {d.label}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {d.count} student{d.count !== 1 ? "s" : ""} ({d.pctOfTotal}
                      %)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className={`${d.color} h-full rounded-full transition-all duration-700 ease-out`}
                      style={{
                        width: `${Math.max(d.barWidth, d.count > 0 ? 4 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Ranking Table ───────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">
                  Student Ranking
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sorted by score — highest to lowest
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {studentScores.length} student
                {studentScores.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3.5 w-14">Rank</th>
                    <th className="px-6 py-3.5">Student</th>
                    <th className="px-6 py-3.5">Score</th>
                    <th className="px-6 py-3.5">%</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentScores.map((s, i) => (
                    <tr
                      key={s.id}
                      className={`transition-colors hover:bg-gray-50 ${
                        !s.passed ? "bg-red-50/40" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold ${getRankBadge(i)}`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 text-sm">
                          {s.studentName}
                        </p>
                        <p className="text-xs text-gray-500">{s.rollNo}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">
                          {s.score}
                          <span className="text-gray-400 font-medium">
                            /{s.maximum}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-extrabold text-sm ${
                            s.percentage >= 70
                              ? "text-green-600"
                              : s.percentage >= 50
                                ? "text-orange-500"
                                : "text-red-500"
                          }`}
                        >
                          {s.percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {s.passed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                            <CheckCircleOutlined /> Pass
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                            <CloseCircleOutlined /> Fail
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs text-gray-400">
                          {formatDate(s.submittedAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
