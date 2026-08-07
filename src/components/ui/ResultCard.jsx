import SmitLogo from "../layout/SmitLogo";

export default function ResultCard({ submission, quiz, scoreResult, answers = [], questions = [] }) {
  if (!submission) return null;

  const isTerminated = submission.status === "terminated";
  const scoreData = scoreResult;
  const passed = scoreData?.passed ?? false;
  const pct = scoreData?.pct ?? 0;

  const studentName = submission.studentName || "";
  const rollNo = submission.rollNo || submission.rollNoKey || "";

  const displayName = studentName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

  const SMIT_BLUE = "#1565C0";
  const SMIT_GREEN = "#43A047";
  const themeColor = isTerminated ? "#64748b" : passed ? SMIT_GREEN : "#dc2626";

  const totalAnswered = answers.length > 0
    ? answers.filter((a) => a.answer?.trim()).length
    : (submission.answeredCount ?? 0);

  const totalQuestions = questions.length > 0
    ? questions.length
    : (submission.questionCount ?? 0);

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", fontFamily: "Arial,sans-serif", background: "#ffffff", border: "1px solid #e2e8f0" }}>
      <div style={{ padding: "28px 32px" }}>
        {/* SMIT Logo */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <SmitLogo className="mx-auto block" />
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#1565C0", margin: "10px 0 0", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Saylani Mass IT Training
          </h2>
        </div>

        {/* Pass/Fail Status */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ display: "inline-block", background: themeColor, color: "#ffffff", fontSize: 24, fontWeight: 900, padding: "8px 32px", borderRadius: 6, letterSpacing: "0.08em" }}>
            {isTerminated ? "VOID" : passed ? "PASS" : "FAIL"}
          </div>
          <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 0", fontWeight: 500 }}>
            {isTerminated ? "Quiz terminated due to violations"
              : passed ? "Congratulations! You have successfully passed"
              : "Better luck next time"}
          </p>
        </div>

        {/* Student Details */}
        <div style={{ background: "#f8fafc", border: "2px solid #e2e8f0", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ fontSize: 11, color: "#64748b", fontWeight: 600, padding: "4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Student Name</td>
                <td style={{ fontSize: 14, color: "#0f172a", fontWeight: 700, textAlign: "right", padding: "4px 0" }}>{displayName}</td>
              </tr>
              <tr>
                <td style={{ fontSize: 11, color: "#64748b", fontWeight: 600, padding: "4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Roll Number</td>
                <td style={{ fontSize: 14, color: "#0f172a", fontWeight: 700, textAlign: "right", padding: "4px 0" }}>{rollNo.toUpperCase()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {scoreData ? (
          <>
            {/* Score Percentage */}
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 48, fontWeight: 900, color: themeColor, lineHeight: 1, marginBottom: 4 }}>
                {pct}%
              </div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Total Score
              </div>
            </div>

            {/* Score Details Table */}
            <div style={{ marginBottom: 18 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                <tbody>
                  <tr style={{ background: "#f8fafc" }}>
                    <td style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", padding: "10px 16px", borderBottom: "1px solid #e2e8f0", letterSpacing: "0.05em" }}>Total Score</td>
                    <td style={{ fontSize: 16, color: "#0f172a", fontWeight: 900, textAlign: "right", padding: "10px 16px", borderBottom: "1px solid #e2e8f0" }}>{scoreData.score} / {scoreData.maximum}</td>
                  </tr>
                  <tr style={{ background: "#ffffff" }}>
                    <td style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", padding: "10px 16px", borderBottom: "1px solid #e2e8f0", letterSpacing: "0.05em" }}>Correct Answers</td>
                    <td style={{ fontSize: 16, color: SMIT_GREEN, fontWeight: 900, textAlign: "right", padding: "10px 16px", borderBottom: "1px solid #e2e8f0" }}>{scoreData.correct}</td>
                  </tr>
                  <tr style={{ background: "#f8fafc" }}>
                    <td style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", padding: "10px 16px", borderBottom: "1px solid #e2e8f0", letterSpacing: "0.05em" }}>Wrong Answers</td>
                    <td style={{ fontSize: 16, color: "#dc2626", fontWeight: 900, textAlign: "right", padding: "10px 16px", borderBottom: "1px solid #e2e8f0" }}>{scoreData.wrong}</td>
                  </tr>
                  <tr style={{ background: "#ffffff" }}>
                    <td style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", padding: "10px 16px", letterSpacing: "0.05em" }}>Passing Marks</td>
                    <td style={{ fontSize: 16, color: "#0f172a", fontWeight: 900, textAlign: "right", padding: "10px 16px" }}>70%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ background: "#fef2f2", border: "2px solid #fca5a5", borderRadius: 10, padding: "20px", textAlign: "center", marginBottom: 18 }}>
            <p style={{ fontSize: 14, color: "#991b1b", fontWeight: 600, margin: 0 }}>
              ⚠️ Score data is not available
            </p>
            <p style={{ fontSize: 12, color: "#dc2626", margin: "8px 0 0" }}>
              {answers && answers.length > 0
                ? "Quiz questions or answer keys are missing from the system."
                : "This submission has no recorded answers."}
            </p>
            {totalAnswered !== undefined && (
              <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 0" }}>
                Questions answered: {totalAnswered} / {totalQuestions}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}